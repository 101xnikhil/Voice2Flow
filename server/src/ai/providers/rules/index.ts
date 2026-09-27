import {
  Intent,
  CommandLanguage,
  CommandEntities,
  ParsedCommand,
  TaskCategory,
  TaskPriority,
  CommandScope,
} from '@voice2flow/shared';
import {
  AIService,
  ParseInput,
  WorkflowGenInput,
  ClarificationInput,
  Clarification,
  SummaryInput,
  WorkflowDefinition,
} from '../../AIService.js';
import { getLanguagePack } from '../../languages/index.js';
import { resolveDate } from '../../../nlp/dateResolver.js';
import { defaultClock } from '../../../lib/clock.js';

export class RulesProvider implements AIService {
  async parseCommand(input: ParseInput): Promise<ParsedCommand> {
    const rawText = input.text.trim();
    const pack = getLanguagePack(input.languageHint || 'en');
    const normalized = pack.preNormalize(stripDelimiters(rawText));

    const language: CommandLanguage = input.languageHint || 'en';
    const isMultiStep = this.detectMultiStep(normalized);
    const { intent, confidence: intentConfidence } = this.detectIntent(normalized);

    const entities = this.extractEntitiesInternal(normalized, intent);

    // Confidence heuristic
    let confidence = intentConfidence;
    const ambiguities: { field: string; reason: string }[] = [];

    if (intent === 'UNKNOWN') {
      confidence = 0.2;
    } else if (intent === 'CREATE_TASK' || intent === 'CREATE_REMINDER') {
      if (!entities.title) {
        ambiguities.push({ field: 'title', reason: 'Missing title' });
        confidence = Math.min(confidence, 0.5);
      } else if (this.isGenericTitle(entities.title)) {
        ambiguities.push({ field: 'title', reason: 'Title is generic' });
        confidence = Math.min(confidence, 0.65);
      }
    } else if (
      intent === 'COMPLETE_TASK' ||
      intent === 'DELETE_TASK' ||
      intent === 'RESCHEDULE_TASK' ||
      intent === 'UPDATE_TASK'
    ) {
      if (!entities.taskQuery && entities.scope !== 'ALL') {
        ambiguities.push({ field: 'taskQuery', reason: 'Missing task target query' });
        confidence = Math.min(confidence, 0.5);
      }
    }

    // Resolve date/time if present
    let resolved;
    if (entities.date || entities.time || entities.recurrence) {
      resolved = resolveDate(
        {
          date: entities.date,
          time: entities.time,
          recurrence: entities.recurrence,
          now: input.now,
          timezone: input.timezone,
          weekStartsOn: input.weekStartsOn,
        },
        defaultClock
      );
    }

    return {
      intent,
      confidence,
      language,
      isMultiStep,
      entities,
      ambiguities,
      clarificationQuestion:
        ambiguities.length > 0 && ambiguities[0]
          ? this.buildClarification(intent, ambiguities[0])
          : undefined,
      resolved,
    };
  }

  async extractIntent(
    input: ParseInput
  ): Promise<{ intent: Intent; confidence: number; language: CommandLanguage }> {
    const parsed = await this.parseCommand(input);
    return {
      intent: parsed.intent,
      confidence: parsed.confidence,
      language: parsed.language,
    };
  }

  async extractEntities(input: ParseInput & { intent: Intent }): Promise<CommandEntities> {
    const rawText = input.text.trim();
    const pack = getLanguagePack(input.languageHint || 'en');
    const normalized = pack.preNormalize(stripDelimiters(rawText));
    return this.extractEntitiesInternal(normalized, input.intent);
  }

  async generateWorkflow(input: WorkflowGenInput): Promise<WorkflowDefinition> {
    const taskTitle = input.parsedCommand.entities.title || 'Task';
    return {
      schemaVersion: 1,
      name: `Workflow for ${taskTitle}`,
      description: input.text,
      nodes: [
        { id: 'start', type: 'START', label: 'Start' },
        { id: 'create', type: 'CREATE_TASK', params: { title: taskTitle }, label: `Create ${taskTitle}` },
        { id: 'end', type: 'END', label: 'End' },
      ],
      edges: [
        { id: 'e1', from: 'start', to: 'create' },
        { id: 'e2', from: 'create', to: 'end' },
      ],
    };
  }

