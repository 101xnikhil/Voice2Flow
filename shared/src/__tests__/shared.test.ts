import { describe, it, expect } from 'vitest';
import { HealthResponseSchema, APP_NAME, API_PREFIX } from '../index.js';

describe('shared constants & schemas', () => {
  it('exports valid application constants', () => {
    expect(APP_NAME).toBe('Voice2Flow');
    expect(API_PREFIX).toBe('/api/v1');
  });

  it('validates health response payload', () => {
    const validPayload = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: 12.34,
      database: {
        status: 'connected',
        latencyMs: 5,
      },
      scheduler: {
        enabled: true,
        status: 'running',
      },
      ai: {
        mode: 'Basic mode',
        provider: 'rules',
      },
      version: '0.1.0',
    };

    const parsed = HealthResponseSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });
});
