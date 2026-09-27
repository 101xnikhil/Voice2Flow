import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../../lib/jwt.js';
import { logActivity } from '../../lib/activity.js';
import { AppError } from '../../lib/errors.js';
import { RegisterInput, LoginInput, REFRESH_TOKEN_EXPIRY_DAYS } from '@voice2flow/shared';
import { logger } from '../../lib/logger.js';

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
  };
  settings: {
    id: string;
    userId: string;
    theme: string;
    sttLocale: string;
    autoExecute: boolean;
    autoExecuteThreshold: number;
    autoExecuteWorkflows: boolean;
    showConfidence: boolean;
    defaultReminderOffsetMin: number;
    weekStartsOn: number;
    notifyBrowser: boolean;
    notifyEmail: boolean;
    createdAt: string;
    updatedAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  static async register(
    input: RegisterInput,
    clientInfo?: { userAgent?: string; ip?: string }
  ): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw AppError.conflict('An account with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          timezone: input.timezone || 'Asia/Kolkata',
          settings: {
            create: {
              theme: 'system',
              sttLocale: 'en-IN',
              autoExecute: true,
              autoExecuteThreshold: 0.85,
              autoExecuteWorkflows: false,
              showConfidence: true,
              defaultReminderOffsetMin: 60,
              weekStartsOn: 1,
              notifyBrowser: false,
              notifyEmail: false,
            },
          },
        },
        include: {
          settings: true,
        },
      });

      const rawRefreshToken = generateRefreshToken();
      const tokenHash = hashToken(rawRefreshToken);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          userAgent: clientInfo?.userAgent,
          ip: clientInfo?.ip,
          lastUsedAt: new Date(),
        },
      });

      await logActivity(
        {
          userId: user.id,
          action: 'AUTH_REGISTER',
          entityType: 'User',
          entityId: user.id,
          ip: clientInfo?.ip,
        },
        tx
      );

      const accessToken = generateAccessToken({ userId: user.id, email: user.email });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          timezone: user.timezone,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        settings: {
          id: user.settings!.id,
          userId: user.settings!.userId,
          theme: user.settings!.theme,
          sttLocale: user.settings!.sttLocale,
          autoExecute: user.settings!.autoExecute,
          autoExecuteThreshold: user.settings!.autoExecuteThreshold,
          autoExecuteWorkflows: user.settings!.autoExecuteWorkflows,
          showConfidence: user.settings!.showConfidence,
          defaultReminderOffsetMin: user.settings!.defaultReminderOffsetMin,
          weekStartsOn: user.settings!.weekStartsOn,
          notifyBrowser: user.settings!.notifyBrowser,
          notifyEmail: user.settings!.notifyEmail,
          createdAt: user.settings!.createdAt.toISOString(),
          updatedAt: user.settings!.updatedAt.toISOString(),
        },
        accessToken,
        refreshToken: rawRefreshToken,
      };
    });
  }

  static async login(
    input: LoginInput,
    clientInfo?: { userAgent?: string; ip?: string }
  ): Promise<AuthResult> {
    const user = await prisma.user.findFirst({
      where: {
        email: input.email,
      },
      include: {
        settings: true,
      },
    });

    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isMatch = await verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    return prisma.$transaction(async (tx) => {
      // Ensure settings exist if missing
      let settings = user.settings;
      if (!settings) {
        settings = await tx.userSettings.create({
          data: {
            userId: user.id,
          },
        });
      }

      const rawRefreshToken = generateRefreshToken();
      const tokenHash = hashToken(rawRefreshToken);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          userAgent: clientInfo?.userAgent,
          ip: clientInfo?.ip,
          lastUsedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await logActivity(
        {
          userId: user.id,
          action: 'AUTH_LOGIN',
          entityType: 'User',
          entityId: user.id,
          ip: clientInfo?.ip,
        },
        tx
      );

      const accessToken = generateAccessToken({ userId: user.id, email: user.email });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          timezone: user.timezone,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        settings: {
          id: settings.id,
          userId: settings.userId,
          theme: settings.theme,
          sttLocale: settings.sttLocale,
          autoExecute: settings.autoExecute,
          autoExecuteThreshold: settings.autoExecuteThreshold,
          autoExecuteWorkflows: settings.autoExecuteWorkflows,
          showConfidence: settings.showConfidence,
          defaultReminderOffsetMin: settings.defaultReminderOffsetMin,
          weekStartsOn: settings.weekStartsOn,
          notifyBrowser: settings.notifyBrowser,
          notifyEmail: settings.notifyEmail,
          createdAt: settings.createdAt.toISOString(),
          updatedAt: settings.updatedAt.toISOString(),
        },
        accessToken,
        refreshToken: rawRefreshToken,
      };
    });
  }

  static async refresh(
    rawRefreshToken: string,
    clientInfo?: { userAgent?: string; ip?: string }
  ): Promise<AuthResult> {
    if (!rawRefreshToken) {
      throw AppError.unauthorized('Refresh token is required');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!existingToken) {
      throw AppError.unauthorized('Invalid refresh token');
    }

    // Reuse detection: If token is already revoked, an attacker or compromise may have occurred!
    if (existingToken.revokedAt !== null) {
      logger.error(
        { userId: existingToken.userId, tokenId: existingToken.id },
        'SECURITY ALERT: Refresh token reuse detected! Revoking all sessions.'
      );

      // Revoke all tokens for this user
      await prisma.refreshToken.updateMany({
        where: { userId: existingToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await logActivity({
        userId: existingToken.userId,
        action: 'AUTH_REUSE_DETECTED',
        entityType: 'RefreshToken',
        entityId: existingToken.id,
        ip: clientInfo?.ip,
      });

      throw AppError.unauthorized('Token reuse detected. All sessions revoked for security.');
    }

    // Check expiration
    if (existingToken.expiresAt < new Date()) {
      await prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { revokedAt: new Date() },
      });
      throw AppError.unauthorized('Refresh token has expired');
    }

    const user = existingToken.user;
    if (!user) {
      throw AppError.unauthorized('User account not found');
    }

    return prisma.$transaction(async (tx) => {
      // Rotation: generate new refresh token
      const newRawToken = generateRefreshToken();
      const newTokenHash = hashToken(newRawToken);
      const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      const createdToken = await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt,
          userAgent: clientInfo?.userAgent,
          ip: clientInfo?.ip,
          lastUsedAt: new Date(),
        },
      });

      // Mark old token revoked and link to replacement
      await tx.refreshToken.update({
        where: { id: existingToken.id },
        data: {
          revokedAt: new Date(),
          replacedById: createdToken.id,
          lastUsedAt: new Date(),
        },
      });

      let settings = user.settings;
      if (!settings) {
        settings = await tx.userSettings.create({
          data: {
            userId: user.id,
          },
        });
      }

      const accessToken = generateAccessToken({ userId: user.id, email: user.email });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          timezone: user.timezone,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        settings: {
          id: settings.id,
          userId: settings.userId,
          theme: settings.theme,
          sttLocale: settings.sttLocale,
          autoExecute: settings.autoExecute,
          autoExecuteThreshold: settings.autoExecuteThreshold,
          autoExecuteWorkflows: settings.autoExecuteWorkflows,
          showConfidence: settings.showConfidence,
          defaultReminderOffsetMin: settings.defaultReminderOffsetMin,
          weekStartsOn: settings.weekStartsOn,
          notifyBrowser: settings.notifyBrowser,
          notifyEmail: settings.notifyEmail,
          createdAt: settings.createdAt.toISOString(),
          updatedAt: settings.updatedAt.toISOString(),
        },
        accessToken,
        refreshToken: newRawToken,
      };
    });
  }

  static async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    try {
      const tokenHash = hashToken(rawRefreshToken);
      const token = await prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (token && token.revokedAt === null) {
        await prisma.refreshToken.update({
          where: { id: token.id },
          data: { revokedAt: new Date() },
        });

        await logActivity({
          userId: token.userId,
          action: 'AUTH_LOGOUT',
          entityType: 'RefreshToken',
          entityId: token.id,
        });
      }
    } catch (err) {
      logger.warn({ err }, 'Error during logout token revocation');
    }
  }

  static async me(userId: string): Promise<{
    user: AuthResult['user'];
    settings: AuthResult['settings'];
  }> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
      include: {
        settings: true,
      },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    let settings = user.settings;
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: user.id,
        },
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      settings: {
        id: settings.id,
        userId: settings.userId,
        theme: settings.theme,
        sttLocale: settings.sttLocale,
        autoExecute: settings.autoExecute,
        autoExecuteThreshold: settings.autoExecuteThreshold,
        autoExecuteWorkflows: settings.autoExecuteWorkflows,
        showConfidence: settings.showConfidence,
        defaultReminderOffsetMin: settings.defaultReminderOffsetMin,
        weekStartsOn: settings.weekStartsOn,
        notifyBrowser: settings.notifyBrowser,
        notifyEmail: settings.notifyEmail,
        createdAt: settings.createdAt.toISOString(),
        updatedAt: settings.updatedAt.toISOString(),
      },
    };
  }
}
