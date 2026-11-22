// Event dates and times are what organisers type and what people read: a
// calendar date ("2026-07-12") and a wall-clock time ("20:00"), always in
// Indian Standard Time. From them we derive two real timestamps, startsAt and
// endsAt, so visibility and filtering never depend on the server's timezone.
//
// Overnight rule: if the daily end time is not after the start time (for
// example 20:00 to 06:00), the session runs past midnight and ends on the
// following morning. So a single-day event on 12 July from 8 PM to 6 AM
// starts at 12 Jul 20:00 and ends at 13 Jul 06:00 -- and stays listed for all
// of that window. For a multi-day event, the last session ends the morning
// after the final date.
const IST_OFFSET = '+05:30';
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// A real calendar date, not just a well-formed string ("2026-02-30" is rejected).
const isValidDateString = (value) => {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
};

const isValidTimeString = (value) => typeof value === 'string' && TIME_RE.test(value);

const addDays = (dateString, days) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const daysBetween = (fromDate, toDate) => {
  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const [ty, tm, td] = toDate.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS);
};

// "2026-07-12" for the given instant, as the calendar says in India.
const istDateString = (instant = new Date()) =>
  new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

const istInstant = (dateString, timeString = '00:00') => new Date(`${dateString}T${timeString}:00.000${IST_OFFSET}`);

// "HH:mm" strings sort correctly as text, so equal-or-earlier means overnight.
const isOvernight = (startTime, endTime) => endTime <= startTime;

const computeEventWindow = ({ startDate, endDate, timeMode, startTime, endTime }) => {
  const lastDate = endDate || startDate;
  if (timeMode === 'daily_hours') {
    return {
      startsAt: istInstant(startDate, startTime),
      endsAt: istInstant(isOvernight(startTime, endTime) ? addDays(lastDate, 1) : lastDate, endTime),
    };
  }
  // All day: from midnight at the start of the first day up to (not including)
  // midnight after the last day.
  return { startsAt: istInstant(startDate), endsAt: istInstant(addDays(lastDate, 1)) };
};

module.exports = {
  addDays,
  computeEventWindow,
  daysBetween,
  isOvernight,
  isValidDateString,
  isValidTimeString,
  istDateString,
  istInstant,
};
