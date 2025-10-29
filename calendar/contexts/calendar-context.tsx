"use client";

import { createContext, useContext, useState, useEffect } from "react";

import type { Dispatch, SetStateAction } from "react";
import type { IEvent, IUser } from "@/calendar/interfaces";
import type { TBadgeVariant, TVisibleHours, TWorkingHours } from "@/calendar/types";

interface ICalendarContext {
  selectedDate: Date;
  setSelectedDate: (date: Date | undefined) => void;
  selectedUserId: IUser["id"] | "all";
  setSelectedUserId: (userId: IUser["id"] | "all") => void;
  badgeVariant: TBadgeVariant;
  setBadgeVariant: (variant: TBadgeVariant) => Promise<void>;
  users: IUser[];
  workingHours: TWorkingHours;
  setWorkingHours: (hours: TWorkingHours) => Promise<void>;
  visibleHours: TVisibleHours;
  setVisibleHours: (hours: TVisibleHours) => Promise<void>;
  events: IEvent[];
  setLocalEvents: Dispatch<SetStateAction<IEvent[]>>;
  isSaving: boolean;
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

export function CalendarProvider({ children, users, events }: { children: React.ReactNode; users: IUser[]; events: IEvent[] }) {
  // Initialize with default values, will be updated after API call
  const [badgeVariant, setBadgeVariant] = useState<TBadgeVariant>("colored");
  const [visibleHours, setVisibleHours] = useState<TVisibleHours>(VISIBLE_HOURS);
  const [workingHours, setWorkingHours] = useState<TWorkingHours>(WORKING_HOURS);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<IUser["id"] | "all">("all");

  // This localEvents doesn't need to exists in a real scenario.
  // It's used here just to simulate the update of the events.
  // In a real scenario, the events would be updated in the backend
  // and the request that fetches the events should be refetched
  const [localEvents, setLocalEvents] = useState<IEvent[]>(events);

  // Fetch settings from API on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/calendar-settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Update settings from API (directly set state, don't trigger save)
            if (data.data.badge_variant !== undefined) {
              setBadgeVariant(data.data.badge_variant);
            }
            if (data.data.visible_hours !== undefined) {
              setVisibleHours(data.data.visible_hours);
            }
            if (data.data.working_hours !== undefined) {
              setWorkingHours(data.data.working_hours);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching calendar settings:', error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
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

  return (
    <CalendarContext.Provider
      value={{
        selectedDate,
        setSelectedDate: handleSelectDate,
        selectedUserId,
        setSelectedUserId,
        badgeVariant,
        setBadgeVariant: handleSetBadgeVariant,
        users,
        visibleHours,
        setVisibleHours: handleSetVisibleHours,
        workingHours,
        setWorkingHours: handleSetWorkingHours,
        // If you go to the refetch approach, you can remove the localEvents and pass the events directly
        events: localEvents,
        setLocalEvents,
        isSaving,
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