import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  const isSmart =
    env.AI_PROVIDER !== 'rules' &&
    ((env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) ||
      (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) ||
      (env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY));

  const aiLabel = isSmart
    ? `AI: ${env.AI_PROVIDER} (${env.AI_MODEL}) (Smart mode)`
    : `AI: ${env.AI_PROVIDER} (Basic mode)`;

  const schedulerLabel = `Scheduler: ${env.SCHEDULER_ENABLED ? 'on' : 'off'}`;

  logger.info(
    `🚀 Voice2Flow Server running on port ${env.PORT} [${env.NODE_ENV}] | ${aiLabel} | ${schedulerLabel}`
  );
  console.log(`[Voice2Flow] Server listening on http://localhost:${env.PORT}`);
  console.log(`[Voice2Flow] Active Mode -> ${aiLabel}, ${schedulerLabel}`);
});

async function handleShutdown(signal: string) {
  logger.info(`Received ${signal}, initiating graceful shutdown...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Database disconnected cleanly.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during database disconnection.');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
