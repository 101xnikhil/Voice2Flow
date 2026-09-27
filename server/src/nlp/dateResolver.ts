import * as chrono from 'chrono-node';
import { DateTime } from 'luxon';
import { RRule } from 'rrule';
import { Clock, defaultClock } from '../lib/clock.js';

export interface DateResolverInput {
  date?: string;
  time?: string;
  recurrence?: string;
  now?: Date;
  timezone?: string; // defaults to 'Asia/Kolkata'
  weekStartsOn?: number; // 1 = Monday (default per spec)
}

export interface DateResolverResult {
  instant?: string; // ISO 8601 in UTC
  isAllDay: boolean;
  rrule?: string;
  timezone: string;
  assumptions: string[];
}

interface ParsedTime {
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  assumption?: string;
}

const DAY_PART_HOURS: Record<string, { hour: number; label: string }> = {
  midnight: { hour: 23, label: '11:59 PM' },
  morning: { hour: 9, label: '9:00 AM' },
  afternoon: { hour: 14, label: '2:00 PM' },
  evening: { hour: 18, label: '6:00 PM' },
  night: { hour: 21, label: '9:00 PM' },
  noon: { hour: 12, label: '12:00 PM' },
  midday: { hour: 12, label: '12:00 PM' },
};

const DAY_CODE_MAP: Record<number, string> = {
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
  7: 'SU',
};

const WEEKDAY_MAP: Record<string, number> = {
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
  sunday: 7,
  sun: 7,
};

/**
 * Parses time-of-day string into hour and minute, applying spec §6.8 assumptions:
 * 1-6 -> PM, 7-11 -> AM, 12 -> PM when unspecified.
 */
export function parseTime(timeStr: string): ParsedTime | null {
  const trimmed = timeStr.trim().toLowerCase();

  // Check day parts first
  for (const [part, config] of Object.entries(DAY_PART_HOURS)) {
    if (trimmed.includes(part)) {
      if (part === 'midnight') {
        return {
          hour: 23,
          minute: 59,
          second: 59,
          millisecond: 999,
          assumption: 'Assumed midnight is 11:59 PM',
        };
      }
      return {
        hour: config.hour,
        minute: 0,
        second: 0,
        millisecond: 0,
        assumption: `Assumed ${part} is ${config.label}`,
      };
    }
  }

  // Regex for 12/24 hour time, e.g. "7", "7:30", "18:00", "7 pm", "7:30am"
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match || !match[1]) {
    // Try parsing with chrono
    const parsed = chrono.parseDate(`today at ${trimmed}`);
    if (parsed) {
      const dt = DateTime.fromJSDate(parsed);
      return {
        hour: dt.hour,
        minute: dt.minute,
        second: dt.second,
        millisecond: 0,
      };
    }
    return null;
  }

  const rawHour = parseInt(match[1], 10);
  const rawMinute = match[2] ? parseInt(match[2], 10) : 0;
  const rawSecond = match[3] ? parseInt(match[3], 10) : 0;
  const meridian = match[4]?.toLowerCase();

  if (rawHour < 0 || rawHour > 24 || rawMinute < 0 || rawMinute > 59) {
    return null;
  }

  if (meridian === 'am') {
    return {
      hour: rawHour === 12 ? 0 : rawHour,
      minute: rawMinute,
      second: rawSecond,
      millisecond: 0,
    };
  }

  if (meridian === 'pm') {
    return {
      hour: rawHour === 12 ? 12 : rawHour + 12,
      minute: rawMinute,
      second: rawSecond,
      millisecond: 0,
    };
  }

  // No AM/PM specified: apply spec §6.8 heuristic
  if (rawHour >= 13) {
    // Explicit 24-hour time
    return {
      hour: rawHour === 24 ? 0 : rawHour,
      minute: rawMinute,
      second: rawSecond,
      millisecond: 0,
    };
  }

  if (rawHour >= 1 && rawHour <= 6) {
    // 1-6 -> PM
    return {
      hour: rawHour + 12,
      minute: rawMinute,
      second: rawSecond,
      millisecond: 0,
      assumption: `Assumed ${rawHour} PM`,
    };
  }

  if (rawHour >= 7 && rawHour <= 11) {
    // 7-11 -> AM
    return {
      hour: rawHour,
      minute: rawMinute,
      second: rawSecond,
      millisecond: 0,
      assumption: `Assumed ${rawHour} AM`,
    };
  }

  if (rawHour === 12) {
    // 12 -> PM
    return {
      hour: 12,
      minute: rawMinute,
      second: rawSecond,
      millisecond: 0,
      assumption: 'Assumed 12 PM',
    };
  }

  // 0 -> midnight
  return {
    hour: 0,
    minute: rawMinute,
    second: rawSecond,
    millisecond: 0,
  };
}

