import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment files
dotenv.config();
// Also attempt to load from root if running inside server directory
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const booleanCoerce = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    return val.toLowerCase() === 'true' || val === '1';
  });

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata'),
  AI_PROVIDER: z.enum(['gemini', 'openai', 'anthropic', 'rules']).default('rules'),
  AI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  AI_TIMEOUT_MS: z.coerce.number().default(8000),
  AI_DAILY_LIMIT_PER_USER: z.coerce.number().default(100),
  AI_RICH_RESPONSES: booleanCoerce.default(false),
  SCHEDULER_ENABLED: booleanCoerce.default(true),
  SCHEDULER_INTERVAL_MS: z.coerce.number().default(30000),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('Voice2Flow <no-reply@voice2flow.local>'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ FATAL: Environment variable validation failed:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
