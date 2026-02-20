// Shift Management Types

// =============================================
// SHIFT TYPES
// =============================================

export interface Shift {
  id: string;
  staff_id: string;
  location_id: string;
  start_time: string; // ISO 8601 timestamp
  end_time: string;   // ISO 8601 timestamp
  recurrence_rule: string | null;
  is_recurring: boolean;
  parent_shift_id: string | null;
  exception_date: string | null; // ISO 8601 date
  priority: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftWithDetails extends Shift {
  staff_first_name: string;
  staff_last_name: string;
  staff_email: string;
  location_name: string;
  location_address: string;
  services: ShiftServiceAssignment[];
}

export interface ShiftServiceAssignment {
  id: string;
  service_id: string;
  service_name: string;
  max_concurrent_bookings: number | null;
}

// =============================================
// SHIFT SERVICE TYPES
// =============================================

export interface ShiftService {
  id: string;
  shift_id: string;
  service_id: string;
  max_concurrent_bookings: number | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// BLACKOUT PERIOD TYPES
// =============================================

export interface BlackoutPeriod {
  id: string;
  location_id: string | null;
  staff_id: string | null;
  start_date: string; // ISO 8601 timestamp
  end_date: string;   // ISO 8601 timestamp
  reason: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SitewideBreak {
  id: string;
  name: string;
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  is_recurring: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftBreak {
  id: string;
  shift_id: string;
  sitewide_break_id: string | null;
  name: string;
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
  created_at: string;
  updated_at: string;
}

export interface StaffRecurringBreak {
  id: string;
  staff_id: string;
  start_time: string; // HH:mm:ss
  end_time: string;   // HH:mm:ss
  day_of_week: number | null; // 0-6 or NULL for everyday
  created_at: string;
  updated_at: string;
}

// =============================================
// REQUEST/RESPONSE TYPES
// =============================================

export interface CreateShiftRequest {
  staff_id: string;
  location_id: string;
  start_time: string;
  end_time: string;
  recurrence_rule?: string | null;
  is_recurring?: boolean;
  priority?: number;
  notes?: string | null;
  service_ids: string[]; // Services to assign to this shift
  max_concurrent_bookings?: { [service_id: string]: number | null }; // Per-service booking limits
}

export interface UpdateShiftRequest {
  staff_id?: string;
  location_id?: string;
  start_time?: string;
  end_time?: string;
  recurrence_rule?: string | null;
  is_recurring?: boolean;
  priority?: number;
  notes?: string | null;
  is_active?: boolean;
  service_ids?: string[]; // Services to assign to this shift
  max_concurrent_bookings?: { [service_id: string]: number | null };
}

export interface CreateBlackoutPeriodRequest {
  location_id?: string | null;
  staff_id?: string | null;
  start_date: string;
  end_date: string;
  reason: string;
  description?: string | null;
}

export interface UpdateBlackoutPeriodRequest {
  location_id?: string | null;
  staff_id?: string | null;
  start_date?: string;
  end_date?: string;
  reason?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface CreateSitewideBreakRequest {
  name: string;
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  start_date?: string | null; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  is_recurring?: boolean;
}

export interface UpdateSitewideBreakRequest {
  name?: string;
  start_time?: string; // HH:mm:ss
  end_time?: string; // HH:mm:ss
  start_date?: string | null; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  is_recurring?: boolean;
  is_active?: boolean;
}

export interface CreateShiftBreakRequest {
  shift_id: string;
  sitewide_break_id?: string | null;
  name: string;
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
}

export interface UpdateShiftBreakRequest {
  name?: string;
  start_time?: string; // ISO timestamp
  end_time?: string; // ISO timestamp
}

// =============================================
// SEARCH/FILTER PARAMS
// =============================================

export interface ShiftSearchParams {
  page?: number;
  limit?: number;
  staff_id?: string;
  location_id?: string;
  service_id?: string;
  start_date?: string; // ISO 8601 date
  end_date?: string;   // ISO 8601 date
  is_recurring?: boolean;
  active_only?: boolean;
}

export interface BlackoutPeriodSearchParams {
  page?: number;
  limit?: number;
  location_id?: string | null;
  staff_id?: string | null;
  start_date?: string;
  end_date?: string;
  active_only?: boolean;
}

// =============================================
// API RESPONSE TYPES
// =============================================

export interface ShiftResponse {
  success: boolean;
  data?: Shift;
  error?: string;
}

export interface ShiftsResponse {
  success: boolean;
  data?: Shift[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export interface ShiftWithDetailsResponse {
  success: boolean;
  data?: ShiftWithDetails;
  error?: string;
}

export interface ShiftsWithDetailsResponse {
  success: boolean;
  data?: ShiftWithDetails[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export interface BlackoutPeriodResponse {
  success: boolean;
  data?: BlackoutPeriod;
  error?: string;
}

export interface BlackoutPeriodsResponse {
  success: boolean;
  data?: BlackoutPeriod[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export interface SitewideBreaksResponse {
  success: boolean;
  data?: SitewideBreak[];
  error?: string;
}

export interface ShiftBreaksResponse {
  success: boolean;
  data?: ShiftBreak[];
  error?: string;
}

// =============================================
// CALENDAR EVENT TYPES (for big-calendar integration)
// =============================================

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  color: "blue" | "green" | "red" | "yellow" | "purple" | "orange";
  user: {
    id: string;
    name: string;
  };
  // Additional metadata
  metadata?: {
    shift_id: string;
    location_id: string;
    location_name: string;
    services: string[]; // Service names
    is_recurring: boolean;
    recurrence_rule?: string | null;
  };
}

// =============================================
// SHIFT CONFLICT TYPES
// =============================================

export interface ShiftConflict {
  type: 'staff_overlap' | 'blackout_period';
  message: string;
  conflicting_shift?: Shift;
  blackout_period?: BlackoutPeriod;
}

export interface ShiftValidationResult {
  valid: boolean;
  conflicts: ShiftConflict[];
}

// =============================================
// UTILITY TYPES
// =============================================

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurrenceOptions {
  frequency: RecurrenceFrequency;
  interval?: number; // Every N days/weeks/months/years
  daysOfWeek?: ('MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU')[];
  until?: string; // ISO 8601 date
  count?: number; // Number of occurrences
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Convert a Shift to a CalendarEvent for big-calendar
 */
export function shiftToCalendarEvent(
  shift: ShiftWithDetails,
  colorMap?: { [key: string]: CalendarEvent['color'] }
): CalendarEvent {
  const defaultColor: CalendarEvent['color'] = 'blue';
  const color = colorMap?.[shift.location_id] || defaultColor;
  
  return {
    id: shift.id,
    title: `${shift.staff_first_name} ${shift.staff_last_name} - ${shift.location_name}`,
    description: shift.services.map(s => s.service_name).join(', '),
    startDate: shift.start_time,
    endDate: shift.end_time,
    color: color,
    user: {
      id: shift.staff_id,
      name: `${shift.staff_first_name} ${shift.staff_last_name}`,
    },
    metadata: {
      shift_id: shift.id,
      location_id: shift.location_id,
      location_name: shift.location_name,
      services: shift.services.map(s => s.service_name),
      is_recurring: shift.is_recurring,
      recurrence_rule: shift.recurrence_rule,
    },
  };
}

/**
 * Build an RRULE string from recurrence options
 */
export function buildRecurrenceRule(options: RecurrenceOptions): string {
  const parts: string[] = [`FREQ=${options.frequency}`];
  
  if (options.interval && options.interval > 1) {
    parts.push(`INTERVAL=${options.interval}`);
  }
  
  if (options.daysOfWeek && options.daysOfWeek.length > 0) {
    parts.push(`BYDAY=${options.daysOfWeek.join(',')}`);
  }
  
  if (options.until) {
    // Convert ISO date to RRULE format (YYYYMMDDTHHMMSSZ)
    const date = new Date(options.until);
    const rruleDate = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    parts.push(`UNTIL=${rruleDate}`);
  }
  
  if (options.count) {
    parts.push(`COUNT=${options.count}`);
  }
  
  return parts.join(';');
}

/**
 * Parse an RRULE string into RecurrenceOptions
 */
export function parseRecurrenceRule(rrule: string): RecurrenceOptions | null {
  if (!rrule) return null;
  
  const parts = rrule.split(';');
  const options: Partial<RecurrenceOptions> = {};
  
  for (const part of parts) {
    const [key, value] = part.split('=');
    
    switch (key) {
      case 'FREQ':
        options.frequency = value as RecurrenceFrequency;
        break;
      case 'INTERVAL':
        options.interval = parseInt(value, 10);
        break;
      case 'BYDAY':
        options.daysOfWeek = value.split(',') as RecurrenceOptions['daysOfWeek'];
        break;
      case 'UNTIL':
        // Convert RRULE format to ISO date
        const year = value.substring(0, 4);
        const month = value.substring(4, 6);
        const day = value.substring(6, 8);
        options.until = `${year}-${month}-${day}`;
        break;
      case 'COUNT':
        options.count = parseInt(value, 10);
        break;
    }
  }
  
  return options.frequency ? (options as RecurrenceOptions) : null;
}

/**
 * Check if a shift overlaps with another shift
 */
export function shiftsOverlap(shift1: Shift, shift2: Shift): boolean {
  const start1 = new Date(shift1.start_time);
  const end1 = new Date(shift1.end_time);
  const start2 = new Date(shift2.start_time);
  const end2 = new Date(shift2.end_time);
  
  return start1 < end2 && start2 < end1;
}

/**
 * Format shift time for display
 */
export function formatShiftTime(shift: Shift): string {
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  
  const dateOptions: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  };
  const timeOptions: Intl.DateTimeFormatOptions = { 
    hour: 'numeric', 
    minute: '2-digit' 
  };
  
  const dateStr = start.toLocaleDateString('en-US', dateOptions);
  const startTime = start.toLocaleTimeString('en-US', timeOptions);
  const endTime = end.toLocaleTimeString('en-US', timeOptions);
  
  return `${dateStr}, ${startTime} - ${endTime}`;
}

