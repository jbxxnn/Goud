"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useDisclosure } from "@/hooks/use-disclosure";
import { useCalendar } from "@/calendar/contexts/calendar-context";

import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Time } from "@internationalized/date";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogClose, DialogContent, DialogTrigger, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar01Icon } from "@hugeicons/core-free-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { buildRecurrenceRule, RecurrenceOptions } from "@/lib/types/shift";
import { Staff } from "@/lib/types/staff";
import { Location } from "@/lib/types/location_simple";
import { Service } from "@/lib/types/service";

interface IProps {
  children: React.ReactNode;
  staff: Staff[];
  locations: Location[];
  services: Service[];
  startDate?: Date;
  startTime?: { hour: number; minute: number };
  onShiftCreated?: () => void;
}

interface ShiftFormData {
  staff_id: string;
  location_id: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recurrence_interval?: number;
  recurrence_days?: string[];
  recurrence_until?: string;
  priority: number;
  notes: string;
  service_ids: string[];
  max_concurrent_bookings: { [key: string]: number | null };
}

import { useTranslations } from 'next-intl';

export function AddShiftDialog({ children, staff, locations, services, startDate, startTime, onShiftCreated }: IProps) {
  const t = useTranslations('Shifts.dialog.add');
  const { isOpen, onClose, onToggle } = useDisclosure();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [staffLocationMap, setStaffLocationMap] = useState<{ [key: string]: string[] }>({});
  const [staffServiceMap, setStaffServiceMap] = useState<{ [key: string]: string[] }>({});

  const [showServices, setShowServices] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [recurrenceUntilOpen, setRecurrenceUntilOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{
    conflicts: any[];
    formData: ShiftFormData;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ShiftFormData>({
    defaultValues: {
      staff_id: '',
      location_id: '',
      start_time: '',
      end_time: '',
      is_recurring: false,
      recurrence_interval: 1,
      priority: 1,
      notes: '',
      service_ids: [],
      max_concurrent_bookings: {},
    },
  });

  useEffect(() => {
    const locationMapping: { [key: string]: string[] } = {};
    const serviceMapping: { [key: string]: string[] } = {};

    for (const member of staff) {
      locationMapping[member.id] = member.location_ids || [];
      serviceMapping[member.id] = member.service_ids || [];
    }

    setStaffLocationMap(locationMapping);
    setStaffServiceMap(serviceMapping);
  }, [staff]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedServices([]);
      setShowServices(false);
    }
  }, [isOpen]);

  // Set initial date/time when dialog opens
  useEffect(() => {
    if (isOpen && startDate) {
      const { formatInTimeZone } = require('date-fns-tz');
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      
      const startHh = startTime ? String(startTime.hour).padStart(2, '0') : '09';
      const startMm = startTime ? String(startTime.minute).padStart(2, '0') : '00';
      
      let endHhNum = (startTime ? startTime.hour : 9) + 1; // Default 1 hour duration
      if (endHhNum > 23) endHhNum = 23; // Simple cap for now
      
      const endHh = String(endHhNum).padStart(2, '0');
      const endMm = startMm; // Keep identical minutes
      
      setValue('start_time', `${year}-${month}-${day}T${startHh}:${startMm}`);
      setValue('end_time', `${year}-${month}-${day}T${endHh}:${endMm}`);
    }
  }, [isOpen, startDate, startTime, setValue]);

  // Helper to construct local DateTime string preserving Amsterdam zone formatting
  const formatDateTimeLocal = (date: Date): string => {
    const { formatInTimeZone } = require('date-fns-tz');
    return formatInTimeZone(date, 'Europe/Amsterdam', "yyyy-MM-dd'T'HH:mm");
  };

  // Helper to create true ISO string from local YYYY-MM-DDTHH:mm keeping Europe/Amsterdam offset
  const createLocalIsoString = (localDateTimeStr: string): string => {
    const { formatInTimeZone, toDate } = require('date-fns-tz');
    const amsterdamDate = toDate(`${localDateTimeStr}:00`, { timeZone: 'Europe/Amsterdam' });
    return formatInTimeZone(amsterdamDate, 'Europe/Amsterdam', "yyyy-MM-dd'T'HH:mm:ssXXX");
  };

  const onSubmit = async (data: ShiftFormData) => {
    setIsSubmitting(true);
    try {
      // Build recurrence rule if recurring
      let recurrence_rule = null;
      if (data.is_recurring && data.recurrence_frequency) {
        const recurrenceOptions: RecurrenceOptions = {
          frequency: data.recurrence_frequency,
          interval: data.recurrence_interval,
          daysOfWeek: data.recurrence_days as RecurrenceOptions['daysOfWeek'],
          until: data.recurrence_until,
        };
        recurrence_rule = buildRecurrenceRule(recurrenceOptions);
      }

      const requestBody = {
        staff_id: data.staff_id,
        location_id: data.location_id,
        start_time: createLocalIsoString(data.start_time),
        end_time: createLocalIsoString(data.end_time),
        is_recurring: data.is_recurring,
        recurrence_rule,
        priority: data.priority,
        notes: data.notes || null,
        service_ids: selectedServices,
        max_concurrent_bookings: data.max_concurrent_bookings,
      };

      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.skippable && result.conflicts) {
          setConflictData({
            conflicts: result.conflicts,
            formData: data
          });
          return;
        }
        
        if (result.conflicts) {
          toast.error(t('conflicts'), {
            description: result.conflicts.map((c: any) => c.message).join('\n'),
          });
        } else {
          throw new Error(result.error || 'Failed to save shift');
        }
        return;
      }

      // Success - close dialog and refresh
      onClose();
      reset();
      setSelectedServices([]);

      if (onShiftCreated) {
        onShiftCreated();
      }
    } catch (err) {
      console.error('Error saving shift:', err);
      toast.error('Failed to save shift', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  // Filter locations based on selected staff
  const filteredLocations = watch('staff_id')
    ? locations.filter(loc => staffLocationMap[watch('staff_id')]?.includes(loc.id))
    : locations;

  // Filter staff based on selected location
  const filteredStaff = watch('location_id')
    ? staff.filter(s => staffLocationMap[s.id]?.includes(watch('location_id')))
    : staff;

  // Filter services based on selected staff
  const filteredServices = watch('staff_id')
    ? services.filter(svc => staffServiceMap[watch('staff_id')]?.includes(svc.id))
    : services;

  // Handle staff selection change
  const handleStaffChange = (staffId: string) => {
    setValue('staff_id', staffId);

    // If location is selected but not in staff's locations, clear it
    const currentLocation = watch('location_id');
    if (currentLocation && !staffLocationMap[staffId]?.includes(currentLocation)) {
      setValue('location_id', '');
    }

    // Auto-select all services that this staff member can perform
    const staffServices = staffServiceMap[staffId] || [];
    setSelectedServices(staffServices);
  };

  // Handle location selection change
  const handleLocationChange = (locationId: string) => {
    setValue('location_id', locationId);

    // If staff is selected but not assigned to this location, clear it
    const currentStaff = watch('staff_id');
    if (currentStaff && !staffLocationMap[currentStaff]?.includes(locationId)) {
      setValue('staff_id', '');
    }
  };

  const weekDays = [
    { value: 'MO', label: 'Mon' },
    { value: 'TU', label: 'Tue' },
    { value: 'WE', label: 'Wed' },
    { value: 'TH', label: 'Thu' },
    { value: 'FR', label: 'Fri' },
    { value: 'SA', label: 'Sat' },
    { value: 'SU', label: 'Sun' },
  ];

  const handleSkipAndCreate = async () => {
    if (!conflictData) return;
    
    setIsSubmitting(true);
    try {
      const data = conflictData.formData;
      
      let recurrence_rule = null;
      if (data.is_recurring && data.recurrence_frequency) {
        const recurrenceOptions: RecurrenceOptions = {
          frequency: data.recurrence_frequency,
          interval: data.recurrence_interval,
          daysOfWeek: data.recurrence_days as RecurrenceOptions['daysOfWeek'],
          until: data.recurrence_until,
        };
        recurrence_rule = buildRecurrenceRule(recurrenceOptions);
      }

      const requestBody = {
        staff_id: data.staff_id,
        location_id: data.location_id,
        start_time: createLocalIsoString(data.start_time),
        end_time: createLocalIsoString(data.end_time),
        is_recurring: data.is_recurring,
        recurrence_rule,
        priority: data.priority,
        notes: data.notes || null,
        service_ids: selectedServices,
        max_concurrent_bookings: data.max_concurrent_bookings,
        skip_conflicting_occurrences: true,
      };

      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save shift after skipping conflicts');
      }

      // Success
      setConflictData(null);
      onClose();
      reset();
      setSelectedServices([]);
      if (onShiftCreated) onShiftCreated();
      toast.success('Shift created with skipped occurrences');
    } catch (err) {
      console.error('Error saving shift with skips:', err);
      toast.error('Failed to save shift', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onToggle}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-w-2xl max-h-[90vh] rounded-xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <form id="shift-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
            {/* Staff Selection */}
            <div className="space-y-2">
              <Label htmlFor="staff_id">{t('staffMember')}</Label>
                <Select
                value={watch('staff_id')}
                onValueChange={handleStaffChange}
              >
                <SelectTrigger className="bg-card" style={{borderRadius: "1rem"}}>
                  <SelectValue placeholder={t('selectStaff')} />
                </SelectTrigger>
                <SelectContent>
                  {filteredStaff.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      {watch('location_id')
                        ? 'No staff assigned to this location'
                        : 'No staff available'}
                    </div>
                  ) : (
                    filteredStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {watch('location_id') && filteredStaff.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No staff members are assigned to the selected location
                </p>
              )}
              {errors.staff_id && (
                <p className="text-sm text-destructive mt-1">{errors.staff_id.message}</p>
              )}
            </div>

            {/* Location Selection */}
            <div className="space-y-2">
              <Label htmlFor="location_id">{t('location')}</Label>
                <Select
                value={watch('location_id')}
                onValueChange={handleLocationChange}
              >
                <SelectTrigger className="bg-card" style={{borderRadius: "1rem"}}>
                  <SelectValue placeholder={t('selectLocation')} />
                </SelectTrigger>
                <SelectContent>
                  {filteredLocations.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      {watch('staff_id')
                        ? t('noLocationStaff')
                        : t('noLocationAvailable')}
                    </div>
                  ) : (
                    filteredLocations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {watch('staff_id') && filteredLocations.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Selected staff member is not assigned to any locations
                </p>
              )}
              {errors.location_id && (
                <p className="text-sm text-destructive mt-1">{errors.location_id.message}</p>
              )}
            </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block mb-2">{t('startTime')}</Label>
                <div className="flex gap-1">
                  <Popover modal={true} open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "justify-start text-left font-normal h-10 px-3 border-input bg-card",
                          !watch('start_time') && "text-muted-foreground"
                        )}
                        style={{ borderRadius: '1rem' }}
                      >
                        <HugeiconsIcon icon={Calendar01Icon} />
                        {watch('start_time') ? format(new Date(watch('start_time')), "dd/MM/yyyy") : <span>Pick date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={watch('start_time') ? new Date(watch('start_time')) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const currentStr = watch('start_time') || new Date().toISOString();
                            const timePart = currentStr.includes('T') ? currentStr.split('T')[1].substring(0, 5) : "09:00";
                            
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            
                            setValue('start_time', `${year}-${month}-${day}T${timePart}`);
                            setStartDateOpen(false);

                            // Auto-populate End Date to match the new Start Date, preserving existing end time
                            const currentEndStr = watch('end_time') || currentStr;
                            const endTimePart = currentEndStr.includes('T') ? currentEndStr.split('T')[1].substring(0, 5) : "10:00";
                            setValue('end_time', `${year}-${month}-${day}T${endTimePart}`);
                          }
                        }}
                        initialFocus
                        captionLayout="dropdown"
                        fromYear={2020}
                        toYear={2030}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <TimeInput
                    className="flex-1"
                    style={{ borderRadius: '0.2rem' }}
                    dateInputClassName="h-10"
                    hourCycle={24}
                    value={watch('start_time') && watch('start_time').includes('T') ? new Time(
                      parseInt(watch('start_time').split('T')[1].split(':')[0]),
                      parseInt(watch('start_time').split('T')[1].split(':')[1])
                    ) : null}
                    onChange={(time) => {
                      if (time) {
                        const currentStr = watch('start_time') || new Date().toISOString();
                        const ymd = currentStr.includes('T') ? currentStr.split('T')[0] : currentStr.substring(0, 10);
                        setValue('start_time', `${ymd}T${String(time.hour).padStart(2,'0')}:${String(time.minute).padStart(2,'0')}`);
                      }
                    }}
                  />
                  <input type="hidden" {...register('start_time', { required: t('startTime') + ' is required' })} />
                </div>
                {errors.start_time && (
                  <p className="text-sm text-destructive mt-1">{errors.start_time.message}</p>
                )}
              </div>

              <div>
                <Label className="block mb-2">{t('endTime')}</Label>
                <div className="flex gap-1">
                  <Popover modal={true} open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "hidden justify-start text-left font-normal h-10 px-3 border-input bg-card",
                          !watch('end_time') && "text-muted-foreground"
                        )}
                        style={{ borderRadius: '1rem' }}
                      >
                        <HugeiconsIcon icon={Calendar01Icon} />
                        {watch('end_time') ? format(new Date(watch('end_time')), "dd/MM/yyyy") : <span>Pick date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={watch('end_time') ? new Date(watch('end_time')) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const currentStr = watch('end_time') || new Date().toISOString();
                            const timePart = currentStr.includes('T') ? currentStr.split('T')[1].substring(0, 5) : "10:00";
                            
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            
                            setValue('end_time', `${year}-${month}-${day}T${timePart}`);
                            setEndDateOpen(false);
                          }
                        }}
                        initialFocus
                        captionLayout="dropdown"
                        fromYear={2020}
                        toYear={2030}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          if (watch('start_time')) {
                              const startDate = new Date(watch('start_time'));
                              startDate.setHours(0,0,0,0);
                              return date.getTime() < Math.max(today.getTime(), startDate.getTime());
                          }
                          return date < today;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <TimeInput
                    className="flex-1"
                    style={{ borderRadius: '0.2rem' }}
                    dateInputClassName="h-10"
                    hourCycle={24}
                    value={watch('end_time') && watch('end_time').includes('T') ? new Time(
                      parseInt(watch('end_time').split('T')[1].split(':')[0]),
                      parseInt(watch('end_time').split('T')[1].split(':')[1])
                    ) : null}
                    onChange={(time) => {
                      if (time) {
                        const currentStr = watch('end_time') || new Date().toISOString();
                        const ymd = currentStr.includes('T') ? currentStr.split('T')[0] : currentStr.substring(0, 10);
                        setValue('end_time', `${ymd}T${String(time.hour).padStart(2,'0')}:${String(time.minute).padStart(2,'0')}`);
                      }
                    }}
                  />
                  <input type="hidden" {...register('end_time', { required: t('endTime') + ' is required' })} />
                </div>
                {errors.end_time && (
                  <p className="text-sm text-destructive mt-1">{errors.end_time.message}</p>
                )}
              </div>
            </div>

            {/* Recurring Shift */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_recurring"
                  checked={watch('is_recurring')}
                  onCheckedChange={(checked) => setValue('is_recurring', checked)}
                />
                <Label htmlFor="is_recurring">{t('recurring')}</Label>
              </div>

              {watch('is_recurring') && (
                <div className="border-l-2 border-muted pl-6 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="flex-1 w-full">
                      <Label htmlFor="recurrence_combined" className="text-xs font-semibold mb-2">Recurrence *</Label>
                      <Select
                        value={`${watch('recurrence_frequency')}_${watch('recurrence_interval') || 1}`}
                        onValueChange={(value) => {
                          if (value === 'DAILY_1') {
                            setValue('recurrence_frequency', 'DAILY');
                            setValue('recurrence_interval', 1);
                          } else if (value === 'WEEKLY_1') {
                            setValue('recurrence_frequency', 'WEEKLY');
                            setValue('recurrence_interval', 1);
                          } else if (value === 'WEEKLY_2') {
                            setValue('recurrence_frequency', 'WEEKLY');
                            setValue('recurrence_interval', 2);
                          } else if (value === 'WEEKLY_3') {
                            setValue('recurrence_frequency', 'WEEKLY');
                            setValue('recurrence_interval', 3);
                          } else if (value === 'MONTHLY_1') {
                            setValue('recurrence_frequency', 'MONTHLY');
                            setValue('recurrence_interval', 1);
                          }
                        }}
                      >
                        <SelectTrigger className="bg-card h-10" style={{borderRadius: "1rem"}}>
                          <SelectValue placeholder="Select recurrence" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY_1">{t('daily')}</SelectItem>
                          <SelectItem value="WEEKLY_1">{t('weekly')}</SelectItem>
                          <SelectItem value="WEEKLY_2">{t('every2Weeks')}</SelectItem>
                          <SelectItem value="WEEKLY_3">{t('every3Weeks')}</SelectItem>
                          <SelectItem value="MONTHLY_1">{t('monthly')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 w-full">
                      <Label htmlFor="recurrence_until" className="text-xs font-semibold mb-2 block">Repeat Until (Optional)</Label>
                      <Popover modal={true} open={recurrenceUntilOpen} onOpenChange={setRecurrenceUntilOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal h-10 px-3 border-input bg-card",
                              !watch('recurrence_until') && "text-muted-foreground"
                            )}
                            style={{ borderRadius: '1rem' }}
                          >
                            <HugeiconsIcon icon={Calendar01Icon} />
                            {watch('recurrence_until') ? format(new Date(watch('recurrence_until')!), "dd/MM/yyyy") : <span>Pick date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={watch('recurrence_until') ? new Date(watch('recurrence_until')!) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const safeDate = new Date(date);
                                safeDate.setHours(12);
                                setValue('recurrence_until', safeDate.toISOString().split('T')[0]);
                                setRecurrenceUntilOpen(false);
                              } else {
                                setValue('recurrence_until', undefined);
                                setRecurrenceUntilOpen(false);
                              }
                            }}
                            initialFocus
                            captionLayout="dropdown"
                            fromYear={new Date().getFullYear() - 1}
                            toYear={new Date().getFullYear() + 10}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              
                              if (watch('start_time')) {
                                  const startDate = new Date(watch('start_time'));
                                  startDate.setHours(0,0,0,0);
                                  return date.getTime() < Math.max(today.getTime(), startDate.getTime());
                              }
                              return date < today;
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {watch('recurrence_frequency') === 'WEEKLY' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">{t('daysOfWeek')}</Label>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {weekDays.map((day) => (
                          <div key={day.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={day.value}
                              className="rounded-full"
                              checked={(watch('recurrence_days') || []).includes(day.value)}
                              onCheckedChange={(checked) => {
                                const current = watch('recurrence_days') || [];
                                setValue(
                                  'recurrence_days',
                                  checked
                                    ? [...current, day.value]
                                    : current.filter((d) => d !== day.value)
                                );
                              }}
                            />
                            <label htmlFor={day.value} className="text-sm">
                              {day.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Services */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{t('services')}</Label>
                {watch('staff_id') && filteredServices.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-services"
                      checked={showServices}
                      onCheckedChange={setShowServices}
                    />
                    <Label htmlFor="show-services" className="text-xs font-normal cursor-pointer">
                      {t('customizeServices')}
                    </Label>
                  </div>
                )}
              </div>

              {!watch('staff_id') && (
                <p className="text-xs text-muted-foreground mb-2">
                  {t('selectStaffFirst')}
                </p>
              )}

              {watch('staff_id') && filteredServices.length === 0 && (
                <p className="text-xs text-amber-600 mb-2">
                  {t('noQualifiedServices')}
                </p>
              )}

              {watch('staff_id') && filteredServices.length > 0 && !showServices && (
                <div className="border p-3 bg-muted" style={{borderRadius: "10px"}}>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {t('servicesSelected', { count: selectedServices.length, s: selectedServices.length !== 1 ? 's' : '' })}
                    </span>
                    <span>•</span>
                    <span>{t('allServicesIncluded')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('toggleCustomize')}
                  </p>
                </div>
              )}

              {showServices && (
                <div className="mt-2 space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                  {!watch('staff_id') ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      {t('viewQualified')}
                    </div>
                  ) : filteredServices.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      {t('noQualifications')}
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        {t('showingServices', { count: selectedServices.length, total: filteredServices.length })}
                      </p>
                      {filteredServices.map((service) => (
                        <div key={service.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={service.id}
                            className="rounded-full"
                            checked={selectedServices.includes(service.id)}
                            onCheckedChange={() => toggleService(service.id)}
                          />
                          <div className="flex-1">
                            <label htmlFor={service.id} className="text-sm font-medium cursor-pointer">
                              {service.name}
                            </label>
                            {/* {selectedServices.includes(service.id) && (
                              <Input
                                type="number"
                                min="1"
                                placeholder={t('maxBookings')}
                                value={watch(`max_concurrent_bookings.${service.id}`) || ''}
                                onChange={(e) => {
                                  const value = e.target.value ? parseInt(e.target.value) : null;
                                  setValue(`max_concurrent_bookings.${service.id}`, value);
                                }}
                                className="mt-1 h-8 text-xs"
                              />
                            )} */}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Priority */}
            {/* <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">{t('priority')}</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  {...register('priority', { valueAsNumber: true })}
                />
              </div>
            </div> */}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t('notes')}</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder={t('optionalNotes')}
                rows={2}
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t('cancel')}
            </Button>
          </DialogClose>

          <Button
            form="shift-form"
            type="submit"
            disabled={isSubmitting || selectedServices.length === 0}
          >
            {isSubmitting ? t('creating') : t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!conflictData} onOpenChange={(open) => !open && setConflictData(null)}>
      <AlertDialogContent className="rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Shift Conflicts Detected</AlertDialogTitle>
          <AlertDialogDescription asChild className="space-y-2">
            <div>
              <p>Some occurrences of this recurring shift conflict with holiday breaks or existing schedules:</p>
              <ul className="list-disc pl-4 text-xs max-h-32 overflow-y-auto">
                {conflictData?.conflicts.map((c, i) => (
                  <li key={i}>{c.message}</li>
                ))}
              </ul>
              <p>Would you like to create the shift and automatically skip these conflicting dates?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConflictData(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSkipAndCreate} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Skip and Create'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
