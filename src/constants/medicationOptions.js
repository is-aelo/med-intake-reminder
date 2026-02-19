// src/constants/medicationOptions.js
import { Frequency } from '../models/Schemas';

// ─────────────────────────────────────────────
// UNITS & CATEGORIES
// ─────────────────────────────────────────────

export const UNITS = [
  'mg', 'mcg', 'g', 'ml', 'IU',
  'Drops', 'Puffs', 'Pills', 'Capsules', 'Sachets', 'Units',
];

export const CATEGORIES = [
  'Tablet', 'Capsule', 'Liquid/Syrup', 'Injection', 'Cream/Ointment',
  'Inhaler', 'Drops', 'Spray', 'Patch', 'Suppository', 'Powder',
];

// ─────────────────────────────────────────────
// INTERVAL OPTIONS
// ─────────────────────────────────────────────

export const HOURLY_OPTIONS = ['1', '2', '3', '4', '6', '8', '12', '24'];
export const DAY_OPTIONS    = ['1', '2', '3', '4', '5', '6', '7', '14', '30'];

// ─────────────────────────────────────────────
// DEFAULT FORM STATE
// ─────────────────────────────────────────────

export const DEFAULT_TIME = { hour: 8, minute: 0 };

export const defaultForm = {
  name: '',
  dosage: '',
  unit: 'mg',
  category: 'Tablet',
  instructions: '',
  isPermanent: true,
  duration: '7',
  frequency: 'daily',
  intervalValue: '8',
  startDate: new Date(),
  isInventoryEnabled: false,
  stock: '0',
  reorderLevel: '5',
  isAdjustable: false,
  times: [DEFAULT_TIME],
};

// ─────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────

/** Converts a { hour, minute } slot to a Date object (today at that time). */
export const slotToDate = ({ hour, minute }) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
};

/**
 * Generates one full 24h cycle of dose slots starting from (startHour, startMinute),
 * repeating every intervalHours. Each slot includes a `daysOffset` (0 or 1) to
 * indicate whether it fires today or wraps into the next calendar day.
 *
 * IMPORTANT: totalSlots = Math.floor(24 / intervalHours) — one cycle only.
 * e.g. every 8h → 3 slots, every 12h → 2 slots, every 6h → 4 slots.
 *
 * daysOffset is NEVER > 1 — this is a single repeating cycle, not a multi-day expansion.
 *
 * Examples (start 16:00, every 12h):
 *   → { hour: 16, minute: 0, daysOffset: 0 }  — today,    4:00 PM
 *   → { hour:  4, minute: 0, daysOffset: 1 }  — tomorrow, 4:00 AM
 *
 * Examples (start 08:00, every 8h):
 *   → { hour:  8, minute: 0, daysOffset: 0 }  — today,    8:00 AM
 *   → { hour: 16, minute: 0, daysOffset: 0 }  — today,    4:00 PM
 *   → { hour:  0, minute: 0, daysOffset: 1 }  — tomorrow, 12:00 AM
 */
export const generateHourlySlots = (startHour, startMinute, intervalHours) => {
  if (!intervalHours || intervalHours <= 0) return [];

  const startMinutes    = startHour * 60 + startMinute;
  const intervalMinutes = intervalHours * 60;
  const minutesInDay    = 24 * 60; // 1440

  // e.g. every 8h → 3 slots, every 12h → 2 slots, every 6h → 4 slots
  const totalSlots = Math.floor(24 / intervalHours);

  return Array.from({ length: totalSlots }, (_, i) => {
    const totalMinutes = startMinutes + i * intervalMinutes;
    return {
      hour:       Math.floor(totalMinutes / 60) % 24,
      minute:     totalMinutes % 60,
      // 0 = fires today, 1 = wraps into tomorrow (never higher)
      daysOffset: Math.floor(totalMinutes / minutesInDay),
    };
  });
};

/**
 * Returns only today's slots (daysOffset === 0) from the full cycle.
 * Use this when saving to Realm or scheduling notifications.
 */
export const getTodaySlots = (startHour, startMinute, intervalHours) =>
  generateHourlySlots(startHour, startMinute, intervalHours).filter(
    (s) => s.daysOffset === 0,
  );

export const computeEndDate = (startDate, duration, isPermanent) => {
  if (isPermanent) return null;
  const end = new Date(startDate);
  end.setDate(end.getDate() + (parseInt(duration) || 7));
  return end;
};

export const toFrequencyConstant = (formFrequency) => {
  switch (formFrequency) {
    case 'hourly':   return Frequency.EVERY_X_HOURS;
    case 'interval': return Frequency.SPECIFIC_DAYS;
    default:         return Frequency.DAILY;
  }
};

