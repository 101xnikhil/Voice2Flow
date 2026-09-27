import { describe, it, expect } from 'vitest';
import { calculateFinalConfidence, getConfidenceDecision } from '../nlp/confidence.js';

describe('Confidence & Decision Table Unit Tests (Spec §6.8)', () => {
  describe('calculateFinalConfidence()', () => {
    it('1. returns base model confidence when no voice or assumptions', () => {
      const conf = calculateFinalConfidence({ modelConfidence: 0.92 });
      expect(conf).toBe(0.92);
    });

    it('2. discounts for voice STT when sttConfidence < 0.9: 0.95 * 0.80 = 0.76', () => {
      const conf = calculateFinalConfidence({
        modelConfidence: 0.95,
        isVoice: true,
        sttConfidence: 0.8,
      });
      expect(conf).toBe(0.76);
    });

    it('3. does not discount voice STT when sttConfidence >= 0.9', () => {
      const conf = calculateFinalConfidence({
        modelConfidence: 0.95,
        isVoice: true,
        sttConfidence: 0.95,
      });
      expect(conf).toBe(0.95);
    });

    it('4. subtracts 0.05 per assumption: 2 assumptions = -0.10', () => {
      const conf = calculateFinalConfidence({
        modelConfidence: 0.9,
        assumptions: ['Assumed 6 PM', 'Assumed today'],
      });
      expect(conf).toBe(0.8);
    });

    it('5. caps assumption penalty at -0.20 even with 5 assumptions', () => {
      const conf = calculateFinalConfidence({
        modelConfidence: 0.9,
        assumptions: ['A1', 'A2', 'A3', 'A4', 'A5'],
      });
      expect(conf).toBe(0.7); // 0.9 - 0.20 = 0.70
    });

    it('6. caps confidence at 0.70 when target task match was fuzzy', () => {
      const conf = calculateFinalConfidence({
        modelConfidence: 0.95,
        isFuzzyTaskMatch: true,
      });
      expect(conf).toBe(0.7);
    });

    it('7. clamps confidence to [0, 1]', () => {
      const low = calculateFinalConfidence({
        modelConfidence: 0.1,
        isVoice: true,
        sttConfidence: 0.5,
        assumptions: ['A1', 'A2', 'A3'],
      });
      expect(low).toBe(0);

      const high = calculateFinalConfidence({ modelConfidence: 1.5 });
      expect(high).toBe(1);
    });
  });

  describe('getConfidenceDecision() (Decision Table)', () => {
    it('8. returns CLARIFY when intent is UNKNOWN', () => {
      const decision = getConfidenceDecision({
        intent: 'UNKNOWN',
        finalConfidence: 0.95,
      });
      expect(decision).toBe('CLARIFY');
    });

    it('9. returns CLARIFY when finalConfidence < 0.60', () => {
      const decision = getConfidenceDecision({
        intent: 'CREATE_TASK',
        finalConfidence: 0.55,
      });
      expect(decision).toBe('CLARIFY');
    });

    it('10. returns CLARIFY when task match is ambiguous', () => {
      const decision = getConfidenceDecision({
        intent: 'COMPLETE_TASK',
        finalConfidence: 0.95,
        isAmbiguousTaskMatch: true,
      });
      expect(decision).toBe('CLARIFY');
    });

    it('11. returns CLARIFY when a required slot is missing', () => {
      const decision = getConfidenceDecision({
        intent: 'CREATE_TASK',
        finalConfidence: 0.9,
        hasMissingRequiredSlot: true,
      });
      expect(decision).toBe('CLARIFY');
    });

    it('12. returns ALWAYS_CONFIRM for destructive actions (e.g. DELETE_TASK)', () => {
      const decision = getConfidenceDecision({
        intent: 'DELETE_TASK',
        finalConfidence: 0.98,
        autoExecute: true,
        isDestructive: true,
      });
      expect(decision).toBe('ALWAYS_CONFIRM');
    });

    it('13. returns PREVIEW_CONFIRM when 0.60 <= conf < autoExecuteThreshold (0.85)', () => {
      const decision = getConfidenceDecision({
        intent: 'CREATE_TASK',
        finalConfidence: 0.75,
        autoExecute: true,
        autoExecuteThreshold: 0.85,
      });
      expect(decision).toBe('PREVIEW_CONFIRM');
    });

    it('14. returns PREVIEW_CONFIRM when confidence >= threshold but autoExecute is OFF', () => {
      const decision = getConfidenceDecision({
        intent: 'CREATE_TASK',
        finalConfidence: 0.92,
        autoExecute: false,
        autoExecuteThreshold: 0.85,
      });
      expect(decision).toBe('PREVIEW_CONFIRM');
    });

    it('15. returns EXECUTE_IMMEDIATELY when confidence >= threshold and autoExecute is ON', () => {
      const decision = getConfidenceDecision({
        intent: 'CREATE_TASK',
        finalConfidence: 0.92,
        autoExecute: true,
        autoExecuteThreshold: 0.85,
      });
      expect(decision).toBe('EXECUTE_IMMEDIATELY');
    });

    it('16. returns PREVIEW_CONFIRM for multi-step workflows by default', () => {
      const decision = getConfidenceDecision({
        intent: 'CREATE_WORKFLOW',
        finalConfidence: 0.95,
        isMultiStep: true,
        autoExecute: true,
        autoExecuteWorkflows: false,
      });
      expect(decision).toBe('PREVIEW_CONFIRM');
    });

    it('17. returns EXECUTE_IMMEDIATELY for multi-step workflows when autoExecuteWorkflows is ON', () => {
      const decision = getConfidenceDecision({
        intent: 'CREATE_WORKFLOW',
        finalConfidence: 0.95,
        isMultiStep: true,
        autoExecuteWorkflows: true,
        autoExecuteThreshold: 0.85,
      });
      expect(decision).toBe('EXECUTE_IMMEDIATELY');
    });
  });
});