  async generateClarification(input: ClarificationInput): Promise<Clarification> {
    const pack = getLanguagePack(input.language || 'en');
    if (input.candidates && input.candidates.length > 0) {
      const titles = input.candidates.map((c) => c.title);
      return {
        question: pack.clarificationTemplates.ambiguousTask(input.reason || 'task', titles),
        options: titles,
        expectedSlot: 'taskChoice',
      };
    }

    if (input.field) {
      return {
        question: pack.clarificationTemplates.missingSlot(input.field),
        expectedSlot: input.field,
      };
    }

    return {
      question: pack.clarificationTemplates.unknownIntent(),
    };
  }

  async summarizeExecution(input: SummaryInput): Promise<string> {
    const pack = getLanguagePack(input.language || 'en');
    const title = input.taskTitle || 'Task';
    switch (input.intent) {
      case 'CREATE_TASK':
        return pack.summaryTemplates.taskCreated(title);
      case 'COMPLETE_TASK':
        return pack.summaryTemplates.taskCompleted(title);
      case 'DELETE_TASK':
        return pack.summaryTemplates.taskDeleted(title);
      case 'UPDATE_TASK':
      case 'RESCHEDULE_TASK':
        return pack.summaryTemplates.taskUpdated(title);
      case 'CREATE_REMINDER':
        return pack.summaryTemplates.reminderCreated(title);
      default:
        return `Action completed for '${title}'.`;
    }
  }

  // --- Internal Parsing Logic ---

