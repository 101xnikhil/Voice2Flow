import { CommandLanguage, Intent } from '@voice2flow/shared';

export interface FewShotExample {
  input: string;
  intent: Intent;
  entities: Record<string, unknown>;
  confidence?: number;
  isMultiStep?: boolean;
}

export interface ClarificationTemplates {
  ambiguousTask: (query: string, options: string[]) => string;
  missingSlot: (slotName: string) => string;
  unknownIntent: () => string;
  destructiveConfirm: (count: number) => string;
}

export interface SummaryTemplates {
  taskCreated: (title: string, dueAt?: string) => string;
  taskCompleted: (title: string) => string;
  taskDeleted: (title: string) => string;
  taskUpdated: (title: string) => string;
  reminderCreated: (title: string, time?: string) => string;
  workflowCreated: (name: string) => string;
}

export interface LanguagePack {
  code: CommandLanguage;
  sttLocale: string;
  lexicon: {
    daysOfWeek: Record<string, string>;
    dayParts: Record<string, string>;
    priorities: Record<string, string>;
    categories: Record<string, string>;
    verbs: Record<string, Intent>;
  };
  preNormalize(text: string): string;
  fewShotExamples: FewShotExample[];
  clarificationTemplates: ClarificationTemplates;
  summaryTemplates: SummaryTemplates;
}
