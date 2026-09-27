import { LanguagePack } from '../types.js';

export const enLanguagePack: LanguagePack = {
  code: 'en',
  sttLocale: 'en-US',
  lexicon: {
    daysOfWeek: {
      monday: 'monday',
      tuesday: 'tuesday',
      wednesday: 'wednesday',
      thursday: 'thursday',
      friday: 'friday',
      saturday: 'saturday',
      sunday: 'sunday',
    },
    dayParts: {
      morning: 'morning',
      afternoon: 'afternoon',
      evening: 'evening',
      night: 'night',
      noon: 'noon',
      midnight: 'midnight',
    },
    priorities: {
      urgent: 'URGENT',
      asap: 'URGENT',
      immediately: 'URGENT',
      critical: 'URGENT',
      important: 'HIGH',
      high: 'HIGH',
      low: 'LOW',
      whenever: 'LOW',
      medium: 'MEDIUM',
    },
    categories: {
      assignment: 'ACADEMIC',
      exam: 'ACADEMIC',
      study: 'ACADEMIC',
      lecture: 'ACADEMIC',
      viva: 'ACADEMIC',
      lab: 'ACADEMIC',
      homework: 'ACADEMIC',
      quiz: 'ACADEMIC',
      course: 'ACADEMIC',
      sprint: 'PROJECT',
      repo: 'PROJECT',
      deploy: 'PROJECT',
      bug: 'PROJECT',
      github: 'PROJECT',
      release: 'PROJECT',
      meeting: 'WORK',
      client: 'WORK',
      report: 'WORK',
      boss: 'WORK',
      presentation: 'WORK',
      sync: 'WORK',
      standup: 'WORK',
      gym: 'PERSONAL',
      groceries: 'PERSONAL',
      grocery: 'PERSONAL',
      doctor: 'PERSONAL',
      medicine: 'PERSONAL',
      mom: 'PERSONAL',
      bills: 'PERSONAL',
      laundry: 'PERSONAL',
      shopping: 'PERSONAL',
      workout: 'PERSONAL',
    },
    verbs: {
      create: 'CREATE_TASK',
      add: 'CREATE_TASK',
      new: 'CREATE_TASK',
      make: 'CREATE_TASK',
      schedule: 'CREATE_TASK',
      remind: 'CREATE_REMINDER',
      reminder: 'CREATE_REMINDER',
      complete: 'COMPLETE_TASK',
      finish: 'COMPLETE_TASK',
      done: 'COMPLETE_TASK',
      delete: 'DELETE_TASK',
      remove: 'DELETE_TASK',
      trash: 'DELETE_TASK',
      restore: 'RESTORE_TASK',
      undelete: 'RESTORE_TASK',
      reopen: 'UPDATE_TASK',
      reschedule: 'RESCHEDULE_TASK',
      postpone: 'RESCHEDULE_TASK',
      delay: 'RESCHEDULE_TASK',
      find: 'SEARCH_TASKS',
      search: 'SEARCH_TASKS',
      show: 'QUERY_TASKS',
      list: 'QUERY_TASKS',
      what: 'QUERY_TASKS',
    },
  },
  preNormalize(text: string): string {
    return text
      .trim()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\s+/g, ' ');
  },
  fewShotExamples: [
    {
      input: 'Finish DBMS Assignment tomorrow at 6 PM',
      intent: 'CREATE_TASK',
      entities: {
        title: 'Finish DBMS Assignment',
        category: 'ACADEMIC',
        priority: 'HIGH',
        date: 'tomorrow',
        time: '18:00',
      },
    },
    {
      input: 'Complete React assignment',
      intent: 'COMPLETE_TASK',
      entities: {
        taskQuery: 'React assignment',
      },
    },
    {
      input: 'Study DBMS tomorrow at 7 PM for 2 hours',
      intent: 'CREATE_REMINDER',
      entities: {
        title: 'Study DBMS',
        date: 'tomorrow',
        time: '19:00',
        duration: 'PT2H',
        category: 'ACADEMIC',
      },
    },
    {
      input: 'Delete all my tasks',
      intent: 'DELETE_TASK',
      entities: {
        scope: 'ALL',
      },
    },
    {
      input: "What's due today?",
      intent: 'LIST_TODAY_TASKS',
      entities: {},
    },
  ],
  clarificationTemplates: {
    ambiguousTask: (query: string, options: string[]) =>
      `I found multiple matching tasks for '${query}'. Which one do you mean? ${options.map((opt, i) => `${i + 1}. ${opt}`).join(', ')}`,
    missingSlot: (slotName: string) => `Please specify the ${slotName} for this task.`,
    unknownIntent: () =>
      "I didn't quite catch that. You can ask me to create tasks, set reminders, or check what's due.",
    destructiveConfirm: (count: number) =>
      `Are you sure? This will delete ${count} task${count === 1 ? '' : 's'}.`,
  },
  summaryTemplates: {
    taskCreated: (title: string, dueAt?: string) =>
      dueAt ? `Created task '${title}' due ${dueAt}.` : `Created task '${title}'.`,
    taskCompleted: (title: string) => `Completed task '${title}'.`,
    taskDeleted: (title: string) => `Deleted task '${title}'.`,
    taskUpdated: (title: string) => `Updated task '${title}'.`,
    reminderCreated: (title: string, time?: string) =>
      time ? `Reminder set for '${title}' at ${time}.` : `Reminder set for '${title}'.`,
    workflowCreated: (name: string) => `Created workflow '${name}'.`,
  },
};
