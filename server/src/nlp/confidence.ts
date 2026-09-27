import {
  Intent,
  CONFIDENCE_AUTO_EXECUTE,
  CONFIDENCE_CONFIRM_MIN,
  CONFIDENCE_ASSUMPTION_PENALTY,
  CONFIDENCE_MAX_ASSUMPTION_PENALTY,
  CONFIDENCE_FUZZY_MATCH_CAP,
  ConfidenceDecision,
} from '@voice2flow/shared';

export interface ConfidenceCalculationInput {
  modelConfidence: number;
  isVoice?: boolean;
  sttConfidence?: number;
  assumptions?: string[];
  isFuzzyTaskMatch?: boolean;
}

export interface ConfidenceDecisionInput {
  intent: Intent;
  finalConfidence: number;
  autoExecuteThreshold?: number;
  autoExecute?: boolean;
  autoExecuteWorkflows?: boolean;
  isDestructive?: boolean;
  isMultiStep?: boolean;
  isAmbiguousTaskMatch?: boolean;
  hasMissingRequiredSlot?: boolean;
}

/**
 * Calculates final confidence according to spec §6.8 formula:
 * finalConfidence = model/parser confidence,
 *   multiplied by sttConfidence if input was voice and sttConfidence < 0.9,
 *   minus 0.05 per recorded assumption (max −0.2),
 *   capped at 0.7 if target task match was fuzzy.
 * Clamped to [0, 1].
 */
export function calculateFinalConfidence(input: ConfidenceCalculationInput): number {
  let score = input.modelConfidence;

  // 1. Voice STT discount if sttConfidence < 0.9
  if (input.isVoice && typeof input.sttConfidence === 'number' && input.sttConfidence < 0.9) {
    score = score * input.sttConfidence;
  }

  // 2. Assumption penalty: 0.05 per assumption up to max 0.20
  const assumptionsCount = input.assumptions ? input.assumptions.length : 0;
  const penalty = Math.min(
    assumptionsCount * CONFIDENCE_ASSUMPTION_PENALTY,
    CONFIDENCE_MAX_ASSUMPTION_PENALTY
  );
  score = score - penalty;

  // 3. Cap at 0.7 if target task match was fuzzy
  if (input.isFuzzyTaskMatch) {
    score = Math.min(score, CONFIDENCE_FUZZY_MATCH_CAP);
  }

  // 4. Clamp to [0, 1]
  const clamped = Math.max(0, Math.min(1, score));
  return Math.round(clamped * 1000) / 1000;
}

/**
 * Maps intent, confidence, and system state to an action behaviour
 * per spec §6.8 decision table.
 */
export function getConfidenceDecision(input: ConfidenceDecisionInput): ConfidenceDecision {
  const threshold = input.autoExecuteThreshold ?? CONFIDENCE_AUTO_EXECUTE;
  const autoExecute = input.autoExecute ?? false;
  const autoWorkflows = input.autoExecuteWorkflows ?? false;

  // 1. Unknown intent or below minimum confidence
  if (input.intent === 'UNKNOWN' || input.finalConfidence < CONFIDENCE_CONFIRM_MIN) {
    return 'CLARIFY';
  }

  // 2. Ambiguous task match or required slot missing
  if (input.isAmbiguousTaskMatch || input.hasMissingRequiredSlot) {
    return 'CLARIFY';
  }

  // 3. Destructive actions always require explicit user confirmation
  if (input.isDestructive) {
    return 'ALWAYS_CONFIRM';
  }

  // 4. Multi-step workflows
  if (input.isMultiStep) {
    if (autoWorkflows && input.finalConfidence >= threshold) {
      return 'EXECUTE_IMMEDIATELY';
    }
    return 'PREVIEW_CONFIRM';
  }

  // 5. High confidence with auto-execute enabled
  if (input.finalConfidence >= threshold && autoExecute) {
    return 'EXECUTE_IMMEDIATELY';
  }

  // 6. Medium confidence (0.60 <= conf < threshold) or auto-execute disabled
  return 'PREVIEW_CONFIRM';
}
