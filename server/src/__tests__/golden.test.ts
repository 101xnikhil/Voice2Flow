import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RulesProvider } from '../ai/providers/rules/index.js';

interface GoldenCommand {
  input: string;
  expectedIntent: string;
  expectedMultiStep?: boolean;
  expectedEntities: Record<string, unknown>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const goldenPath = path.join(__dirname, '../tests/golden/commands.json');

describe('Golden Set Command Understanding (RulesProvider)', () => {
  const provider = new RulesProvider();
  const goldenEntries: GoldenCommand[] = JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));

  it('contains at least 40 English commands', () => {
    expect(goldenEntries.length).toBeGreaterThanOrEqual(40);
  });

  describe('Three Canonical Spec §6.3 Golden Examples', () => {
    it('1. Finish DBMS Assignment tomorrow at 6 PM', async () => {
      const parsed = await provider.parseCommand({
        text: 'Finish DBMS Assignment tomorrow at 6 PM',
      });
      expect(parsed.intent).toBe('CREATE_TASK');
      expect(parsed.entities.title).toBe('Finish DBMS Assignment');
      expect(parsed.entities.category).toBe('ACADEMIC');
      expect(parsed.entities.priority).toBe('HIGH');
      expect(parsed.entities.date).toBe('tomorrow');
      expect(parsed.entities.time).toBe('18:00');
    });

    it('2. Complete React assignment', async () => {
      const parsed = await provider.parseCommand({ text: 'Complete React assignment' });
      expect(parsed.intent).toBe('COMPLETE_TASK');
      expect(parsed.entities.taskQuery).toBe('React assignment');
    });

    it('3. Study DBMS tomorrow at 7 PM for 2 hours', async () => {
      const parsed = await provider.parseCommand({
        text: 'Study DBMS tomorrow at 7 PM for 2 hours',
      });
      expect(parsed.intent).toBe('CREATE_REMINDER');
      expect(parsed.entities.title).toBe('Study DBMS');
      expect(parsed.entities.date).toBe('tomorrow');
      expect(parsed.entities.time).toBe('19:00');
      expect(parsed.entities.duration).toBe('PT2H');
      expect(parsed.entities.category).toBe('ACADEMIC');
    });
  });

  describe('Full Golden Set Benchmark', () => {
    it('achieves 100% pass rate across all golden commands', async () => {
      let passedCount = 0;
      const failures: { input: string; reason: string }[] = [];

      for (const entry of goldenEntries) {
        const parsed = await provider.parseCommand({ text: entry.input });

        let passed = true;
        let failReason = '';

        if (parsed.intent !== entry.expectedIntent) {
          passed = false;
          failReason += `Expected intent '${entry.expectedIntent}', got '${parsed.intent}'. `;
        }

        if (entry.expectedMultiStep !== undefined && parsed.isMultiStep !== entry.expectedMultiStep) {
          passed = false;
          failReason += `Expected isMultiStep '${entry.expectedMultiStep}', got '${parsed.isMultiStep}'. `;
        }

        const entities = parsed.entities as Record<string, unknown>;
        for (const [key, expectedVal] of Object.entries(entry.expectedEntities)) {
          if (entities[key] !== expectedVal) {
            passed = false;
            failReason += `Entity mismatch for '${key}': expected '${expectedVal}', got '${entities[key]}'. `;
          }
        }

        if (passed) {
          passedCount++;
        } else {
          failures.push({ input: entry.input, reason: failReason });
        }
      }

      const passRate = (passedCount / goldenEntries.length) * 100;
      console.log(`Golden Set Pass Rate: ${passedCount}/${goldenEntries.length} (${passRate.toFixed(1)}%)`);

      if (failures.length > 0) {
        console.error('Golden set failures:', failures);
      }

      expect(failures).toEqual([]);
      expect(passRate).toBe(100);
    });
  });
});