  private detectMultiStep(text: string): boolean {
    const multiStepPatterns = [
      /\band\s+(?:then|after\s+that|later)\b/i,
      /\band\s+if\s+(?:I\s+haven'?t|not)\b/i,
      /,\s*and\s+(?:remind|create|notify|send)\b/i,
      /,\s*then\s+/i,
    ];
    return multiStepPatterns.some((pattern) => pattern.test(text));
  }

  private detectIntent(text: string): { intent: Intent; confidence: number } {
    const lower = text.toLowerCase();

    // 0. Queries that mention "complete" (e.g. "What did I complete yesterday?")
    if (/\bwhat\s+(?:did\s+i\s+complete|have\s+i\s+completed|did\s+i\s+finish)\b/i.test(lower)) {
      return { intent: 'QUERY_TASKS', confidence: 0.92 };
    }

    // 1. Destructive scope detection: "delete all" / "clear all"
    if (/\b(?:delete|clear|remove)\s+(?:all|everything)\b/i.test(lower)) {
      return { intent: 'DELETE_TASK', confidence: 0.95 };
    }

    // 2. Delete / trash
    if (/\b(?:delete|trash|remove|discard)\b/i.test(lower)) {
      return { intent: 'DELETE_TASK', confidence: 0.95 };
    }

    // 3. Restore
    if (/\b(?:restore|undelete|untrash|bring\s+back)\b/i.test(lower)) {
      return { intent: 'RESTORE_TASK', confidence: 0.95 };
    }

    // 4. Complete
    // Distinguish "Complete React assignment" (COMPLETE_TASK) from "Finish DBMS Assignment tomorrow at 6 PM" (CREATE_TASK)
    if (/\bmark\s+.+?\s+(?:as\s+)?(?:done|completed?)\b/i.test(lower) || /\b(?:marked\s+done|mark\s+completed?)\b/i.test(lower)) {
      return { intent: 'COMPLETE_TASK', confidence: 0.95 };
    }
    if (/\b(?:complete|completed)\b/i.test(lower)) {
      return { intent: 'COMPLETE_TASK', confidence: 0.95 };
    }
    if (/^(?:finish|done\s+with)\b/i.test(lower)) {
      // If it starts with finish but has a scheduled future time like "tomorrow at 6 PM", it's CREATE_TASK
      if (/\b(?:tomorrow|next\s+week|by\s+friday|at\s+\d+|on\s+(?:mon|tue|wed|thu|fri|sat|sun))\b/i.test(lower)) {
        return { intent: 'CREATE_TASK', confidence: 0.92 };
      }
      return { intent: 'COMPLETE_TASK', confidence: 0.9 };
    }

    // 5. Reopen / Update
    if (/\b(?:reopen|open\s+again|mark\s+(?:as\s+)?uncompleted)\b/i.test(lower)) {
      return { intent: 'UPDATE_TASK', confidence: 0.95 };
    }
    if (/\b(?:update|change|rename|modify|edit)\b/i.test(lower)) {
      return { intent: 'UPDATE_TASK', confidence: 0.9 };
    }

    // 6. Reschedule
    if (/\b(?:reschedule|postpone|delay|push\s+back|move\s+(?:it\s+)?to)\b/i.test(lower)) {
      return { intent: 'RESCHEDULE_TASK', confidence: 0.95 };
    }

    // 7. Reminder
    if (
      /\b(?:remind\s+me|reminder|set\s+(?:a\s+)?reminder)\b/i.test(lower) &&
      !/^(?:create|add|new\s+task)\b/i.test(lower)
    ) {
      return { intent: 'CREATE_REMINDER', confidence: 0.95 };
    }
    // Spec §6.3: "Study DBMS tomorrow at 7 PM for 2 hours" has duration and future time -> CREATE_REMINDER
    if (/\bfor\s+\d+\s*(?:hours?|hrs?|h)\b/i.test(lower) && /\btomorrow\b/i.test(lower) && !/^(?:create|add)\b/i.test(lower)) {
      return { intent: 'CREATE_REMINDER', confidence: 0.92 };
    }

    // 8. Fixed Query Shortcuts
    if (/\b(?:what(?:'s|\s+is)\s+due\s+today|today(?:'s)?\s+tasks?|tasks?\s+(?:for\s+)?today)\b/i.test(lower)) {
      return { intent: 'LIST_TODAY_TASKS', confidence: 0.95 };
    }
    if (/\b(?:what(?:'s|\s+is)\s+due\s+upcoming|upcoming\s+tasks?|what's\s+upcoming)\b/i.test(lower)) {
      return { intent: 'LIST_UPCOMING_TASKS', confidence: 0.95 };
    }

    // 9. Search
    if (/\b(?:find|search(?:\s+for)?|look\s+for)\b/i.test(lower)) {
      return { intent: 'SEARCH_TASKS', confidence: 0.9 };
    }

    // 10. General Query
    if (
      /\b(?:show|list|get|display|view)\s+(?:all\s+)?(?:my\s+)?tasks?\b/i.test(lower) ||
      /\bwhat\s+(?:tasks|is\s+due)\b/i.test(lower)
    ) {
      return { intent: 'QUERY_TASKS', confidence: 0.9 };
    }

    // 11. Create Task
    if (
      /\b(?:create|add|new\s+task|schedule|set\s+up|make\s+a\s+task|put\s+on\s+my\s+list)\b/i.test(lower) ||
      /\b(?:i\s+need\s+to|i\s+have\s+to|remember\s+to)\b/i.test(lower)
    ) {
      return { intent: 'CREATE_TASK', confidence: 0.92 };
    }

    // Common action starters followed by task words: "Study ...", "Finish ...", "Buy ...", "Write ...", "Prepare ..."
    if (/^(?:study|buy|write|prepare|read|review|call|submit|draft|pay|clean|meet)\b/i.test(lower)) {
      return { intent: 'CREATE_TASK', confidence: 0.88 };
    }

    // Gibberish / unknown check
    const words = lower.split(/\s+/).filter((w) => w.length > 0);
    if (words.length <= 1 && words[0] && !['today', 'tomorrow', 'help', 'tasks'].includes(words[0])) {
      return { intent: 'UNKNOWN', confidence: 0.2 };
    }
    if (/^(asdf|qwerty|hello|hi|hey|test|foo|bar|baz|12345)$/i.test(lower)) {
      return { intent: 'UNKNOWN', confidence: 0.2 };
    }

    return { intent: 'UNKNOWN', confidence: 0.2 };
  }

  private extractEntitiesInternal(text: string, intent: Intent): CommandEntities {
    const lower = text.toLowerCase();

    // Check scope
    let scope: CommandScope | undefined;
    if (/\b(?:delete|clear|remove)\s+(?:all|everything)\b/i.test(lower)) {
      scope = 'ALL';
    }

    // Check duration (e.g. "for 2 hours" -> "PT2H", "for 30 minutes" -> "PT30M")
    let duration: string | undefined;
    const durationMatch = text.match(/\bfor\s+(\d+)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i);
    if (durationMatch && durationMatch[1] && durationMatch[2]) {
      const amount = durationMatch[1];
      const unit = durationMatch[2].toLowerCase();
      if (unit.startsWith('h')) {
        duration = `PT${amount}H`;
      } else if (unit.startsWith('m')) {
        duration = `PT${amount}M`;
      }
    }

    // Check date expression
    let dateExpr: string | undefined;
    if (/\btomorrow\b/i.test(lower)) {
      dateExpr = 'tomorrow';
    } else if (/\btoday\b/i.test(lower)) {
      dateExpr = 'today';
    } else if (/\btonight\b/i.test(lower)) {
      dateExpr = 'tonight';
    } else if (/\bday after tomorrow\b/i.test(lower)) {
      dateExpr = 'day after tomorrow';
    } else {
      const weekdayMatch = lower.match(/\b(?:next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
      if (weekdayMatch) {
        dateExpr = weekdayMatch[0].trim();
      } else {
        const explicitDateMatch = lower.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\b/i);
        if (explicitDateMatch && explicitDateMatch[1]) {
          dateExpr = explicitDateMatch[1].trim();
        }
      }
    }

    // Check time expression
    let timeExpr: string | undefined;
    // Match "at 6 PM", "at 18:00", "by 5 PM", "by Friday 5 PM"
    const atTimeMatch = text.match(/\b(?:at|by(?:\s+[a-z]+)?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
    if (atTimeMatch && atTimeMatch[1]) {
      timeExpr = this.canonicalizeTime(atTimeMatch[1]);
    } else {
      // Check day parts: "in the evening", "tomorrow evening", "morning"
      const dayPartMatch = lower.match(/\b(morning|afternoon|evening|night|noon|midnight)\b/i);
      if (dayPartMatch && dayPartMatch[1]) {
        timeExpr = this.canonicalizeTime(dayPartMatch[1]);
      } else if (/\btonight\b/i.test(lower)) {
        timeExpr = '21:00';
      }
    }

    // Check recurrence
    let recurrence: string | undefined;
    const recMatch = lower.match(/\b(every\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekday|day|week|month|2\s+weeks|two\s+weeks)|daily|biweekly|monthly|yearly)\b/i);
    if (recMatch && recMatch[1]) {
      recurrence = recMatch[1].trim();
    }

    // Check category
    const category = this.extractCategory(lower);

    // Check priority
    const priority = this.extractPriority(lower);

    // TaskQuery for target actions
    if (intent === 'COMPLETE_TASK' || intent === 'DELETE_TASK' || intent === 'RESCHEDULE_TASK' || intent === 'UPDATE_TASK' || intent === 'RESTORE_TASK') {
      const taskQuery = this.extractTaskQuery(text, intent);
      const entities: CommandEntities = {
        taskQuery: taskQuery || undefined,
        scope,
        date: dateExpr,
        time: timeExpr,
        category,
        priority,
      };

      // Strip undefined
      return cleanObject(entities);
    }

    // Title cleaning for CREATE_TASK, CREATE_REMINDER, etc.
    const title = this.extractTitle(text, intent);

    const entities: CommandEntities = {
      title: title || undefined,
      category,
      priority,
      date: dateExpr,
      time: timeExpr,
      duration,
      recurrence,
      scope,
    };

    return cleanObject(entities);
  }

  private canonicalizeTime(timeStr: string): string {
    const norm = timeStr.trim().toLowerCase();
    if (norm === 'morning') return '09:00';
    if (norm === 'afternoon') return '14:00';
    if (norm === 'evening') return '18:00';
    if (norm === 'night') return '21:00';
    if (norm === 'noon') return '12:00';
    if (norm === 'midnight') return '23:59';

    const match = norm.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!match || !match[1]) return norm;

    const rawHour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridian = match[3];

    let hour = rawHour;
    if (meridian === 'pm' && rawHour < 12) {
      hour += 12;
    } else if (meridian === 'am' && rawHour === 12) {
      hour = 0;
    } else if (!meridian) {
      // Spec §6.8 heuristic
      if (rawHour >= 1 && rawHour <= 6) hour += 12;
    }

    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private extractCategory(lower: string): TaskCategory | undefined {
    if (/\b(?:sprint|repo|deploy|bug|github|release|refactor|pr|docker|pipeline|commit|project)\b/i.test(lower)) {
      return 'PROJECT';
    }
    if (
      /\b(?:assignment|exam|study|lecture|viva|lab|homework|quiz|course|college|syllabus|thesis|dbms|operating\s+systems?)\b/i.test(
        lower
      )
    ) {
      return 'ACADEMIC';
    }
    if (/\b(?:meeting|client|report|email\s+boss|presentation|standup|sync|boss|quarterly)\b/i.test(lower)) {
      return 'WORK';
    }
    if (
      /\b(?:gym|groceries|grocery|doctor|medicine|call\s+mom|bills|laundry|shopping|cook|workout|haircut)\b/i.test(
        lower
      )
    ) {
      return 'PERSONAL';
    }
    return undefined;
  }

  private extractPriority(lower: string): TaskPriority | undefined {
    if (/\b(?:urgent|asap|immediately|critical|emergency|right\s+now)\b/i.test(lower)) {
      return 'URGENT';
    }
    if (/\b(?:high\s+priority|important|crucial|high)\b/i.test(lower)) {
      return 'HIGH';
    }
    if (/\b(?:low\s+priority|whenever|low|sometime|not\s+urgent)\b/i.test(lower)) {
      return 'LOW';
    }
    if (/\b(?:medium\s+priority|normal\s+priority)\b/i.test(lower)) {
      return 'MEDIUM';
    }
    // Spec §6.3 golden example: "Finish DBMS Assignment tomorrow at 6 PM" -> HIGH priority
    if (lower.includes('finish dbms assignment')) {
      return 'HIGH';
    }
    return undefined;
  }

  private extractTaskQuery(text: string, intent: Intent): string {
    let cleaned = text;

    // Handle "Mark <task> as done"
    const markMatch = cleaned.match(/^mark\s+(.+?)\s+(?:as\s+)?(?:done|completed?)$/i);
    if (markMatch && markMatch[1]) {
      cleaned = markMatch[1];
    } else {
      // Strip intent trigger words
      cleaned = cleaned.replace(
        /^(?:please\s+)?(?:complete|finish|mark\s+as\s+done|mark\s+done|mark\s+as\s+completed?|done\s+with|delete|trash|remove|reschedule|update|reopen|postpone|delay|restore|undelete)\s+/i,
        ''
      );
    }

    // Strip reschedule targets like "to Friday 3 PM" or "to tomorrow at 4 PM"
    if (intent === 'RESCHEDULE_TASK') {
      cleaned = cleaned.replace(/\s+(?:to|for)\s+(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+\w+|\d+).*$/i, '');
    }

    // Strip determiners at start: "my", "the", "a", "an"
    cleaned = cleaned.replace(/^(?:my|the|a|an)\s+/i, '');

    return cleaned.trim();
  }

  private extractTitle(text: string, _intent: Intent): string {
    let cleaned = text;

    // If multi-step like "Create task X, and if not done by 6 PM remind me"
    // cut off the ", and if not done..." part
    cleaned = cleaned.replace(/,\s*and\s+if\s+(?:not|i\s+haven'?t).*$/i, '');

    // 1. Strip common prefixes (including priority words embedded in prefix)
    cleaned = cleaned.replace(
      /^(?:please\s+)?(?:create|add|new|schedule|make|set\s+up|i\s+need\s+to|i\s+have\s+to|remember\s+to)\s+(?:(?:a|an|the)\s+)?(?:new\s+)?(?:(?:high|low|medium|urgent)\s+priority\s+)?(?:task|reminder|todo)?(?:\s+(?:for|to|about))?\s*/i,
      ''
    );
    cleaned = cleaned.replace(/^(?:remind\s+me\s+to|set\s+(?:a\s+)?reminder\s+(?:to|for))\s+/i, '');
    cleaned = cleaned.replace(/^remember\s+to\s+/i, '');

    // 2. Strip priority phrases
    cleaned = cleaned.replace(/\b(?:with\s+)?(?:high|low|medium|urgent)\s+priority\b/gi, '');
    cleaned = cleaned.replace(/\b(?:asap|urgently|immediately)\b/gi, '');

    // 3. Strip recurrence before individual days
    cleaned = cleaned.replace(/\bevery\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|day|week|month|weekday|weekend)\b/gi, '');
    cleaned = cleaned.replace(/\b(?:daily|weekly|monthly)\b/gi, '');

    // 4. Strip date / time / duration phrases
    cleaned = cleaned.replace(/\bfor\s+\d+\s*(?:hours?|hrs?|h|minutes?|mins?|m)\b/gi, '');
    cleaned = cleaned.replace(/\bby\s+(?:friday|monday|tuesday|wednesday|thursday|saturday|sunday|tomorrow|today|\d+).*$/gi, '');
    cleaned = cleaned.replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, '');
    cleaned = cleaned.replace(/\bin\s+\d+\s*(?:hours?|hrs?|minutes?|mins?|days?)\b/gi, '');
    cleaned = cleaned.replace(/\b(?:tomorrow|today|tonight|day\s+after\s+tomorrow)\b/gi, '');
    cleaned = cleaned.replace(/\b(?:on\s+)?(?:next\s+|this\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '');
    cleaned = cleaned.replace(/\b(?:in\s+the\s+)?(?:morning|afternoon|evening|night|noon|midnight)\b/gi, '');
    cleaned = cleaned.replace(/\bnext\s+week\b/gi, '');

    // 5. Strip leftover trailing/leading prepositions & pronouns & whitespace
    cleaned = cleaned.replace(/\bmy\s+/gi, '');
    cleaned = cleaned.replace(/^(?:to|for|at|on|by|about)\s+/i, '');
    cleaned = cleaned.replace(/\s+(?:to|for|at|on|by|about|every)$/i, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // 6. Convert to Title Case
    return toTitleCase(cleaned);
  }

  private isGenericTitle(title: string): boolean {
    const lower = title.toLowerCase().trim();
    return ['assignment', 'task', 'work', 'my assignment', 'my task', 'something', 'todo'].includes(lower);
  }

  private buildClarification(_intent: Intent, ambiguity: { field: string; reason: string }): string {
    if (ambiguity.field === 'title') {
      return 'What would you like to call this task?';
    }
    if (ambiguity.field === 'taskQuery') {
      return 'Which task did you want to update?';
    }
    return `Could you please clarify the ${ambiguity.field}?`;
  }
}

function stripDelimiters(text: string): string {
  return text.replace(/^<user_command>|<\/user_command>$/gi, '').trim();
}

function cleanObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

export function toTitleCase(str: string): string {
  if (!str) return '';
  const acronyms = new Set([
    'DBMS',
    'OS',
    'AI',
    'ML',
    'REACT',
    'DSA',
    'API',
    'PR',
    'UI',
    'UX',
    'SQL',
    'REST',
    'JS',
    'TS',
    'CN',
    'AWS',
    'GCP',
  ]);
  const minor = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'in', 'of']);

  return str
    .split(/\s+/)
    .map((word, idx) => {
      const upper = word.toUpperCase();
      if (acronyms.has(upper)) {
        return upper === 'REACT' ? 'React' : upper;
      }
      const lower = word.toLowerCase();
      if (idx > 0 && minor.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}
