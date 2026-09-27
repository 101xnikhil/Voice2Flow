import { z } from 'zod';
import { PASSWORD_REGEX, PASSWORD_POLICY_MESSAGE } from '../constants.js';

export const RegisterInputSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255).toLowerCase(),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(PASSWORD_REGEX, PASSWORD_POLICY_MESSAGE),
  timezone: z.string().optional().default('Asia/Kolkata'),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const ChangePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'New password is too long')
    .regex(PASSWORD_REGEX, PASSWORD_POLICY_MESSAGE),
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;

export const DeleteAccountInputSchema = z.object({
  password: z.string().min(1, 'Password is required to confirm account deletion'),
});

export type DeleteAccountInput = z.infer<typeof DeleteAccountInputSchema>;
