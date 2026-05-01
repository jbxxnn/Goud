"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import type { Dispatch, SetStateAction } from "react";
import type { IEvent, IUser, ILocation, IDayNote } from "@/calendar/interfaces";
import type { TBadgeVariant, TVisibleHours, TWorkingHours } from "@/calendar/types";

interface ICalendarContext {
  selectedDate: Date;
  setSelectedDate: (date: Date | undefined) => void;
  selectedUserId: IUser["id"] | "all";
  setSelectedUserId: (userId: IUser["id"] | "all") => void;
  selectedLocationId: string | "all";
  setSelectedLocationId: (locationId: string | "all") => void;
  badgeVariant: TBadgeVariant;
  setBadgeVariant: (variant: TBadgeVariant) => Promise<void>;
  users: IUser[];
  locations?: ILocation[];
  workingHours: TWorkingHours;
  setWorkingHours: (hours: TWorkingHours) => Promise<void>;
  visibleHours: TVisibleHours;
  setVisibleHours: (hours: TVisibleHours) => Promise<void>;
  events: IEvent[];
  setLocalEvents: Dispatch<SetStateAction<IEvent[]>>;
  dayNotes: IDayNote[];
  setDayNotes: Dispatch<SetStateAction<IDayNote[]>>;
  fetchDayNotes: (start: Date, end: Date) => Promise<void>;
  userRole: string | null;
  isSaving: boolean;
  entityType: 'shift' | 'booking';
  showShiftGuidance: boolean;
  setShowShiftGuidance: (show: boolean) => void;
}

const CalendarContext = createContext({} as ICalendarContext);

const WORKING_HOURS = {
  0: { from: 0, to: 0 },
  1: { from: 8, to: 17 },
  2: { from: 8, to: 17 },
  3: { from: 8, to: 17 },
  4: { from: 8, to: 17 },
  5: { from: 8, to: 17 },
  6: { from: 8, to: 12 },
};

const VISIBLE_HOURS = { from: 7, to: 18 };

interface CalendarProviderProps {
  children: React.ReactNode;
  users: IUser[];
  locations?: ILocation[];
  events: IEvent[];
  initialSettings?: Record<string, unknown> | null;
  entityType?: 'shift' | 'booking';
}

