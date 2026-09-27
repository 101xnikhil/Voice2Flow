import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { REFRESH_COOKIE_NAME } from '@voice2flow/shared';

describe('End-to-End API Integration Tests', () => {
  const app = createApp();
  const timestamp = Date.now();
  const user1Email = `user1_${timestamp}@example.com`;
  const user2Email = `user2_${timestamp}@example.com`;
  const password = 'Password123!';

  let user1Token: string;
  let user1RefreshTokenCookie: string;
  let user1Id: string;

  let user2Token: string;

  afterAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: { email: { in: [user1Email, user2Email] } },
    });
  });

  describe('Auth Lifecycle', () => {
    it('registers user1, returns 201, user, settings, and accessToken', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: user1Email,
        name: 'User One',
        password,
        timezone: 'Asia/Kolkata',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(user1Email);
      expect(res.body.data.settings.theme).toBe('system');
      expect(res.body.data.accessToken).toBeDefined();

      user1Token = res.body.data.accessToken;
      user1Id = res.body.data.user.id;

      // Check cookie
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c: string) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      user1RefreshTokenCookie = refreshCookie!.split(';')[0] || '';
    });

    it('logs in user1 with valid credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: user1Email,
        password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies.find((c: string) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      expect(refreshCookie).toBeDefined();
      user1RefreshTokenCookie = refreshCookie!.split(';')[0] || '';
    });

    it('refreshes the access token and rotates the refresh cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', user1RefreshTokenCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      user1Token = res.body.data.accessToken;

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const newRefreshCookie = cookies.find((c: string) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      expect(newRefreshCookie).toBeDefined();
      user1RefreshTokenCookie = newRefreshCookie!.split(';')[0] || '';
    });

    it('fetches authenticated user with GET /api/v1/users/me', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(user1Id);
      expect(res.body.data.user.email).toBe(user1Email);
      expect(res.body.data.settings.userId).toBe(user1Id);
    });
  });

  describe('Task CRUD Operations', () => {
    let taskId: string;

    it('creates a task for user1 with POST /api/v1/tasks', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Complete Phase 1 Implementation',
          description: 'Build backend and frontend according to spec',
          priority: 'HIGH',
          category: 'PROJECT',
          dueAt: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Complete Phase 1 Implementation');
      expect(res.body.data.priority).toBe('HIGH');
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.userId).toBe(user1Id);

      taskId = res.body.data.id;
    });

    it('retrieves the task with GET /api/v1/tasks/:id', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(taskId);
      expect(res.body.data.title).toBe('Complete Phase 1 Implementation');
    });

    it('updates the task with PATCH /api/v1/tasks/:id', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Updated Task Title',
          priority: 'URGENT',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Task Title');
      expect(res.body.data.priority).toBe('URGENT');
    });

    it('completes the task with POST /api/v1/tasks/:id/complete', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.completedAt).not.toBeNull();
    });

    it('reopens the task with POST /api/v1/tasks/:id/reopen', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${taskId}/reopen`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.completedAt).toBeNull();
    });

    it('soft deletes the task with DELETE /api/v1/tasks/:id', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deletedAt).not.toBeNull();

      // Ensure active listing does not show the deleted task
      const listRes = await request(app)
        .get('/api/v1/tasks?tab=active')
        .set('Authorization', `Bearer ${user1Token}`);
      const found = listRes.body.data.find((t: { id: string }) => t.id === taskId);
      expect(found).toBeUndefined();
    });

    it('restores the soft-deleted task with POST /api/v1/tasks/:id/restore', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${taskId}/restore`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deletedAt).toBeNull();
    });

    it('permanently deletes the task with DELETE /api/v1/tasks/:id/permanent', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/${taskId}/permanent`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's completely gone from database
      const checkRes = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(checkRes.status).toBe(404);
    });
  });

  describe('Cross-User Data Isolation (Returns 404)', () => {
    let user1PrivateTaskId: string;

    it('sets up User 2 and creates a private task for User 1', async () => {
      // Register User 2
      const regRes = await request(app).post('/api/v1/auth/register').send({
        email: user2Email,
        name: 'User Two',
        password,
      });
      expect(regRes.status).toBe(201);
      user2Token = regRes.body.data.accessToken;

      // User 1 creates a private task
      const taskRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Top Secret User 1 Task',
          priority: 'URGENT',
        });
      expect(taskRes.status).toBe(201);
      user1PrivateTaskId = taskRes.body.data.id;
    });

    it('User 2 receives 404 when attempting to GET User 1 task', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${user1PrivateTaskId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('User 2 receives 404 when attempting to PATCH User 1 task', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${user1PrivateTaskId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('User 2 receives 404 when attempting to complete User 1 task', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${user1PrivateTaskId}/complete`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('User 2 receives 404 when attempting to soft-delete User 1 task', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/${user1PrivateTaskId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('User 2 receives 404 when attempting to permanently delete User 1 task', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/${user1PrivateTaskId}/permanent`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('User 2 task list does not include User 1 task', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      const found = res.body.data.find((t: { id: string }) => t.id === user1PrivateTaskId);
      expect(found).toBeUndefined();
    });
  });
});