/**
 * Parses recurrence expressions into standard iCalendar RRULE strings.
 */
export function parseRecurrence(expr: string): { rrule?: string; assumption?: string } {
  const norm = expr.trim().toLowerCase();

  if (/^(daily|every\s+day)$/.test(norm)) {
    return { rrule: 'RRULE:FREQ=DAILY' };
  }

  if (/^(every\s+weekday|weekdays|every\s+work\s*day)$/.test(norm)) {
    return { rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' };
  }

  if (/^(every\s+weekend|weekends)$/.test(norm)) {
    return { rrule: 'RRULE:FREQ=WEEKLY;BYDAY=SA,SU' };
  }

  if (/^(every\s+2\s+weeks|every\s+two\s+weeks|biweekly)$/.test(norm)) {
    return { rrule: 'RRULE:FREQ=WEEKLY;INTERVAL=2' };
  }

  if (/^(monthly|every\s+month)$/.test(norm)) {
    return { rrule: 'RRULE:FREQ=MONTHLY' };
  }

  if (/^(yearly|every\s+year|annually)$/.test(norm)) {
    return { rrule: 'RRULE:FREQ=YEARLY' };
  }

  const weekdayMatches = norm.match(/(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/gi);
  if (weekdayMatches && weekdayMatches.length > 0) {
    const codes = Array.from(
      new Set(
        weekdayMatches
          .map((m) => {
            const num = WEEKDAY_MAP[m.toLowerCase()];
            return num ? DAY_CODE_MAP[num] : undefined;
          })
          .filter((c): c is string => !!c)
      )
    );
    if (codes.length === 1) {
      return { rrule: `RRULE:FREQ=WEEKLY;BYDAY=${codes[0]}` };
    } else if (codes.length > 1) {
      return { rrule: `RRULE:FREQ=WEEKLY;BYDAY=${codes.join(',')}` };
    }
  }

  return {};
}

/**
 * Calculates the next occurrence of an RRULE using floating local time then Luxon conversion,
 * guaranteeing correct local hour across DST boundaries.
 */
export function calculateNextOccurrence(
  rruleStr: string,
  dtStart: Date,
  after: Date,
  timezone = 'Asia/Kolkata'
): Date | null {
  try {
    const cleanRule = rruleStr.replace(/^RRULE:/, '');
    const startLocal = DateTime.fromJSDate(dtStart, { zone: timezone });
    const afterLocal = DateTime.fromJSDate(after, { zone: timezone });

    // Floating local time representation as UTC
    const floatingStart = new Date(
      Date.UTC(
        startLocal.year,
        startLocal.month - 1,
        startLocal.day,
        startLocal.hour,
        startLocal.minute,
        startLocal.second
      )
    );

    const floatingAfter = new Date(
      Date.UTC(
        afterLocal.year,
        afterLocal.month - 1,
        afterLocal.day,
        afterLocal.hour,
        afterLocal.minute,
        afterLocal.second
      )
    );

    const rule = RRule.fromString(cleanRule);
    const options = { ...rule.origOptions, dtstart: floatingStart };
    const ruleInstance = new RRule(options);

    const nextFloating = ruleInstance.after(floatingAfter, true);
    if (!nextFloating) return null;

    // Convert back from floating local components to real instant in user timezone
    const resolvedLocal = DateTime.fromObject(
      {
        year: nextFloating.getUTCFullYear(),
        month: nextFloating.getUTCMonth() + 1,
        day: nextFloating.getUTCDate(),
        hour: nextFloating.getUTCHours(),
        minute: nextFloating.getUTCMinutes(),
        second: nextFloating.getUTCSeconds(),
      },
      { zone: timezone }
    );

    return resolvedLocal.toJSDate();
  } catch {
    return null;
  }
}

/**
 * Resolves a date/time/recurrence input deterministically into a UTC instant and metadata.
 */
export function resolveDate(
  input: DateResolverInput,
  clock: Clock = defaultClock
): DateResolverResult {
  const timezone = input.timezone || 'Asia/Kolkata';
  const now = input.now || clock.now();
  const assumptions: string[] = [];

  const nowLocal = DateTime.fromJSDate(now, { zone: timezone });
  if (!nowLocal.isValid) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  // 1. Recurrence
  let rrule: string | undefined;
  if (input.recurrence) {
    const recResult = parseRecurrence(input.recurrence);
    if (recResult.rrule) {
      rrule = recResult.rrule;
    }
    if (recResult.assumption) {
      assumptions.push(recResult.assumption);
    }
  }

  const rawDate = input.date?.trim();
  const rawTime = input.time?.trim();

  // If neither date nor time is given, return undated result (e.g. recurrence-only template)
  if (!rawDate && !rawTime) {
    return {
      instant: undefined,
      isAllDay: false,
      rrule,
      timezone,
      assumptions,
    };
  }

  let resolvedDateLocal: DateTime | null = null;
  let parsedTime: ParsedTime | null = null;

  // 2. Parse time if provided
  if (rawTime) {
    parsedTime = parseTime(rawTime);
    if (parsedTime?.assumption) {
      assumptions.push(parsedTime.assumption);
    }
  }

  // 3. Parse date
  if (rawDate) {
    const dateNorm = rawDate.toLowerCase();

    // Check relative time expressions like "in 2 hours", "in 30 minutes", "in 3 days"
    const inRelativeMatch = dateNorm.match(/^in\s+(\d+)\s+(hour|hr|minute|min|day|week|month)s?$/);
    if (inRelativeMatch && inRelativeMatch[1] && inRelativeMatch[2]) {
      const amount = parseInt(inRelativeMatch[1], 10);
      const unit = inRelativeMatch[2];
      if (unit.startsWith('hour') || unit === 'hr') {
        const target = nowLocal.plus({ hours: amount });
        return {
          instant: target.toUTC().toISO() ?? undefined,
          isAllDay: false,
          rrule,
          timezone,
          assumptions,
        };
      }
      if (unit.startsWith('min')) {
        const target = nowLocal.plus({ minutes: amount });
        return {
          instant: target.toUTC().toISO() ?? undefined,
          isAllDay: false,
          rrule,
          timezone,
          assumptions,
        };
      }
      if (unit === 'day') {
        resolvedDateLocal = nowLocal.plus({ days: amount });
      } else if (unit === 'week') {
        resolvedDateLocal = nowLocal.plus({ weeks: amount });
      } else if (unit === 'month') {
        resolvedDateLocal = nowLocal.plus({ months: amount });
      }
    }

    if (!resolvedDateLocal) {
      if (dateNorm === 'today') {
        resolvedDateLocal = nowLocal;
      } else if (dateNorm === 'tonight') {
        resolvedDateLocal = nowLocal;
        if (!parsedTime) {
          const tonightAssumption = 'Assumed night is 9:00 PM';
          parsedTime = {
            hour: 21,
            minute: 0,
            second: 0,
            millisecond: 0,
            assumption: tonightAssumption,
          };
          assumptions.push(tonightAssumption);
        }
      } else if (dateNorm === 'tomorrow') {
        resolvedDateLocal = nowLocal.plus({ days: 1 });
      } else if (dateNorm === 'day after tomorrow' || dateNorm === 'overmorrow') {
        resolvedDateLocal = nowLocal.plus({ days: 2 });
      } else if (/^end of\s+(the\s+)?week$/.test(dateNorm)) {
        // Spec: Monday week start default. End of week = Sunday 23:59
        let endOfWeek = nowLocal.endOf('week');
        if (nowLocal.weekday === 7 && nowLocal.hour >= 20) {
          // If already Sunday late, resolve to next week's Sunday
          endOfWeek = nowLocal.plus({ weeks: 1 }).endOf('week');
        }
        resolvedDateLocal = endOfWeek;
        assumptions.push('Assumed end of week is Sunday');
      } else {
        // Check weekday name with forward-date rule (§6.8)
        const weekdayMatch = dateNorm.match(/^(?:this\s+|next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)$/);
        if (weekdayMatch && weekdayMatch[1]) {
          const targetDayNum = WEEKDAY_MAP[weekdayMatch[1]];
          const isExplicitNext = dateNorm.startsWith('next ');
          const currentDayNum = nowLocal.weekday; // 1 = Mon ... 7 = Sun

          if (targetDayNum !== undefined) {
            if (isExplicitNext) {
              const daysToUpcoming = (targetDayNum - currentDayNum + 7) % 7 || 7;
              const daysAhead = daysToUpcoming + 7;
              resolvedDateLocal = nowLocal.plus({ days: daysAhead });
            } else {
              // Forward-date rule (§6.8): Friday said on Friday = next Friday (+7 days)
              if (targetDayNum === currentDayNum) {
                resolvedDateLocal = nowLocal.plus({ days: 7 });
                assumptions.push(`Resolved ${weekdayMatch[1]} forward to next week`);
              } else if (targetDayNum > currentDayNum) {
                resolvedDateLocal = nowLocal.plus({ days: targetDayNum - currentDayNum });
              } else {
                resolvedDateLocal = nowLocal.plus({ days: 7 - (currentDayNum - targetDayNum) });
              }
            }
          }
        }
      }
    }

    // If still not resolved, try chrono with reference date in user timezone
    if (!resolvedDateLocal) {
      const chronoRef = nowLocal.toJSDate();
      const parsedResults = chrono.parse(rawDate, chronoRef);
      if (parsedResults.length > 0 && parsedResults[0]) {
        const start = parsedResults[0].start;
        let candidate = DateTime.fromObject(
          {
            year: start.get('year') ?? nowLocal.year,
            month: start.get('month') ?? nowLocal.month,
            day: start.get('day') ?? nowLocal.day,
          },
          { zone: timezone }
        );

        // Yearless date roll-forward rule:
        // E.g. "25th March" said in October rolls forward to next year
        if (!start.isCertain('year') || candidate.year > nowLocal.year) {
          if (candidate.startOf('day') < nowLocal.startOf('day')) {
            candidate = candidate.plus({ years: 1 });
          }
          if (candidate.year > nowLocal.year) {
            assumptions.push(`Assumed year ${candidate.year}`);
          }
        }

        // If chrono extracted a time from the date string and we don't already have one
        if (!parsedTime && start.isCertain('hour')) {
          parsedTime = {
            hour: start.get('hour') ?? 0,
            minute: start.get('minute') ?? 0,
            second: start.get('second') ?? 0,
            millisecond: 0,
          };
        }

        resolvedDateLocal = candidate;
      }
    }
  }

  // 4. If only time was provided without a date (e.g. "at 5 PM")
  if (!resolvedDateLocal && parsedTime) {
    const todayCandidate = nowLocal.set({
      hour: parsedTime.hour,
      minute: parsedTime.minute,
      second: parsedTime.second,
      millisecond: parsedTime.millisecond,
    });

    if (todayCandidate > nowLocal) {
      resolvedDateLocal = nowLocal;
      assumptions.push('Assumed today');
    } else {
      resolvedDateLocal = nowLocal.plus({ days: 1 });
      assumptions.push('Assumed tomorrow');
    }
  }

  if (!resolvedDateLocal) {
    return {
      instant: undefined,
      isAllDay: false,
      rrule,
      timezone,
      assumptions,
    };
  }

  // 5. Finalize instant and all-day state
  if (parsedTime) {
    const finalDateTime = resolvedDateLocal.set({
      hour: parsedTime.hour,
      minute: parsedTime.minute,
      second: parsedTime.second,
      millisecond: parsedTime.millisecond,
    });
    return {
      instant: finalDateTime.toUTC().toISO() ?? undefined,
      isAllDay: false,
      rrule,
      timezone,
      assumptions,
    };
  } else {
    // Spec §6.8: Date without time -> isAllDay = true (due 23:59 in the user's timezone for overdue purposes)
    const endOfDay = resolvedDateLocal.set({
      hour: 23,
      minute: 59,
      second: 59,
      millisecond: 999,
    });
    return {
      instant: endOfDay.toUTC().toISO() ?? undefined,
      isAllDay: true,
      rrule,
      timezone,
      assumptions,
    };
  }
}
