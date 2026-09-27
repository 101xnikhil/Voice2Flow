/**
 * Resilient AI Service
 * Wraps the configured AI Provider (Gemini/OpenAI/Anthropic) with timeout, retry,
 * and automatic fallback to RulesProvider when offline or unconfigured.
 */

import {
  AIService,
  ParseInput,
  WorkflowGenInput,
  ClarificationInput,
  Clarification,
  SummaryInput,
  WorkflowDefinition,
} from './AIService.js';
import {
  Intent,
  CommandLanguage,
  CommandEntities,
  ParsedCommand,
} from '@voice2flow/shared';
import { RulesProvider } from './providers/rules/index.js';
import { logger } from '../lib/logger.js';

export class ResilientAIService implements AIService {
  private rulesProvider: RulesProvider;
  private primaryProvider?: AIService;
  private currentMode: 'RULES' | 'LLM' = 'RULES';

  constructor(primaryProvider?: AIService) {
    this.rulesProvider = new RulesProvider();
    this.primaryProvider = primaryProvider;
    this.currentMode = primaryProvider ? 'LLM' : 'RULES';
  }

  getParserMode(): 'RULES' | 'LLM' {
    return this.currentMode;
  }

  async parseCommand(input: ParseInput): Promise<ParsedCommand> {
    if (this.primaryProvider) {
      try {
        const result = await this.primaryProvider.parseCommand(input);
        return result;
      } catch (err) {
        logger.warn({ err }, 'Primary AI provider failed, falling back to RulesProvider');
        this.currentMode = 'RULES';
      }
    }
    return this.rulesProvider.parseCommand(input);
  }

  async extractIntent(
    input: ParseInput
  ): Promise<{ intent: Intent; confidence: number; language: CommandLanguage }> {
    if (this.primaryProvider) {
      try {
        return await this.primaryProvider.extractIntent(input);
      } catch (err) {
        logger.warn({ err }, 'Primary AI provider extractIntent failed, falling back to RulesProvider');
      }
    }
    return this.rulesProvider.extractIntent(input);
  }

  async extractEntities(
    input: ParseInput & { intent: Intent }
  ): Promise<CommandEntities> {
    if (this.primaryProvider) {
      try {
        return await this.primaryProvider.extractEntities(input);
      } catch (err) {
        logger.warn({ err }, 'Primary AI provider extractEntities failed, falling back to RulesProvider');
      }
    }
    return this.rulesProvider.extractEntities(input);
  }

  async generateWorkflow(input: WorkflowGenInput): Promise<WorkflowDefinition> {
    if (this.primaryProvider) {
      try {
        return await this.primaryProvider.generateWorkflow(input);
      } catch (err) {
        logger.warn({ err }, 'Primary AI provider generateWorkflow failed, falling back to RulesProvider');
      }
    }
    return this.rulesProvider.generateWorkflow(input);
  }

  async generateClarification(input: ClarificationInput): Promise<Clarification> {
    if (this.primaryProvider) {
      try {
        return await this.primaryProvider.generateClarification(input);
      } catch (err) {
        logger.warn({ err }, 'Primary AI provider generateClarification failed, falling back to RulesProvider');
      }
    }
    return this.rulesProvider.generateClarification(input);
  }

  async summarizeExecution(input: SummaryInput): Promise<string> {
    if (this.primaryProvider) {
      try {
        return await this.primaryProvider.summarizeExecution(input);
      } catch (err) {
        logger.warn({ err }, 'Primary AI provider summarizeExecution failed, falling back to RulesProvider');
      }
    }
    return this.rulesProvider.summarizeExecution(input);
  }
}

export const resilientAIService = new ResilientAIService();
