'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { startOfMonth, endOfMonth, subMonths, addMonths, startOfYear, endOfYear } from 'date-fns';
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
import { Service } from '@/lib/types/service';
import type { TCalendarView } from '@/calendar/types';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import PageContainer, { PageItem } from '@/components/ui/page-transition';

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
  staffId?: string;
  userRole?: string;
}

import { useTranslations } from 'next-intl';

export default function ShiftsClient({ initialCalendarSettings, staffId, userRole }: ShiftsClientProps) {
  const t = useTranslations('Shifts');
  const [calendarView, setCalendarView] = useState<TCalendarView>('week');
  const queryClient = useQueryClient();

  const isAdmin = userRole === 'admin';

  // Re-implement fetchShifts as a wrapper to invalidate queries
  const fetchShifts = useCallback(async (preserveDate?: Date) => {
    await queryClient.invalidateQueries({ queryKey: ['shifts'] });
  }, [queryClient]);

  const searchParams = useSearchParams();

  // Derive the active date from URL or default to today
  const activeDate = useMemo(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const d = new Date(dateParam);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [searchParams]);

  // Calculate the fetching range
  const { fetchStartDate, fetchEndDate } = useMemo(() => {
    if (calendarView === 'year') {
      return {
        fetchStartDate: startOfYear(activeDate),
        fetchEndDate: endOfYear(activeDate)
      };
    }
    const start = startOfMonth(subMonths(activeDate, 1));
    const end = endOfMonth(addMonths(activeDate, 1));
    return {
      fetchStartDate: start,
      fetchEndDate: end
    };
  }, [activeDate, calendarView]);

  // Fetch shifts query
  const { data: shifts = [], isLoading: shiftsLoading, error: shiftsError } = useQuery<ShiftWithDetails[]>({
    queryKey: ['shifts', 'expanded', staffId, fetchStartDate.toISOString(), fetchEndDate.toISOString()], // Include range in key
    queryFn: async () => {
      const params = new URLSearchParams({
        with_details: 'true',
        start_date: fetchStartDate.toISOString(),
        end_date: fetchEndDate.toISOString(),
        limit: '2500',
      });

      if (staffId) {
        params.append('staff_id', staffId);
      }

      const response = await fetch(`/api/shifts?${params}`);
      const data: ShiftsWithDetailsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || t('errors.fetchShifts'));
      }

      const rawShifts = data.data || [];
      return expandRecurringShifts(rawShifts, fetchStartDate, fetchEndDate);
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const { data: coworkerShifts = [] } = useQuery<ShiftWithDetails[]>({
    queryKey: ['shifts', 'summary', fetchStartDate.toISOString(), fetchEndDate.toISOString()],
    enabled: !!staffId,
    queryFn: async () => {
      const params = new URLSearchParams({
        with_details: 'true',
        start_date: fetchStartDate.toISOString(),
        end_date: fetchEndDate.toISOString(),
        limit: '2500',
      });

      const response = await fetch(`/api/shifts?${params}`);
      const data: ShiftsWithDetailsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || t('errors.fetchShifts'));
      }

      const rawShifts = data.data || [];
      return expandRecurringShifts(rawShifts, fetchStartDate, fetchEndDate);
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const loading = shiftsLoading && shifts.length === 0;
  const error = shiftsError instanceof Error ? shiftsError.message : null;

  // Fetch staff query
  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ['staff', 'active', 'with-assignments'],
    queryFn: async () => {
      const response = await fetch('/api/staff?active_only=true&limit=1000&with_assignments=true');
      const data = await response.json();
      if (!data.success) throw new Error(t('errors.fetchStaff'));
      return data.data || [];
    },
  });

  // Fetch locations query
  const { data: locations = [], isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ['locations-simple', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/locations-simple?active_only=true&limit=1000');
      const data = await response.json();
      if (!data.success) throw new Error(t('errors.fetchLocations'));
      return data.data || [];
    },
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services', 'active', 'shift-dialog'],
    queryFn: async () => {
      const response = await fetch('/api/services?active_only=true&limit=1000');
      const data = await response.json();
      if (!data.success) throw new Error(t('errors.fetchServices', { fallback: 'Failed to fetch services' }));
      return data.data || [];
    },
  });

  // Convert staff to calendar users format
  const users: IUser[] = useMemo(() => {
    if (staffId) {
      const currentStaff = staff.find(s => s.id === staffId);
      if (!currentStaff) return [];
      return [{
        id: currentStaff.id,
        name: `${currentStaff.first_name} ${currentStaff.last_name}`,
        picturePath: null,
      }];
    }
    return staff.map((s) => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      picturePath: null,
    }));
  }, [staff, staffId]);

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
      [...shifts, ...coworkerShifts].forEach((shift) => {
        if (!colorMap[shift.location_id]) {
          // Use a consistent fallback color based on location ID hash
          const hash = shift.location_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          colorMap[shift.location_id] = defaultColors[hash % defaultColors.length];
        }
      });
    }

    return colorMap;
  }, [locations, shifts, coworkerShifts, locationsLoading]);

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
        id: calendarEvent.id,
        startDate: calendarEvent.startDate,
        endDate: calendarEvent.endDate,
        title: calendarEvent.title,
        color: calendarEvent.color,
        description: calendarEvent.description,
        user: calendarEvent.user,
        location: calendarEvent.location,
        metadata: calendarEvent.metadata,
      };
    });
  }, [shifts, locationColors, locationsLoading]);

  const summaryShiftEvents: CalendarEvent[] = useMemo(() => {
    if (locationsLoading) {
      return [];
    }

    const sourceShifts = staffId ? coworkerShifts : shifts;

    return sourceShifts.map((shift) => {
      const calendarEvent = shiftToCalendarEvent(shift, locationColors);
      return {
        id: calendarEvent.id,
        startDate: calendarEvent.startDate,
        endDate: calendarEvent.endDate,
        title: calendarEvent.title,
        color: calendarEvent.color,
        description: calendarEvent.description,
        user: calendarEvent.user,
        location: calendarEvent.location,
        metadata: calendarEvent.metadata,
      };
    });
  }, [staffId, coworkerShifts, shifts, locationColors, locationsLoading]);

  if (loading || (locationsLoading && locations.length === 0)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3">
          <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <PageContainer className="flex h-[calc(100vh-5.5rem)] flex-col gap-4 overflow-hidden bg-card p-4" >
      {/* Error Message */}
      {error && (
        <PageItem>
          <div className="border-destructive bg-destructive/5 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </div>
        </PageItem>
      )}

      {/* Calendar */}
      <PageItem className="min-h-0 flex-1 overflow-hidden">
        <div className="h-full min-h-0 bg-background">
          {users.length > 0 ? (
            <CalendarProvider
              users={users}
              locations={locations}
              events={events as unknown as IEvent[]}
              initialSettings={initialCalendarSettings}
            >
              <ShiftCalendarContainerWrapper
                view={calendarView}
                onViewChange={setCalendarView}
                fetchShifts={fetchShifts}
                summaryShiftEvents={summaryShiftEvents as unknown as IEvent[]}
                staff={staff}
                locations={locations}
                services={services}
                hideAddButton={!!staffId || ((userRole !== 'admin' && userRole !== 'assistant') && !staffId)}
              />
              {/* Calendar Settings */}
              {!staffId && <CalendarSettings />}
            </CalendarProvider>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
              <div className="rounded-full bg-muted p-3 mb-4">
                <HugeiconsIcon icon={Calendar03Icon} className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">{t('empty.noStaffTitle')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('empty.noStaffDescription')}
              </p>
            </div>
          )}
        </div>
      </PageItem>
    </PageContainer>
  );
}

// Wrapper component that has access to calendar context
function ShiftCalendarContainerWrapper({
  view,
  onViewChange,
  fetchShifts,
  summaryShiftEvents,
  staff,
  locations,
  services,
  hideAddButton,
}: {
  view: TCalendarView;
  onViewChange: (view: TCalendarView) => void;
  fetchShifts: (preserveDate?: Date) => Promise<void>;
  summaryShiftEvents: IEvent[];
  staff: Staff[];
  locations: Location[];
  services: Service[];
  hideAddButton?: boolean;
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
      summaryShiftEvents={summaryShiftEvents}
      staff={staff}
      locations={locations}
      services={services}
      hideAddButton={hideAddButton}
    />
  );
}
