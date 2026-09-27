import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { Category, Priority, TaskStatus } from '@prisma/client';

describe('Command Processor & Workflow Pipeline Integration Tests', () => {
  const app = createApp();
  const timestamp = Date.now();
  const user1Email = `cmd_user1_${timestamp}@example.com`;
  const user2Email = `cmd_user2_${timestamp}@example.com`;
  const password = 'Password123!';

  let user1Token: string;
  let user1Id: string;
  let user2Token: string;

  beforeAll(async () => {
    // Register User 1
    const res1 = await request(app).post('/api/v1/auth/register').send({
      email: user1Email,
      name: 'Command User 1',
      password,
      timezone: 'Asia/Kolkata',
    });
    user1Token = res1.body.data.accessToken;
    user1Id = res1.body.data.user.id;

    // Register User 2
    const res2 = await request(app).post('/api/v1/auth/register').send({
      email: user2Email,
      name: 'Command User 2',
      password,
      timezone: 'Asia/Kolkata',
    });
    user2Token = res2.body.data.accessToken;
  });


  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [user1Email, user2Email] } },
    });
  });

  describe('GATE Test: "No API Key" DBMS Command & 5+ Successful Steps', () => {
    it('creates DBMS assignment task with right priority, category, deadline, and records >= 5 steps', async () => {
      const commandText =
        'Create a high priority task to finish my DBMS assignment tomorrow at 6 PM';

      const res = await request(app)
        .post('/api/v1/commands')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          text: commandText,
          inputMode: 'TEXT',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('EXECUTED');
      expect(res.body.data.executionId).toBeDefined();

      const executionId = res.body.data.executionId;

      // Verify task in DB
      const createdTask = await prisma.task.findFirst({
        where: { userId: user1Id, title: 'Finish DBMS Assignment' },
      });
      expect(createdTask).toBeDefined();
      expect(createdTask?.priority).toBe(Priority.HIGH);
      expect(createdTask?.category).toBe(Category.ACADEMIC);
      expect(createdTask?.dueAt).toBeDefined();
      expect(createdTask?.source).toBe('TEXT');
      expect(createdTask?.originKey).toBe(`${executionId}:action`);

      // Verify execution steps via GET /executions/:id
      const execRes = await request(app)
        .get(`/api/v1/executions/${executionId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(execRes.status).toBe(200);
      expect(execRes.body.data.id).toBe(executionId);
      expect(execRes.body.data.status).toBe('SUCCEEDED');

      const steps = execRes.body.data.steps;
      expect(steps.length).toBeGreaterThanOrEqual(5);

      // Verify all steps succeeded
      for (const step of steps) {
        expect(step.status).toBe('SUCCESS');
      }

      // Check key step names
      const stepNames = steps.map((s: { name: string }) => s.name);
      expect(stepNames).toContain('Input received');
      expect(stepNames).toContain('Intent detected');
      expect(stepNames).toContain('Entities extracted');
      expect(stepNames).toContain('Validation passed');
      expect(stepNames).toContain('CREATE_TASK');
    });
  });

  describe('Single-Action Pipeline per Intent', () => {
    it('executes UPDATE_TASK / RESCHEDULE_TASK', async () => {
      // Create a task first
      const task = await prisma.task.create({
        data: {
          userId: user1Id,
          title: 'Algorithm Study',
          category: Category.ACADEMIC,
          priority: Priority.MEDIUM,
          source: 'TEXT',
        },
      });

      const res = await request(app)
        .post('/api/v1/commands')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          text: 'Reschedule Algorithm Study to Friday at 5 PM',
          inputMode: 'TEXT',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('EXECUTED');

      const updated = await prisma.task.findUnique({
        where: { id: task.id },
      });
      expect(updated?.dueAt).toBeDefined();
    });

    it('executes COMPLETE_TASK', async () => {
      const task = await prisma.task.create({
        data: {
          userId: user1Id,
          title: 'Physics Homework',
          status: TaskStatus.PENDING,
          source: 'TEXT',
        },
      });

      const res = await request(app)
        .post('/api/v1/commands')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          text: 'Complete Physics Homework',
          inputMode: 'TEXT',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('EXECUTED');

      const updated = await prisma.task.findUnique({
        where: { id: task.id },
      });
      expect(updated?.status).toBe(TaskStatus.COMPLETED);
      expect(updated?.completedAt).toBeDefined();
    });

    it('executes RESTORE_TASK', async () => {
      const task = await prisma.task.create({
        data: {
          userId: user1Id,
          title: 'Deleted Research Paper',
          deletedAt: new Date(),
          source: 'TEXT',
        },
      });

      const res = await request(app)
        .post('/api/v1/commands')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          text: 'Restore Deleted Research Paper',
          inputMode: 'TEXT',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('EXECUTED');

      const updated = await prisma.task.findUnique({
        where: { id: task.id },
      });
      expect(updated?.deletedAt).toBeNull();
    });

    it('executes QUERY_TASKS', async () => {
      const res = await request(app)
        .post('/api/v1/commands')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          text: 'Show my tasks',
          inputMode: 'TEXT',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('EXECUTED');
      expect(Array.isArray(res.body.data.result)).toBe(true);
    });
  });

  describe('Ambiguous Target Clarification Round-Trip', () => {
    it('prompts with options when multiple matches exist, then executes after resolution', async () => {
      // Clean up user1 tasks and create 3 assignments
      await prisma.task.deleteMany({ where: { userId: user1Id } });

      const t1 = await prisma.task.create({
        data: { userId: user1Id, title: 'DBMS Assignment 1', source: 'TEXT' },
      });
      const t2 = await prisma.task.create({
        data: { userId: user1Id, title: 'DBMS Assignment 2', source: 'TEXT' },
      });
      const t3 = await prisma.task.create({
        data: { userId: user1Id, title: 'DBMS Assignment 3', source: 'TEXT' },
      });

      // Command: "Complete my assignment"
      const res = await request(app)
        .post('/api/v1/commands')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          text: 'Complete my assignment',
          inputMode: 'TEXT',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('NEEDS_CLARIFICATION');
      expect(res.body.data.options).toBeDefined();
      expect(res.body.data.options.length).toBe(3);

      const executionId = res.body.data.executionId;

      // User selects option 2 (DBMS Assignment 2)
      const resolveRes = await request(app)
        .post(`/api/v1/commands/${executionId}/resolve`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          optionId: t2.id,
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.status).toBe('EXECUTED');

      // Verify only Assignment 2 is completed
      const checkT1 = await prisma.task.findUnique({ where: { id: t1.id } });
      const checkT2 = await prisma.task.findUnique({ where: { id: t2.id } });
      const checkT3 = await prisma.task.findUnique({ where: { id: t3.id } });

      expect(checkT1?.status).toBe(TaskStatus.PENDING);
      expect(checkT2?.status).toBe(TaskStatus.COMPLETED);
      expect(checkT3?.status).toBe(TaskStatus.PENDING);
    });
  });

  describe('Destructive Commands ALWAYS-Confirm & Real Counts', () => {
    it('requires confirmation with exact count for bulk delete, then executes on confirm', async () => {
      // Ensure User 1 has exactly 2 active tasks
      await prisma.task.deleteMany({ where: { userId: user1Id } });
      await prisma.task.create({ data: { userId: user1Id, title: 'Task A', source: 'TEXT' } });
      await prisma.task.create({ data: { userId: user1Id, title: 'Task B', source: 'TEXT' } });

      const res = await request(app)
        .post('/api/v1/commands')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          text: 'Delete all my tasks',
          inputMode: 'TEXT',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('NEEDS_CONFIRMATION');
      expect(res.body.data.preview.action).toBe('DELETE_TASK');
      expect(res.body.data.preview.count).toBe(2);

      const executionId = res.body.data.executionId;

      // Confirm
      const confirmRes = await request(app)
        .post(`/api/v1/commands/${executionId}/confirm`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.status).toBe('EXECUTED');

      // Verify tasks are soft deleted
      const activeCount = await prisma.task.count({
        where: { userId: user1Id, deletedAt: null },
      });
      expect(activeCount).toBe(0);
    });
  });

  describe('Stale Preview 409 Conflict Detection', () => {
    it('returns 409 Conflict if task count changes between preview and confirmation', async () => {
      await prisma.task.deleteMany({ where: { userId: user1Id } });
      await prisma.task.create({ data: { userId: user1Id, title: 'Task 1', source: 'TEXT' } });

      // Request delete all tasks (preview shows 1 task)
      const res = await request(app)
        .post('/api/v1/commands')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          text: 'Delete all my tasks',
          inputMode: 'TEXT',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.preview.count).toBe(1);
      const executionId = res.body.data.executionId;

      // Concurrently create another task
      await prisma.task.create({ data: { userId: user1Id, title: 'Task 2', source: 'TEXT' } });

      // Attempt to confirm old preview
      const staleRes = await request(app)
        .post(`/api/v1/commands/${executionId}/confirm`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(staleRes.status).toBe(409);
      expect(staleRes.body.error.code).toBe('STALE_PREVIEW');
      expect(staleRes.body.error.details.freshCount).toBe(2);

      // Now confirming updated preview succeeds
      const retryRes = await request(app)
        .post(`/api/v1/commands/${executionId}/confirm`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.data.status).toBe('EXECUTED');
    });
  });

  describe('Cross-User Data Isolation', () => {
    it('prevents user2 from seeing or confirming user1 executions', async () => {
      // User 1 runs command
      const res1 = await request(app)
        .post('/api/v1/commands')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          text: 'Show my tasks',
          inputMode: 'TEXT',
        });

      const user1ExecId = res1.body.data.executionId;

      // User 2 attempts to fetch User 1's execution
      const getRes = await request(app)
        .get(`/api/v1/executions/${user1ExecId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(getRes.status).toBe(404);

      // User 2 attempts to cancel User 1's execution
      const cancelRes = await request(app)
        .post(`/api/v1/commands/${user1ExecId}/cancel`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(cancelRes.status).toBe(404);
    });

    it('isolates task search between users', async () => {
      // User 1 has a unique secret task
      await prisma.task.create({
        data: {
          userId: user1Id,
          title: 'User 1 Confidential Project',
          source: 'TEXT',
        },
      });

      // User 2 attempts to complete it
      const res = await request(app)
        .post('/api/v1/commands')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          text: 'Complete Confidential Project',
          inputMode: 'TEXT',
        });

      expect(res.body.data.status).toBe('FAILED');
      expect(res.body.data.error.code).toBe('TASK_NOT_FOUND');
    });
  });
});
