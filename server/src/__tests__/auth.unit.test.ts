import { describe, it, expect, afterAll } from 'vitest';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { AuthService } from '../modules/auth/service.js';
import { prisma } from '../lib/prisma.js';

describe('Auth Unit Tests', () => {
  const testEmail = `unit_test_${Date.now()}@example.com`;
  let userId: string;

  afterAll(async () => {
    // Cleanup
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  describe('Password Hashing', () => {
    it('hashes passwords using bcryptjs with cost 12', async () => {
      const password = 'StrongPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.startsWith('$2a$12$') || hash.startsWith('$2b$12$')).toBe(true);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword123!', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Refresh Token Rotation & Reuse Detection', () => {
    it('rotates refresh tokens and detects token reuse to revoke all sessions', async () => {
      // 1. Register user
      const registerRes = await AuthService.register({
        email: testEmail,
        name: 'Reuse Test User',
        password: 'Password123!',
        timezone: 'Asia/Kolkata',
      });
      userId = registerRes.user.id;

      // 2. Perform initial login to obtain token pair
      const loginRes = await AuthService.login(
        { email: testEmail, password: 'Password123!' },
        { userAgent: 'test-agent-1', ip: '127.0.0.1' }
      );
      const originalRefreshToken = loginRes.refreshToken;

      // Verify active refresh token in database
      const initialTokens = await prisma.refreshToken.findMany({
        where: { userId, revokedAt: null },
      });
      expect(initialTokens.length).toBeGreaterThanOrEqual(1);

      // 3. Normal rotation: use refresh token to get a new pair
      const rotateRes = await AuthService.refresh(
        originalRefreshToken,
        { userAgent: 'test-agent-2', ip: '127.0.0.1' }
      );
      expect(rotateRes.accessToken).toBeDefined();
      expect(rotateRes.refreshToken).toBeDefined();
      expect(rotateRes.refreshToken).not.toBe(originalRefreshToken);

      // Verify the old token is marked as revoked/replaced
      const originalInDb = await prisma.refreshToken.findFirst({
        where: { userId, revokedAt: { not: null } },
      });
      expect(originalInDb).toBeDefined();

      // 4. Attack / Reuse simulation: reuse the already rotated originalRefreshToken!
      await expect(
        AuthService.refresh(originalRefreshToken, {
          userAgent: 'attacker-agent',
          ip: '192.168.1.1',
        })
      ).rejects.toThrow('Token reuse detected');

      // 5. Verify that ALL refresh tokens for this user have been revoked due to reuse detection
      const activeTokensAfterReuse = await prisma.refreshToken.findMany({
        where: { userId, revokedAt: null },
      });
      expect(activeTokensAfterReuse.length).toBe(0);
    });
  });
});
