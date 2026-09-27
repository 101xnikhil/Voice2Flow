import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { logActivity } from '../../lib/activity.js';
import { AppError } from '../../lib/errors.js';
import {
  UpdateUserInput,
  UpdateUserSettingsInput,
  ChangePasswordInput,
  DeleteAccountInput,
  UserDTO,
  UserSettingsDTO,
  SessionDTO,
} from '@voice2flow/shared';

export class UserService {
  static async getMe(userId: string): Promise<{ user: UserDTO; settings: UserSettingsDTO }> {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      include: { settings: true },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    let settings = user.settings;
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId: user.id },
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

  static async updateMe(userId: string, input: UpdateUserInput): Promise<UserDTO> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
      },
    });

    await logActivity({
      userId,
      action: 'USER_PROFILE_UPDATED',
      entityType: 'User',
      entityId: userId,
      after: { name: user.name, timezone: user.timezone },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  static async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const isMatch = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw AppError.badRequest('Current password does not match');
    }

    const newHash = await hashPassword(input.newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke other refresh tokens on password change for security
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await logActivity({
      userId,
      action: 'USER_PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
    });
  }

  static async getSettings(userId: string): Promise<UserSettingsDTO> {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId },
      });
    }

    return {
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
    };
  }

  static async updateSettings(
    userId: string,
    input: UpdateUserSettingsInput
  ): Promise<UserSettingsDTO> {
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...input,
      },
      update: input,
    });

    await logActivity({
      userId,
      action: 'USER_SETTINGS_UPDATED',
      entityType: 'UserSettings',
      entityId: settings.id,
      after: input,
    });

    return {
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
    };
  }

  static async getSessions(
    userId: string,
    currentRawTokenHash?: string
  ): Promise<SessionDTO[]> {
    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ip: true,
        lastUsedAt: true,
        createdAt: true,
        tokenHash: true,
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      lastUsedAt: s.lastUsedAt?.toISOString() || null,
      createdAt: s.createdAt.toISOString(),
      isCurrent: currentRawTokenHash ? s.tokenHash === currentRawTokenHash : false,
    }));
  }

  static async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw AppError.notFound('Session not found');
    }

    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    await logActivity({
      userId,
      action: 'USER_SESSION_REVOKED',
      entityType: 'RefreshToken',
      entityId: sessionId,
    });
  }

  static async deleteAccount(userId: string, input: DeleteAccountInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const isMatch = await verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw AppError.badRequest('Password does not match');
    }

    await prisma.$transaction(async (tx) => {
      // Soft-delete user
      await tx.user.delete({
        where: { id: userId },
      });

      await logActivity(
        {
          userId,
          action: 'USER_ACCOUNT_DELETED',
          entityType: 'User',
          entityId: userId,
        },
        tx
      );
    });
  }
}
