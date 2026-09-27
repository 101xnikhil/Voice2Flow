import {
  Intent,
  CommandLanguage,
  CommandEntities,
  ParsedCommand,
} from '@voice2flow/shared';

export interface WorkflowDefinition {
  schemaVersion: number;
  name: string;
  description?: string;
  nodes: { id: string; type: string; params?: Record<string, unknown>; label?: string }[];
  edges: { id?: string; from: string; to: string; branch?: 'true' | 'false' }[];
}

export interface ParseInput {
  text: string;
  now?: Date;
  timezone?: string;
  weekStartsOn?: number;
  languageHint?: CommandLanguage;
  expectedSlot?: string;
  promptVersion?: string;
}

export interface WorkflowGenInput {
  text: string;
  parsedCommand: ParsedCommand;
  timezone?: string;
}

export interface ClarificationInput {
  intent: Intent;
  field?: string;
  reason?: string;
  candidates?: { id: string; title: string }[];
  language?: CommandLanguage;
}

export interface Clarification {
  question: string;
  options?: string[];
  expectedSlot?: string;
}

export interface SummaryInput {
  intent: Intent;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  taskTitle?: string;
  executionStepsCount?: number;
  language?: CommandLanguage;
}

export interface AIService {
  parseCommand(input: ParseInput): Promise<ParsedCommand>;
  extractIntent(input: ParseInput): Promise<{ intent: Intent; confidence: number; language: CommandLanguage }>;
  extractEntities(input: ParseInput & { intent: Intent }): Promise<CommandEntities>;
  generateWorkflow(input: WorkflowGenInput): Promise<WorkflowDefinition>;
  generateClarification(input: ClarificationInput): Promise<Clarification>;
  summarizeExecution(input: SummaryInput): Promise<string>;
}
