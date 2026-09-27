import { describe, it, expect } from 'vitest';
import {
  normalizeTaskQuery,
  resolveTaskFromList,
  resolveTask,
  TaskCandidate,
} from '../nlp/taskResolver.js';
import { prisma } from '../lib/prisma.js';

describe('TaskResolver Unit Tests', () => {
  describe('normalizeTaskQuery()', () => {
    it('1. strips English determiners/pronouns (the, my, a, an)', () => {
      expect(normalizeTaskQuery('my DBMS assignment')).toBe('dbms assignment');
      expect(normalizeTaskQuery('the React project')).toBe('react project');
      expect(normalizeTaskQuery('a meeting with boss')).toBe('meeting with boss');
    });

    it('2. strips Hinglish determiners/pronouns (mera, meri, ka, ko, mujhe)', () => {
      expect(normalizeTaskQuery('mera DBMS assignment')).toBe('dbms assignment');
      expect(normalizeTaskQuery('meri React class')).toBe('react class');
      expect(normalizeTaskQuery('mujhe assignment complete karna hai')).toBe(
        'assignment complete karna hai'
      );
    });

    it('3. PRESERVES key nouns like assignment, task, project, quiz, exam, notes', () => {
      const q = normalizeTaskQuery('my assignment');
      expect(q).toBe('assignment');
      expect(normalizeTaskQuery('the task')).toBe('task');
      expect(normalizeTaskQuery('my project notes')).toBe('project notes');
    });
  });

  describe('resolveTaskFromList() with Fuse.js', () => {
    const candidateTasks: TaskCandidate[] = [
      {
        id: 't-1',
        userId: 'u-1',
        title: 'DBMS Assignment',
        status: 'PENDING',
        category: 'ACADEMIC',
        priority: 'HIGH',
        dueAt: '2026-10-03T12:30:00.000Z',
      },
      {
        id: 't-2',
        userId: 'u-1',
        title: 'Operating Systems Assignment',
        status: 'PENDING',
        category: 'ACADEMIC',
        priority: 'MEDIUM',
        dueAt: '2026-10-04T12:30:00.000Z',
      },
      {
        id: 't-3',
        userId: 'u-1',
        title: 'Computer Networks Assignment',
        status: 'PENDING',
        category: 'ACADEMIC',
        priority: 'LOW',
        dueAt: '2026-10-05T12:30:00.000Z',
      },
      {
        id: 't-4',
        userId: 'u-1',
        title: 'Buy Groceries at Supermarket',
        status: 'PENDING',
        category: 'PERSONAL',
        priority: 'MEDIUM',
        dueAt: null,
      },
      {
        id: 't-5',
        userId: 'u-1',
        title: 'Submit Expense Report',
        status: 'COMPLETED',
        category: 'WORK',
        priority: 'HIGH',
        dueAt: null,
      },
    ];

    it('4. resolves single clear match: query "DBMS" matches "DBMS Assignment"', () => {
      const res = resolveTaskFromList('DBMS', candidateTasks);
      expect(res.status).toBe('SINGLE');
      expect(res.task?.id).toBe('t-1');
      expect(res.task?.title).toBe('DBMS Assignment');
    });

    it('5. resolves single exact match: query "Buy Groceries at Supermarket"', () => {
      const res = resolveTaskFromList('Buy Groceries at Supermarket', candidateTasks);
      expect(res.status).toBe('SINGLE');
      expect(res.task?.id).toBe('t-4');
      expect(res.isFuzzy).toBe(false);
    });

    it('6. detects ambiguity when multiple tasks match closely: query "assignment"', () => {
      const res = resolveTaskFromList('assignment', candidateTasks);
      expect(res.status).toBe('AMBIGUOUS');
      expect(res.candidates?.length).toBeGreaterThanOrEqual(3);
      const titles = res.candidates?.map((c) => c.title);
      expect(titles).toContain('DBMS Assignment');
      expect(titles).toContain('Operating Systems Assignment');
      expect(titles).toContain('Computer Networks Assignment');
    });

    it('7. returns NONE when no tasks match threshold: query "Quantum Physics Lab"', () => {
      const res = resolveTaskFromList('Quantum Physics Lab', candidateTasks);
      expect(res.status).toBe('NONE');
      expect(res.task).toBeUndefined();
    });

    it('8. tolerates typos with fuzzy match flag: query "groceris"', () => {
      const res = resolveTaskFromList('groceris', candidateTasks);
      expect(res.status).toBe('SINGLE');
      expect(res.task?.id).toBe('t-4');
      expect(res.isFuzzy).toBe(true);
    });

    it('9. tolerates typos with fuzzy match flag: query "DMS assignment"', () => {
      const res = resolveTaskFromList('DMS assignment', candidateTasks);
      expect(res.status).toBe('SINGLE');
      expect(res.task?.id).toBe('t-1');
      expect(res.isFuzzy).toBe(true);
    });
  });

  describe('Multi-Tenant Cross-User Isolation in Database resolveTask()', () => {
    it('10. guarantees User A queries never return User B tasks', async () => {
      // Create user A and user B with distinct private tasks
      const userA = await prisma.user.create({
        data: {
          email: `user_a_${Date.now()}@voice2flow.dev`,
          passwordHash: 'dummy_hash',
          name: 'User A',
          timezone: 'Asia/Kolkata',
        },
      });

      const userB = await prisma.user.create({
        data: {
          email: `user_b_${Date.now()}@voice2flow.dev`,
          passwordHash: 'dummy_hash',
          name: 'User B',
          timezone: 'Asia/Kolkata',
        },
      });

      // User A's private task
      await prisma.task.create({
        data: {
          userId: userA.id,
          title: 'User A Secret Project Alpha',
          category: 'ACADEMIC',
          priority: 'URGENT',
          status: 'PENDING',
        },
      });

      // User B's private task
      await prisma.task.create({
        data: {
          userId: userB.id,
          title: 'User B Completely Different Task',
          category: 'PERSONAL',
          priority: 'LOW',
          status: 'PENDING',
        },
      });

      // User A resolving "User A Secret Project Alpha" -> SINGLE (matches userA)
      const resA = await resolveTask(prisma, userA.id, 'User A Secret Project Alpha', 'COMPLETE_TASK');
      expect(resA.status).toBe('SINGLE');
      expect(resA.task?.title).toBe('User A Secret Project Alpha');

      // User B resolving "User A Secret Project Alpha" -> NONE (cannot see User A's task)
      const resB = await resolveTask(prisma, userB.id, 'User A Secret Project Alpha', 'COMPLETE_TASK');
      expect(resB.status).toBe('NONE');
      expect(resB.task).toBeUndefined();

      // Clean up test users
      await prisma.user.deleteMany({
        where: { id: { in: [userA.id, userB.id] } },
      });
    });
  });
});