export function CalendarProvider({ children, users, locations = [], events, initialSettings, entityType = 'shift' }: CalendarProviderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize with server-side fetched settings if available, otherwise use defaults
  const getInitialBadgeVariant = (): TBadgeVariant => {
    if (initialSettings?.badge_variant) {
      return initialSettings.badge_variant as TBadgeVariant;
    }
    return "colored";
  };

  const getInitialVisibleHours = (): TVisibleHours => {
    if (initialSettings?.visible_hours) {
      return initialSettings.visible_hours as TVisibleHours;
    }
    return VISIBLE_HOURS;
  };

  const getInitialWorkingHours = (): TWorkingHours => {
    if (initialSettings?.working_hours) {
      return initialSettings.working_hours as TWorkingHours;
    }
    return WORKING_HOURS;
  };

  // Get initial date from URL or use current date
  const getInitialDate = (): Date => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  };

  const [badgeVariant, setBadgeVariant] = useState<TBadgeVariant>(getInitialBadgeVariant());
  const [visibleHours, setVisibleHours] = useState<TVisibleHours>(getInitialVisibleHours());
  const [workingHours, setWorkingHours] = useState<TWorkingHours>(getInitialWorkingHours());
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [showShiftGuidance, setShowShiftGuidanceState] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user ID for per-user settings persistence
  useEffect(() => {
    const getUserId = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const saved = localStorage.getItem(`calendar_show_shift_guidance_${user.id}`);
        if (saved !== null) {
          setShowShiftGuidanceState(saved === 'true');
        }
      }
    };
    getUserId();
  }, []);

  const setShowShiftGuidance = (show: boolean) => {
    setShowShiftGuidanceState(show);
    if (userId) {
      localStorage.setItem(`calendar_show_shift_guidance_${userId}`, String(show));
    } else {
      localStorage.setItem('calendar_show_shift_guidance_guest', String(show));
    }
  };

  // Initialize selectedDate from URL or current date
  const [selectedDate, setSelectedDateState] = useState<Date>(getInitialDate());
  const selectedDateRef = useRef<Date>(selectedDate);

  // Sync selectedDate from URL when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        const currentDateStr = selectedDate.toISOString().split('T')[0];
        const urlDateStr = parsed.toISOString().split('T')[0];
        // Only update if different to avoid unnecessary updates
        if (currentDateStr !== urlDateStr) {
          selectedDateRef.current = parsed;
          setSelectedDateState(parsed);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only depend on searchParams

  // Update URL when selectedDate changes (but not when URL changes to avoid loops)
  useEffect(() => {
    const dateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentDateParam = searchParams.get('date');

    // Only update URL if it's different to avoid unnecessary navigation
    if (currentDateParam !== dateStr) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('date', dateStr);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]); // Only depend on selectedDate, not searchParams to avoid loops

  // Update both ref and state when selectedDate changes
  const setSelectedDate = (date: Date | undefined) => {
    if (!date) return;
    selectedDateRef.current = date;
    setSelectedDateState(date);
  };

  const [selectedUserId, setSelectedUserId] = useState<IUser["id"] | "all">("all");
  const [selectedLocationId, setSelectedLocationId] = useState<string | "all">("all");

  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user role
  useEffect(() => {
    const getUserRole = async () => {
      if (!userId) return;
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.from('users').select('role').eq('id', userId).single();
      if (data) {
        setUserRole(data.role);
      }
    };
    getUserRole();
  }, [userId]);

  const [dayNotes, setDayNotes] = useState<IDayNote[]>([]);

  // Fetch day notes for a range
  const fetchDayNotes = async (start: Date, end: Date) => {
    try {
      const params = new URLSearchParams({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        locationId: selectedLocationId
      });
      const res = await fetch(`/api/calendar/day-notes?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setDayNotes(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch day notes', err);
    }
  };

  // This localEvents doesn't need to exists in a real scenario.
  // It's used here just to simulate the update of the events.
  // In a real scenario, the events would be updated in the backend
  // and the request that fetches the events should be refetched
  const [localEvents, setLocalEvents] = useState<IEvent[]>(events);

  // Sync localEvents when events prop changes (e.g., after fetching new shifts)
  // This ensures the calendar shows updated events while preserving selectedDate
  // IMPORTANT: We do NOT reset selectedDate here - it should persist across event updates
  useEffect(() => {
    setLocalEvents(events);
    // Ensure selectedDate stays in sync with ref (preserves user's current view)
    // Only update if they're different to avoid unnecessary re-renders
    if (selectedDateRef.current.getTime() !== selectedDate.getTime()) {
      setSelectedDateState(selectedDateRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]); // Only depend on events, not selectedDate to avoid loops

  const calendarEvents = entityType === 'booking' ? events : localEvents;

  // Fetch settings from API on mount to ensure we have the latest
  // Since we already have initial settings from server, this is just a background sync
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/calendar-settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Update settings from API (directly set state, don't trigger save)
            // Only update if different from current values to avoid unnecessary re-renders
            if (data.data.badge_variant !== undefined) {
              setBadgeVariant(prev => data.data.badge_variant !== prev ? data.data.badge_variant : prev);
            }
            if (data.data.visible_hours !== undefined) {
              setVisibleHours(prev => {
                const newHours = data.data.visible_hours as TVisibleHours;
                return JSON.stringify(newHours) !== JSON.stringify(prev) ? newHours : prev;
              });
            }
            if (data.data.working_hours !== undefined) {
              setWorkingHours(prev => {
                const newHours = data.data.working_hours as TWorkingHours;
                return JSON.stringify(newHours) !== JSON.stringify(prev) ? newHours : prev;
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching calendar settings:', error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    // If we have initial settings, mark as loaded immediately (settings already available)
    // Still fetch in background to ensure we have the latest
    if (initialSettings) {
      setIsInitialLoad(false);
    }
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;
    selectedDateRef.current = date;
    setSelectedDateState(date);
  };

  // Wrappers to save settings to backend
  const handleSetBadgeVariant = async (variant: TBadgeVariant) => {
    setBadgeVariant(variant);
    if (isInitialLoad) return; // Skip save during initial load

    setIsSaving(true);
    try {
      const response = await fetch('/api/calendar-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge_variant: variant }),
      });

      if (response.ok) {
        // Success notification will be handled by component using toast
      } else {
        throw new Error('Failed to save badge variant');
      }
    } catch (error) {
      console.error('Error saving badge variant:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetVisibleHours = async (hours: TVisibleHours) => {
    setVisibleHours(hours);
    if (isInitialLoad) return; // Skip save during initial load

    setIsSaving(true);
    try {
      const response = await fetch('/api/calendar-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible_hours: hours }),
      });

      if (response.ok) {
        // Success notification will be handled by component using toast
      } else {
        throw new Error('Failed to save visible hours');
      }
    } catch (error) {
      console.error('Error saving visible hours:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetWorkingHours = async (hours: TWorkingHours) => {
    setWorkingHours(hours);
    if (isInitialLoad) return; // Skip save during initial load

    setIsSaving(true);
    try {
      const response = await fetch('/api/calendar-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ working_hours: hours }),
      });

      if (response.ok) {
        // Success notification will be handled by component using toast
      } else {
        throw new Error('Failed to save working hours');
      }
    } catch (error) {
      console.error('Error saving working hours:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const { startOfWeek, endOfWeek, subDays, addDays } = require('date-fns');
    // Fetch notes for the month around the selected date to have a buffer
    const start = startOfWeek(subDays(selectedDate, 14), { weekStartsOn: 1 });
    const end = endOfWeek(addDays(selectedDate, 14), { weekStartsOn: 1 });
    fetchDayNotes(start, end);
  }, [selectedDate, selectedLocationId]);

  return (
    <CalendarContext.Provider
      value={{
        selectedDate,
        setSelectedDate: handleSelectDate,
        selectedUserId,
        setSelectedUserId,
        selectedLocationId,
        setSelectedLocationId,
        badgeVariant,
        setBadgeVariant: handleSetBadgeVariant,
        users,
        locations,
        dayNotes,
        setDayNotes,
        fetchDayNotes,
        userRole,
        visibleHours,
        setVisibleHours: handleSetVisibleHours,
        workingHours,
        setWorkingHours: handleSetWorkingHours,
        // If you go to the refetch approach, you can remove the localEvents and pass the events directly
        events: calendarEvents,
        setLocalEvents,
        isSaving,
        entityType,
        showShiftGuidance,
        setShowShiftGuidance,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar(): ICalendarContext {
  const context = useContext(CalendarContext);
  if (!context) throw new Error("useCalendar must be used within a CalendarProvider.");
  return context;
}
