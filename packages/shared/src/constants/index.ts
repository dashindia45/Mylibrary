/** Default token amount for booking (in paise) */
export const DEFAULT_TOKEN_AMOUNT_PAISE = 10000; // ₹100

/** Default hold duration in minutes */
export const DEFAULT_HOLD_DURATION_MINUTES = 10;

/** Default reservation window in hours */
export const DEFAULT_RESERVATION_WINDOW_HOURS = 48;

/** OTP length */
export const OTP_LENGTH = 6;

/** Default OTP expiry in seconds */
export const DEFAULT_OTP_EXPIRY_SECONDS = 300;

/** Fee reminder schedule (days relative to due date, negative = before) */
export const DEFAULT_FEE_REMINDER_SCHEDULE = [
  { dayOffset: -7, type: 'EARLY' as const },
  { dayOffset: -3, type: 'UPCOMING' as const },
  { dayOffset: -1, type: 'DUE_TOMORROW' as const },
  { dayOffset: 0, type: 'DUE_TODAY' as const },
  { dayOffset: 1, type: 'OVERDUE' as const },
] as const;

/** Recurring overdue reminder interval in days */
export const OVERDUE_REMINDER_INTERVAL_DAYS = 3;

/** Max overdue reminders */
export const MAX_OVERDUE_REMINDERS = 10;

/** Default shifts */
export const DEFAULT_SHIFTS = [
  { slot: 'FULL_DAY', name: 'Full Day', startTime: '07:00', endTime: '22:00' },
  { slot: 'MORNING', name: 'Morning Half Day', startTime: '07:00', endTime: '13:00' },
  { slot: 'EVENING', name: 'Evening Half Day', startTime: '14:00', endTime: '22:00' },
] as const;

/** Shift overlap rules: FULL_DAY conflicts with MORNING and EVENING */
export const SHIFT_CONFLICTS: Record<string, string[]> = {
  FULL_DAY: ['MORNING', 'EVENING', 'FULL_DAY'],
  MORNING: ['FULL_DAY', 'MORNING'],
  EVENING: ['FULL_DAY', 'EVENING'],
};

/** Currency */
export const CURRENCY = 'INR';

/** Grace period for check-in (minutes after shift starts) */
export const DEFAULT_CHECKIN_GRACE_MINUTES = 30;

/** Waitlist claim window (minutes) */
export const DEFAULT_WAITLIST_CLAIM_MINUTES = 15;

/** Cancellation deadline (hours before shift starts) */
export const DEFAULT_CANCELLATION_DEADLINE_HOURS = 2;
