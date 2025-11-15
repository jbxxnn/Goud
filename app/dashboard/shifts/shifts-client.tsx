'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, Calendar03Icon } from '@hugeicons/core-free-icons';
import { CalendarEvent, ShiftWithDetails, ShiftsWithDetailsResponse, shiftToCalendarEvent } from '@/lib/types/shift';
import { CalendarProvider, useCalendar } from '@/calendar/contexts/calendar-context';
import { ShiftCalendarContainer } from '@/components/shift-calendar-container';
import { CalendarSettings } from '@/components/calendar-settings';
import { Staff } from '@/lib/types/staff';
import { Location } from '@/lib/types/location_simple';
import { expandRecurringShifts } from '@/lib/utils/expand-recurring-shifts';
import { mapLocationColorToCalendarColor } from '@/lib/utils/location-color-mapper';
import type { TCalendarView } from '@/calendar/types';

interface IUser {
  id: string;
  name: string;
  picturePath: string | null;
}

interface IEvent {
  id: number;
  startDate: string;
  endDate: string;
  title: string;
  color: "blue" | "green" | "red" | "yellow" | "purple" | "orange";
  description: string;
  user: IUser;
}

interface ShiftsClientProps {
  initialCalendarSettings?: Record<string, unknown> | null;
}

export default function ShiftsClient({ initialCalendarSettings }: ShiftsClientProps) {
  const [shifts, setShifts] = useState<ShiftWithDetails[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<TCalendarView>('week');

  // Fetch shifts - accepts optional date to preserve calendar view
  const fetchShifts = useCallback(async (preserveDate?: Date) => {
    try {
      setLoading(true);
      setError(null);

      // Use provided date or current date (for initial load)
      // This allows preserving the calendar's selectedDate when refreshing
      const dateToUse = preserveDate || new Date();

      // Get start and end dates based on view
      // For recurring shifts, we need to look ahead at least 6 months
      const startOfMonth = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), 1);
      // const endOfMonth = new Date(dateToUse.getFullYear(), dateToUse.getMonth() + 1, 0);
      
      // Expand the range to include 6 months ahead for recurring shifts
      const expandedEndDate = new Date(dateToUse.getFullYear(), dateToUse.getMonth() + 6, 0);

      const params = new URLSearchParams({
        with_details: 'true',
        start_date: startOfMonth.toISOString(),
        end_date: expandedEndDate.toISOString(),
        limit: '2500', // Get all shifts for the 6-month period
      });

      const response = await fetch(`/api/shifts?${params}`);
      const data: ShiftsWithDetailsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch shifts');
      }

      // Expand recurring shifts for the expanded period
      const rawShifts = data.data || [];
      const expandedShifts = expandRecurringShifts(rawShifts, startOfMonth, expandedEndDate);
      
      console.log(`Fetched ${rawShifts.length} raw shifts, expanded to ${expandedShifts.length} total shifts`);
      
      setShifts(expandedShifts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch staff
  const fetchStaff = useCallback(async () => {
    try {
      const response = await fetch('/api/staff?active_only=true&limit=1000');
      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch staff');
      }

      setStaff(data.data || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  }, []);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    try {
      setLocationsLoading(true);
      const response = await fetch('/api/locations-simple?active_only=true&limit=1000');
      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch locations');
      }

      setLocations(data.data || []);
    } catch (err) {
      console.error('Error fetching locations:', err);
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
    fetchStaff();
    fetchLocations();
  }, [fetchShifts, fetchStaff, fetchLocations]);

  // Convert staff to calendar users format
  const users: IUser[] = staff.map((s) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`,
    picturePath: null,
  }));

  // Color map for locations using actual location colors
  // Use useMemo to ensure it only recalculates when locations change
  // Only build color map if locations are loaded to avoid fallback colors
  const locationColors = useMemo(() => {
    const colorMap: { [key: string]: IEvent['color'] } = {};
    
    // Only build color map if locations are loaded
    if (locations.length > 0) {
      locations.forEach((location) => {
        const mappedColor = mapLocationColorToCalendarColor(location.color);
        colorMap[location.id] = mappedColor;
      });
    }

    // Fallback for any shifts with locations not in the fetched list (only after locations are loaded)
    if (!locationsLoading && locations.length > 0) {
      const defaultColors: IEvent['color'][] = ['blue', 'green', 'red', 'yellow', 'purple', 'orange'];
      shifts.forEach((shift) => {
        if (!colorMap[shift.location_id]) {
          // Use a consistent fallback color based on location ID hash
          const hash = shift.location_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          colorMap[shift.location_id] = defaultColors[hash % defaultColors.length];
        }
      });
    }

    return colorMap;
  }, [locations, shifts, locationsLoading]);

  // Convert shifts to calendar events
  // Only convert if locations are loaded (to avoid using fallback colors)
  const events: CalendarEvent[] = useMemo(() => {
    // Wait for locations to load before generating events with colors
    if (locationsLoading) {
      return [];
    }
    
    return shifts.map((shift) => {
      const calendarEvent = shiftToCalendarEvent(shift, locationColors);
      return {
        id: calendarEvent.id, // Use shift ID as string
        startDate: calendarEvent.startDate,
        endDate: calendarEvent.endDate,
        title: calendarEvent.title,
        color: calendarEvent.color,
        description: calendarEvent.description,
        user: calendarEvent.user,
      };
    });
  }, [shifts, locationColors, locationsLoading]);

  if (loading || locationsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3">
          <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-card" style={{ borderRadius: '0.5rem' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
            <h1 className="text-md font-bold tracking-tight">Shift Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage staff schedules and availability
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="border-destructive bg-destructive/5 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <p className="text-destructive font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-background">
        {users.length > 0 ? (
          <CalendarProvider 
            users={users} 
            events={events as unknown as IEvent[]}
            initialSettings={initialCalendarSettings}
          >
            <ShiftCalendarContainerWrapper
              view={calendarView} 
              onViewChange={setCalendarView}
              fetchShifts={fetchShifts}
            />
            {/* Calendar Settings */}
            <CalendarSettings />
          </CalendarProvider>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
            <div className="rounded-full bg-muted p-3 mb-4">
              <HugeiconsIcon icon={Calendar03Icon} className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No staff members found</h3>
            <p className="text-muted-foreground mb-4">
              Add staff members to start creating shifts
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper component that has access to calendar context
function ShiftCalendarContainerWrapper({
  view,
  onViewChange,
  fetchShifts,
}: {
  view: TCalendarView;
  onViewChange: (view: TCalendarView) => void;
  fetchShifts: (preserveDate?: Date) => Promise<void>;
}) {
  const searchParams = useSearchParams();
  const { selectedDate } = useCalendar();

  // Handle shift creation/update/deletion - preserve the current selectedDate from URL
  const handleShiftChange = async () => {
    // Get date from URL first (most reliable), fallback to context
    const dateParam = searchParams.get('date');
    let dateToUse = selectedDate;
    
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        dateToUse = parsed;
      }
    }
    
    // Fetch shifts using the preserved date to maintain the view
    await fetchShifts(dateToUse);
    // Events will be updated automatically when shifts state updates in parent
  };

  return (
    <ShiftCalendarContainer 
      view={view} 
      onViewChange={onViewChange}
      onShiftCreated={handleShiftChange}
      onShiftDeleted={handleShiftChange}
      onShiftUpdated={handleShiftChange}
    />
  );
}