export const fromFrequencyConstant = (schemaFrequency) => {
  switch (schemaFrequency) {
    case Frequency.EVERY_X_HOURS: return 'hourly';
    case Frequency.SPECIFIC_DAYS: return 'interval';
    default:                      return 'daily';
  }
};

// ─────────────────────────────────────────────
// FORMATTING HELPERS
// ─────────────────────────────────────────────

export const formatTime = (date) => {
  if (!date) return '--:--';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

export const formatDate = (date) => {
  if (!date) return '--/--/--';
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Formats a slot's time with an optional next-day date label.
 *
 * - daysOffset === 0 → "4:00 PM"
 * - daysOffset  >  0 → "4:00 AM · Feb 20"
 *
 * @param {{ hour: number, minute: number, daysOffset?: number }} slot
 * @param {Date} startDate - The medication's start date
 */
export const formatSlotLabel = (slot, startDate) => {
  const d = new Date();
  d.setHours(slot.hour, slot.minute, 0, 0);
  const timeStr = formatTime(d);

  const offset = slot.daysOffset ?? 0;
  if (offset === 0) return timeStr;

  const slotDate = new Date(startDate ?? new Date());
  slotDate.setDate(slotDate.getDate() + offset);
  const dateStr = slotDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return `${timeStr} · ${dateStr}`;
};

// ─────────────────────────────────────────────
// TIME VALIDATION HELPERS
// ─────────────────────────────────────────────

export const isSlotPassedToday = (slot, referenceDate) => {
  const now = new Date();
  const ref = new Date(referenceDate);
  const isToday =
    ref.getFullYear() === now.getFullYear() &&
    ref.getMonth()    === now.getMonth()    &&
    ref.getDate()     === now.getDate();
  if (!isToday) return false;
  return (slot.hour * 60 + slot.minute) <= (now.getHours() * 60 + now.getMinutes());
};

export const hasAnyPassedSlot = (times, startDate) =>
  times.some((slot) => isSlotPassedToday(slot, startDate));

export const getPassedSlotLabel = (slot, startDate) =>
  isSlotPassedToday(slot, startDate) ? ' (tomorrow)' : '';

// ─────────────────────────────────────────────
// SCHEDULE SUMMARY
// ─────────────────────────────────────────────

/**
 * Builds a human-readable summary of the medication schedule.
 *
 * For hourly mode, `schedules` should be the today-only slots (daysOffset === 0)
 * so the dose count and times reflect what actually fires today.
 */
export const getScheduleSummary = (form) => {
  const { frequency, intervalValue, isPermanent, duration, category, startDate, schedules = [] } = form;

  // For hourly, only count today's slots for an accurate "X doses today" figure
  const todaySchedules = frequency === 'hourly'
    ? schedules.filter((s) => (s.daysOffset ?? 0) === 0)
    : schedules;

  const formatSlotList = (slots) => {
    if (!slots?.length) return '';
    const timeStrings = slots
      .slice()
      .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))
      .map((s) => { const d = new Date(); d.setHours(s.hour, s.minute, 0, 0); return formatTime(d); });
    if (timeStrings.length === 1) return `at ${timeStrings[0]}`;
    const last = timeStrings.pop();
    return `at ${timeStrings.join(', ')} and ${last}`;
  };

  const timesPart = formatSlotList(todaySchedules);
  let text = `Take ${category?.toLowerCase() ?? 'medication'} `;

  if (frequency === 'daily') {
    text += `every day${timesPart ? ` ${timesPart}` : ''}`;
  } else if (frequency === 'hourly') {
    const interval = parseInt(intervalValue) || 8;
    text += `every ${interval} hour${interval === 1 ? '' : 's'}`;
    if (todaySchedules.length > 0) {
      text += ` (${todaySchedules.length} dose${todaySchedules.length === 1 ? '' : 's'} today`;
      if (timesPart) text += `, ${timesPart}`;
      text += ')';
    }
  } else if (frequency === 'interval') {
    const days = parseInt(intervalValue) || 1;
    text += `every ${days} ${days === 1 ? 'day' : 'days'}${timesPart ? ` ${timesPart}` : ''}`;
  }

  text += `, starting ${formatDate(startDate)}`;
  text += !isPermanent && duration ? ` for a ${duration}-day course.` : ' as a maintenance medication.';

  return text;
};

// ─────────────────────────────────────────────
// INTERVAL FILTER
// ─────────────────────────────────────────────

/**
 * Filters DAY_OPTIONS to only show intervals that fit within
 * the treatment duration (no point showing "every 14 days" for a 7-day course).
 */
export const getFilteredDayOptions = (maxDays) => {
  const limit = parseInt(maxDays) || 1;
  return DAY_OPTIONS.filter((opt) => parseInt(opt) <= limit);
};