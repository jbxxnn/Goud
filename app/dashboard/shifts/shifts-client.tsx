'use client';

import { useState, useEffect, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, Calendar03Icon } from '@hugeicons/core-free-icons';
import { CalendarEvent, ShiftWithDetails, ShiftsWithDetailsResponse } from '@/lib/types/shift';
import { shiftToCalendarEvent } from '@/lib/types/shift';
import { CalendarProvider } from '@/calendar/contexts/calendar-context';
import { ShiftCalendarContainer } from '@/components/shift-calendar-container';
import { CalendarSettings } from '@/components/calendar-settings';
import { Staff } from '@/lib/types/staff';
import { expandRecurringShifts } from '@/lib/utils/expand-recurring-shifts';
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

export default function ShiftsClient() {
  const [shifts, setShifts] = useState<ShiftWithDetails[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<TCalendarView>('week');

  // Fetch shifts
  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get start and end dates based on view
      // For recurring shifts, we need to look ahead at least 6 months
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      // const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      // Expand the range to include 6 months ahead for recurring shifts
      const expandedEndDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 6, 0);

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
  }, [selectedDate]);

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

  useEffect(() => {
    fetchShifts();
    fetchStaff();
  }, [fetchShifts, fetchStaff]);

  // Convert staff to calendar users format
  const users: IUser[] = staff.map((s) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`,
    picturePath: null,
  }));

  // Color map for locations
  const locationColors: { [key: string]: IEvent['color'] } = {};
  const colors: IEvent['color'][] = ['blue', 'green', 'red', 'yellow', 'purple', 'orange'];
  
  shifts.forEach((shift) => {
    if (!locationColors[shift.location_id]) {
      locationColors[shift.location_id] = colors[Object.keys(locationColors).length % colors.length];
    }
  });

  // Convert shifts to calendar events
  const events: CalendarEvent[] = shifts.map((shift) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3">
          <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading shifts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Shift Management</h1>
          <p className="text-muted-foreground">
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
          <CalendarProvider users={users} events={events as unknown as IEvent[]}>
            <ShiftCalendarContainer 
              view={calendarView} 
              onViewChange={setCalendarView}
              onShiftCreated={fetchShifts}
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

