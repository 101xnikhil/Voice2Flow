import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import {
  resolveDate,
  parseTime,
  parseRecurrence,
  calculateNextOccurrence,
} from '../nlp/dateResolver.js';
import { FixedClock } from '../lib/clock.js';

describe('DateResolver Unit Tests', () => {
  // Reference date: Friday, Oct 2, 2026, 10:00 AM IST
  const refDateIST = DateTime.fromISO('2026-10-02T10:00:00', { zone: 'Asia/Kolkata' }).toJSDate();
  const clockIST = new FixedClock(refDateIST);

  describe('parseTime()', () => {
    it('1. parses 24-hour time "18:00"', () => {
      const res = parseTime('18:00');
      expect(res).toEqual({ hour: 18, minute: 0, second: 0, millisecond: 0 });
    });

    it('2. parses explicit 12-hour time "6:30 pm"', () => {
      const res = parseTime('6:30 pm');
      expect(res).toEqual({ hour: 18, minute: 30, second: 0, millisecond: 0 });
    });

    it('3. parses explicit 12-hour time "9:15 am"', () => {
      const res = parseTime('9:15 am');
      expect(res).toEqual({ hour: 9, minute: 15, second: 0, millisecond: 0 });
    });

    it('4. assumes PM for 1..6 when meridian is omitted (spec §6.8): "6" -> 18:00', () => {
      const res = parseTime('6');
      expect(res?.hour).toBe(18);
      expect(res?.assumption).toBe('Assumed 6 PM');
    });

    it('5. assumes PM for 1..6: "3:30" -> 15:30', () => {
      const res = parseTime('3:30');
      expect(res?.hour).toBe(15);
      expect(res?.minute).toBe(30);
      expect(res?.assumption).toBe('Assumed 3 PM');
    });

    it('6. assumes AM for 7..11 when meridian is omitted: "7" -> 07:00', () => {
      const res = parseTime('7');
      expect(res?.hour).toBe(7);
      expect(res?.assumption).toBe('Assumed 7 AM');
    });

    it('7. assumes AM for 7..11: "11:45" -> 11:45', () => {
      const res = parseTime('11:45');
      expect(res?.hour).toBe(11);
      expect(res?.minute).toBe(45);
      expect(res?.assumption).toBe('Assumed 11 AM');
    });

    it('8. assumes PM for 12: "12:00" -> 12:00 PM', () => {
      const res = parseTime('12:00');
      expect(res?.hour).toBe(12);
      expect(res?.assumption).toBe('Assumed 12 PM');
    });

    it('9. parses day part "morning" -> 09:00', () => {
      const res = parseTime('morning');
      expect(res?.hour).toBe(9);
      expect(res?.assumption).toBe('Assumed morning is 9:00 AM');
    });

    it('10. parses day part "afternoon" -> 14:00', () => {
      const res = parseTime('afternoon');
      expect(res?.hour).toBe(14);
      expect(res?.assumption).toBe('Assumed afternoon is 2:00 PM');
    });

    it('11. parses day part "evening" -> 18:00', () => {
      const res = parseTime('evening');
      expect(res?.hour).toBe(18);
      expect(res?.assumption).toBe('Assumed evening is 6:00 PM');
    });

    it('12. parses day part "night" -> 21:00', () => {
      const res = parseTime('night');
      expect(res?.hour).toBe(21);
      expect(res?.assumption).toBe('Assumed night is 9:00 PM');
    });

    it('13. parses day part "noon" -> 12:00', () => {
      const res = parseTime('noon');
      expect(res?.hour).toBe(12);
    });

    it('14. parses day part "midnight" -> 23:59', () => {
      const res = parseTime('midnight');
      expect(res?.hour).toBe(23);
      expect(res?.minute).toBe(59);
    });
  });

  describe('parseRecurrence()', () => {
    it('15. parses "daily"', () => {
      expect(parseRecurrence('daily')).toEqual({ rrule: 'RRULE:FREQ=DAILY' });
    });

    it('16. parses "every weekday"', () => {
      expect(parseRecurrence('every weekday')).toEqual({
        rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      });
    });

    it('17. parses "every monday"', () => {
      expect(parseRecurrence('every monday')).toEqual({ rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO' });
    });

    it('18. parses "every 2 weeks"', () => {
      expect(parseRecurrence('every 2 weeks')).toEqual({ rrule: 'RRULE:FREQ=WEEKLY;INTERVAL=2' });
    });

    it('19. parses "monthly"', () => {
      expect(parseRecurrence('monthly')).toEqual({ rrule: 'RRULE:FREQ=MONTHLY' });
    });

    it('20. parses "yearly"', () => {
      expect(parseRecurrence('yearly')).toEqual({ rrule: 'RRULE:FREQ=YEARLY' });
    });

    it('21. parses "every monday and wednesday"', () => {
      expect(parseRecurrence('every monday and wednesday')).toEqual({
        rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE',
      });
    });
  });

  describe('resolveDate() with Forward-Date Rule and Timings', () => {
    it('22. resolves "today" with no time as allDay due at 23:59:59.999 local (IST)', () => {
      const res = resolveDate({ date: 'today', timezone: 'Asia/Kolkata' }, clockIST);
      expect(res.isAllDay).toBe(true);
      expect(res.timezone).toBe('Asia/Kolkata');
      // 2026-10-02 23:59:59.999 IST = 2026-10-02 18:29:59.999 UTC
      const dt = DateTime.fromISO(res.instant!);
      expect(dt.setZone('Asia/Kolkata').day).toBe(2);
      expect(dt.setZone('Asia/Kolkata').hour).toBe(23);
      expect(dt.setZone('Asia/Kolkata').minute).toBe(59);
    });

    it('23. resolves "tomorrow" with time "18:00"', () => {
      const res = resolveDate(
        { date: 'tomorrow', time: '18:00', timezone: 'Asia/Kolkata' },
        clockIST
      );
      expect(res.isAllDay).toBe(false);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.day).toBe(3);
      expect(dt.hour).toBe(18);
      expect(dt.minute).toBe(0);
    });

    it('24. resolves "day after tomorrow"', () => {
      const res = resolveDate({ date: 'day after tomorrow', timezone: 'Asia/Kolkata' }, clockIST);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.day).toBe(4);
    });

    it('25. forward-date rule (§6.8): "Friday" said on Friday Oct 2 resolves to next Friday Oct 9', () => {
      const res = resolveDate({ date: 'friday', timezone: 'Asia/Kolkata' }, clockIST);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.day).toBe(9);
      expect(dt.month).toBe(10);
      expect(res.assumptions).toContain('Resolved friday forward to next week');
    });

    it('26. resolves upcoming weekday "Monday" from Friday Oct 2 to Monday Oct 5', () => {
      const res = resolveDate({ date: 'monday', timezone: 'Asia/Kolkata' }, clockIST);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.day).toBe(5);
      expect(dt.month).toBe(10);
      expect(dt.weekday).toBe(1);
    });

    it('27. resolves explicit "next Monday" from Friday Oct 2 to Monday Oct 12', () => {
      const res = resolveDate({ date: 'next monday', timezone: 'Asia/Kolkata' }, clockIST);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.day).toBe(12);
      expect(dt.weekday).toBe(1);
    });

    it('28. resolves "end of week" (Monday start -> Sunday Oct 4)', () => {
      const res = resolveDate({ date: 'end of week', timezone: 'Asia/Kolkata' }, clockIST);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.day).toBe(4);
      expect(dt.weekday).toBe(7);
      expect(res.assumptions).toContain('Assumed end of week is Sunday');
    });

    it('29. resolves relative duration "in 2 hours"', () => {
      const res = resolveDate({ date: 'in 2 hours', timezone: 'Asia/Kolkata' }, clockIST);
      expect(res.isAllDay).toBe(false);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.hour).toBe(12); // 10:00 + 2 = 12:00
      expect(dt.minute).toBe(0);
    });

    it('30. resolves relative duration "in 45 minutes"', () => {
      const res = resolveDate({ date: 'in 45 minutes', timezone: 'Asia/Kolkata' }, clockIST);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.hour).toBe(10);
      expect(dt.minute).toBe(45);
    });

    it('31. resolves relative duration "in 3 days"', () => {
      const res = resolveDate({ date: 'in 3 days', timezone: 'Asia/Kolkata' }, clockIST);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.day).toBe(5);
    });

    it('32. resolves "tonight" with default 9:00 PM assumption', () => {
      const res = resolveDate({ date: 'tonight', timezone: 'Asia/Kolkata' }, clockIST);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.day).toBe(2);
      expect(dt.hour).toBe(21);
      expect(res.assumptions).toContain('Assumed night is 9:00 PM');
    });

    it('33. resolves time only "at 5 PM" (future today -> today)', () => {
      const res = resolveDate({ time: '5 pm', timezone: 'Asia/Kolkata' }, clockIST);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.day).toBe(2);
      expect(dt.hour).toBe(17);
      expect(res.assumptions).toContain('Assumed today');
    });

    it('34. resolves time only "at 8 AM" (past today at 10 AM -> tomorrow)', () => {
      const res = resolveDate({ time: '8 am', timezone: 'Asia/Kolkata' }, clockIST);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.day).toBe(3);
      expect(dt.hour).toBe(8);
      expect(res.assumptions).toContain('Assumed tomorrow');
    });

    it('35. rolls forward yearless past date "25th March" (said in Oct -> next year)', () => {
      const res = resolveDate({ date: '25th March', timezone: 'Asia/Kolkata' }, clockIST);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.day).toBe(25);
      expect(dt.month).toBe(3);
      expect(dt.year).toBe(2027);
      expect(res.assumptions).toContain('Assumed year 2027');
    });

    it('36. respects explicit year in date "2026-12-25"', () => {
      const res = resolveDate({ date: '2026-12-25', timezone: 'Asia/Kolkata' }, clockIST);
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.day).toBe(25);
      expect(dt.month).toBe(12);
      expect(dt.year).toBe(2026);
    });

    it('37. records assumption for 1..6 hour inference: "tomorrow at 5"', () => {
      const res = resolveDate(
        { date: 'tomorrow', time: '5', timezone: 'Asia/Kolkata' },
        clockIST
      );
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.hour).toBe(17);
      expect(res.assumptions).toContain('Assumed 5 PM');
    });

    it('38. records assumption for 7..11 hour inference: "tomorrow at 8"', () => {
      const res = resolveDate(
        { date: 'tomorrow', time: '8', timezone: 'Asia/Kolkata' },
        clockIST
      );
      const dt = DateTime.fromISO(res.instant!).setZone('Asia/Kolkata');
      expect(dt.hour).toBe(8);
      expect(res.assumptions).toContain('Assumed 8 AM');
    });

    it('39. returns undefined instant when neither date nor time provided (recurrence only)', () => {
      const res = resolveDate({ recurrence: 'every monday', timezone: 'Asia/Kolkata' }, clockIST);
      expect(res.instant).toBeUndefined();
      expect(res.rrule).toBe('RRULE:FREQ=WEEKLY;BYDAY=MO');
    });
  });

  describe('DST Handling in America/New_York vs Asia/Kolkata', () => {
    // US DST 2026: Clocks spring forward Sunday, March 8, 2026 at 2 AM
    it('40. preserves 9:00 AM local time across DST spring forward in America/New_York', () => {
      const startNY = DateTime.fromISO('2026-03-07T09:00:00', { zone: 'America/New_York' });
      const rrule = 'RRULE:FREQ=DAILY';

      // Occurrence 1: March 7 (EST, UTC-5)
      const after1 = DateTime.fromISO('2026-03-06T23:59:59', { zone: 'America/New_York' }).toJSDate();
      const next1 = calculateNextOccurrence(rrule, startNY.toJSDate(), after1, 'America/New_York');
      expect(next1).not.toBeNull();
      const occ1 = DateTime.fromJSDate(next1!, { zone: 'America/New_York' });
      expect(occ1.day).toBe(7);
      expect(occ1.hour).toBe(9);
      expect(occ1.offsetNameShort).toBe('EST'); // UTC-5 -> 14:00 UTC
      expect(occ1.toUTC().hour).toBe(14);

      // Occurrence 2: March 8 (EDT, UTC-4, post-DST jump)
      const after2 = DateTime.fromISO('2026-03-07T10:00:00', { zone: 'America/New_York' }).toJSDate();
      const next2 = calculateNextOccurrence(rrule, startNY.toJSDate(), after2, 'America/New_York');
      expect(next2).not.toBeNull();
      const occ2 = DateTime.fromJSDate(next2!, { zone: 'America/New_York' });
      expect(occ2.day).toBe(8);
      expect(occ2.hour).toBe(9);
      expect(occ2.offsetNameShort).toBe('EDT'); // UTC-4 -> 13:00 UTC
      expect(occ2.toUTC().hour).toBe(13);

      // Occurrence 3: March 9 (EDT, UTC-4)
      const after3 = DateTime.fromISO('2026-03-08T10:00:00', { zone: 'America/New_York' }).toJSDate();
      const next3 = calculateNextOccurrence(rrule, startNY.toJSDate(), after3, 'America/New_York');
      const occ3 = DateTime.fromJSDate(next3!, { zone: 'America/New_York' });
      expect(occ3.day).toBe(9);
      expect(occ3.hour).toBe(9);
      expect(occ3.offsetNameShort).toBe('EDT');
      expect(occ3.toUTC().hour).toBe(13);
    });

    it('41. handles fixed offset in Asia/Kolkata without DST shifts', () => {
      const startIST = DateTime.fromISO('2026-03-07T09:00:00', { zone: 'Asia/Kolkata' });
      const rrule = 'RRULE:FREQ=DAILY';
      const after = DateTime.fromISO('2026-03-07T10:00:00', { zone: 'Asia/Kolkata' }).toJSDate();
      const next = calculateNextOccurrence(rrule, startIST.toJSDate(), after, 'Asia/Kolkata');
      const occ = DateTime.fromJSDate(next!, { zone: 'Asia/Kolkata' });
      expect(occ.day).toBe(8);
      expect(occ.hour).toBe(9);
      expect(occ.offsetNameShort).toBe('GMT+5:30');
    });

    it('42. throws on invalid timezone in resolveDate', () => {
      expect(() =>
        resolveDate({ date: 'tomorrow', timezone: 'Invalid/Timezone' }, clockIST)
      ).toThrow(/Invalid timezone/);
    });
  });
});
