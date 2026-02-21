'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimeInput } from '@/components/ui/time-input';
import { Time } from '@internationalized/date';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShiftWithDetails, buildRecurrenceRule, parseRecurrenceRule, RecurrenceOptions } from '@/lib/types/shift';
import { Staff } from '@/lib/types/staff';
import { Location } from '@/lib/types/location_simple';
import { Service } from '@/lib/types/service';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { toast } from 'sonner';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2, Plus, Loader2, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar02Icon } from '@hugeicons/core-free-icons';
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

interface ShiftFormProps {
  shift?: ShiftWithDetails;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  isViewMode?: boolean;
}

interface ShiftFormData {
  staff_id: string;
  location_id: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  recurrence_days?: string[];
  recurrence_until?: string;
  priority: number;
  notes: string;
  service_ids: string[];
  max_concurrent_bookings: { [key: string]: number | null };
}

export default function ShiftForm({ shift, onSave, onCancel, onDelete, isViewMode = false }: ShiftFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [staffServiceMap, setStaffServiceMap] = useState<{ [key: string]: string[] }>({});
  const [showServices, setShowServices] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [recurrenceUntilOpen, setRecurrenceUntilOpen] = useState(false);
  
  // Exception handling state
  const [showRecurringDeletePrompt, setShowRecurringDeletePrompt] = useState(false);
  const [showRecurringEditPrompt, setShowRecurringEditPrompt] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<ShiftFormData | null>(null);

  // Shift breaks state
  const [shiftBreaks, setShiftBreaks] = useState<any[]>([]);
  const [isLoadingBreaks, setIsLoadingBreaks] = useState(false);
  const [isAddingBreak, setIsAddingBreak] = useState(false);
  const [newBreakName, setNewBreakName] = useState('');
  const [newBreakStart, setNewBreakStart] = useState('');
  const [newBreakEnd, setNewBreakEnd] = useState('');

  // Editing shift breaks state
  const [editingBreakId, setEditingBreakId] = useState<string | null>(null);
  const [editBreakName, setEditBreakName] = useState('');
  const [editBreakStart, setEditBreakStart] = useState('');
  const [editBreakEnd, setEditBreakEnd] = useState('');
  const [isUpdatingBreak, setIsUpdatingBreak] = useState(false);

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
      priority: 1,
      notes: '',
      service_ids: [],
      max_concurrent_bookings: {},
    },
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch staff with assignments to get service mappings
        const { getStaffAssignmentsCacheVersion } = await import('@/lib/utils/cache-invalidation');
        const cacheVersion = getStaffAssignmentsCacheVersion();

        const staffResponse = await fetch(`/api/staff?active_only=true&limit=1000&with_assignments=true&v=${cacheVersion}`, {
          cache: 'no-store',
        });
        const staffData = await staffResponse.json();
        if (staffData.success) {
          const staffList = staffData.data || [];
          setStaff(staffList);

          // Build staff-service mapping
          const serviceMapping: { [key: string]: string[] } = {};
          for (const member of staffList) {
            serviceMapping[member.id] = member.service_ids || [];
          }
          setStaffServiceMap(serviceMapping);
        }

        // Fetch locations
        const locationsResponse = await fetch('/api/locations-simple?active_only=true&limit=1000');
        const locationsData = await locationsResponse.json();
        if (locationsData.success) {
          setLocations(locationsData.data || []);
        }

        // Fetch services
        const servicesResponse = await fetch('/api/services?active_only=true&limit=1000');
        const servicesData = await servicesResponse.json();
        if (servicesData.success) {
          setServices(servicesData.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper function to build timezone-aware ISO string from local datetime (enforces Europe/Amsterdam timezone)
  const formatDateTimeLocal = (isoString: string): string => {
    const { formatInTimeZone } = require('date-fns-tz');
    return formatInTimeZone(new Date(isoString), 'Europe/Amsterdam', "yyyy-MM-dd'T'HH:mm");
  };

  // Helper to create true ISO string from local YYYY-MM-DDTHH:mm keeping Europe/Amsterdam offset
  const createLocalIsoString = (localDateTimeStr: string): string => {
    const { formatInTimeZone, toDate } = require('date-fns-tz');
    const amsterdamDate = toDate(`${localDateTimeStr}:00`, { timeZone: 'Europe/Amsterdam' });
    return formatInTimeZone(amsterdamDate, 'Europe/Amsterdam', "yyyy-MM-dd'T'HH:mm:ssXXX");
  };

  // Load shift data if editing
  useEffect(() => {
    if (shift) {
      const recurrence = shift.recurrence_rule ? parseRecurrenceRule(shift.recurrence_rule) : null;

      reset({
        staff_id: shift.staff_id,
        location_id: shift.location_id,
        start_time: formatDateTimeLocal(shift.start_time), // Convert UTC to local time
        end_time: formatDateTimeLocal(shift.end_time), // Convert UTC to local time
        is_recurring: shift.is_recurring,
        recurrence_frequency: recurrence?.frequency,
        recurrence_days: recurrence?.daysOfWeek,
        recurrence_until: recurrence?.until,
        priority: shift.priority,
        notes: shift.notes || '',
        service_ids: shift.services.map(s => s.service_id),
        max_concurrent_bookings: shift.services.reduce((acc, s) => {
          acc[s.service_id] = s.max_concurrent_bookings;
          return acc;
        }, {} as { [key: string]: number | null }),
      });

      setSelectedServices(shift.services.map(s => s.service_id));
      
      // Fetch breaks for this shift
      const fetchBreaks = async () => {
        setIsLoadingBreaks(true);
        try {
          const response = await fetch(`/api/shift-breaks?shift_id=${shift.id}`);
          const data = await response.json();
          if (data.success) {
            setShiftBreaks(data.data || []);
          }
        } catch (error) {
          console.error('Error fetching shift breaks:', error);
        } finally {
          setIsLoadingBreaks(false);
        }
      };
      fetchBreaks();
    }
  }, [shift, reset]);

  const deleteShiftBreak = async (id: string) => {
    try {
      if (id.startsWith('inherited-')) {
        // It's a virtual break. To "delete" it, we must create a local tombstone (override).
        const sitewideId = id.replace('inherited-', '');
        const inheritedBreak = shiftBreaks.find(b => b.id === id);
        if (!inheritedBreak || !shift) return;
        
        const payload = {
          shift_id: shift.id,
          sitewide_break_id: sitewideId,
          name: inheritedBreak.name,
          start_time: inheritedBreak.start_time,
          end_time: inheritedBreak.start_time // 0 duration marks as deleted/overridden
        };

        const response = await fetch('/api/shift-breaks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          setShiftBreaks(prev => prev.filter(b => b.id !== id));
          toast.success('Break removed');
        } else {
          toast.error('Failed to remove break');
        }
      } else {
        const response = await fetch(`/api/shift-breaks/${id}`, { method: 'DELETE' });
        if (response.ok) {
          setShiftBreaks(prev => prev.filter(b => b.id !== id));
          toast.success('Break removed');
        } else {
          toast.error('Failed to remove break');
        }
      }
    } catch {
      toast.error('Failed to remove break');
    }
  };

  const addShiftBreak = async () => {
    if (!shift || !newBreakName || !newBreakStart || !newBreakEnd) return;
    setIsAddingBreak(true);
    try {
      const shiftDate = shift.start_time.split('T')[0];
      const startIso = createLocalIsoString(`${shiftDate}T${newBreakStart}`);
      const endIso = createLocalIsoString(`${shiftDate}T${newBreakEnd}`);
      
      const payload = {
        shift_id: shift.id,
        name: newBreakName,
        start_time: startIso,
        end_time: endIso
      };

      const response = await fetch('/api/shift-breaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        setShiftBreaks(prev => [...prev].concat(data.data).sort((a,b) => a.start_time.localeCompare(b.start_time)));
        setNewBreakName('');
        setNewBreakStart('');
        setNewBreakEnd('');
        toast.success('Break added');
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Failed to add break');
    } finally {
      setIsAddingBreak(false);
    }
  };

  const startEditingBreak = (b: any) => {
    setEditingBreakId(b.id);
    setEditBreakName(b.name);
    // Extract HH:mm from ISO
    const sDate = new Date(b.start_time);
    const eDate = new Date(b.end_time);
    const sHours = String(sDate.getHours()).padStart(2, '0');
    const sMins = String(sDate.getMinutes()).padStart(2, '0');
    setEditBreakStart(`${sHours}:${sMins}`);
    const eHours = String(eDate.getHours()).padStart(2, '0');
    const eMins = String(eDate.getMinutes()).padStart(2, '0');
    setEditBreakEnd(`${eHours}:${eMins}`);
  };

  const cancelEditingBreak = () => {
    setEditingBreakId(null);
    setEditBreakName('');
    setEditBreakStart('');
    setEditBreakEnd('');
  };

  const updateShiftBreak = async () => {
    if (!shift || !editingBreakId || !editBreakName || !editBreakStart || !editBreakEnd) return;
    setIsUpdatingBreak(true);
    try {
      const shiftDate = shift.start_time.split('T')[0];
      const startIso = createLocalIsoString(`${shiftDate}T${editBreakStart}`);
      const endIso = createLocalIsoString(`${shiftDate}T${editBreakEnd}`);
      
      const payload: any = {
        name: editBreakName,
        start_time: startIso,
        end_time: endIso
      };

      let response;
      if (editingBreakId.startsWith('inherited-')) {
        // Create an override record
        payload.shift_id = shift.id;
        payload.sitewide_break_id = editingBreakId.replace('inherited-', '');
        response = await fetch('/api/shift-breaks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`/api/shift-breaks/${editingBreakId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      
      const data = await response.json();
      if (data.success) {
        setShiftBreaks(prev => prev.map(b => b.id === editingBreakId ? data.data : b).sort((a,b) => a.start_time.localeCompare(b.start_time)));
        cancelEditingBreak();
        toast.success('Break updated');
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Failed to update break');
    } finally {
      setIsUpdatingBreak(false);
    }
  };

  const onSubmit = async (data: ShiftFormData) => {
    if (shift && shift._isRecurringInstance && shift._instanceDate) {
      // Don't save immediately. Intercept to ask "Only this occurrence" vs "All occurrences"
      setPendingSubmitData(data);
      setShowRecurringEditPrompt(true);
      return;
    }

    await performSubmit(data, false);
  };

  const performSubmit = async (data: ShiftFormData, asSingleOccurrence: boolean) => {
    setIsSubmitting(true);
    try {
      // Build recurrence rule if recurring
      let recurrence_rule = null;
      if (data.is_recurring && data.recurrence_frequency && !asSingleOccurrence) {
        const recurrenceOptions: RecurrenceOptions = {
          frequency: data.recurrence_frequency,
          daysOfWeek: data.recurrence_days as RecurrenceOptions['daysOfWeek'],
          until: data.recurrence_until,
        };
        recurrence_rule = buildRecurrenceRule(recurrenceOptions);
      }

      let requestBody: any = {
        staff_id: data.staff_id,
        location_id: data.location_id,
        start_time: createLocalIsoString(data.start_time),
        end_time: createLocalIsoString(data.end_time),
        is_recurring: asSingleOccurrence ? false : data.is_recurring,
        recurrence_rule: asSingleOccurrence ? null : recurrence_rule,
        priority: data.priority,
        notes: data.notes || null,
        service_ids: selectedServices,
        max_concurrent_bookings: data.max_concurrent_bookings,
      };

      let url = shift ? `/api/shifts/${shift._originalShiftId || shift.id}` : '/api/shifts';
      let method = shift ? 'PUT' : 'POST';

      if (asSingleOccurrence && shift?._instanceDate) {
        // We are creating a brand new shift that acts as an exception to the parent series.
        // It's a POST, not a PUT, because the single occurrence didn't exist in the DB yet.
        url = '/api/shifts';
        method = 'POST';
        requestBody.parent_shift_id = shift._originalShiftId || shift.id;
        requestBody.exception_date = shift._instanceDate.split('T')[0];
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.conflicts) {
          alert(`Shift conflicts detected:\n${result.conflicts.map((c: { message: string }) => c.message).join('\n')}`);
        } else {
          throw new Error(result.error || 'Failed to save shift');
        }
        return;
      }

      setShowRecurringEditPrompt(false);
      setPendingSubmitData(null);
      onSave();
    } catch (err) {
      console.error('Error saving shift:', err);
      alert(err instanceof Error ? err.message : 'Failed to save shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const performDelete = async () => {
    if (!shift?.id || !onDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/shifts/${shift.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete shift');
      }

      toast.success('Shift deleted', {
        description: 'The shift has been deleted successfully.',
      });

      setShowDeleteDialog(false);
      setShowRecurringDeletePrompt(false);
      onDelete();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete shift';
      toast.error('Failed to delete shift', {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateDeleteException = async () => {
    if (!shift?.id || !onDelete || !shift._instanceDate) return;

    setIsDeleting(true);
    try {
      // The backend expects the YYYY-MM-DD of the instance to delete
      const exceptionDate = shift._instanceDate.split('T')[0];
      
      const response = await fetch(`/api/shifts/${shift._originalShiftId || shift.id}/exceptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ exception_date: exceptionDate }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete shift instance');
      }

      toast.success('Shift occurrence deleted', {
        description: 'This specific occurrence has been removed from the calendar.',
      });

      setShowRecurringDeletePrompt(false);
      onDelete();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete shift instance';
      toast.error('Failed to delete shift instance', {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  // Filter services based on staff qualifications (when editing, use shift's staff_id)
  const staffId = shift ? shift.staff_id : watch('staff_id');
  const filteredServices = staffId
    ? services.filter(svc => staffServiceMap[staffId]?.includes(svc.id))
    : services;

  const weekDays = [
    { value: 'MO', label: 'Monday' },
    { value: 'TU', label: 'Tuesday' },
    { value: 'WE', label: 'Wednesday' },
    { value: 'TH', label: 'Thursday' },
    { value: 'FR', label: 'Friday' },
    { value: 'SA', label: 'Saturday' },
    { value: 'SU', label: 'Sunday' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Staff Selection - Only show when creating new shift */}
      {!shift && (
        <div>
          <Label htmlFor="staff_id" className="text-xs font-semibold mb-2">Staff Member *</Label>
          <Select
            value={watch('staff_id')}
            onValueChange={(value) => setValue('staff_id', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.staff_id && (
            <p className="text-sm text-destructive mt-1">{errors.staff_id.message}</p>
          )}
        </div>
      )}

      {/* Location Selection - Only show when creating new shift */}
      {!shift && (
        <div>
          <Label htmlFor="location_id" className="text-xs font-semibold mb-2">Location *</Label>
          <Select
            value={watch('location_id')}
            onValueChange={(value) => setValue('location_id', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.location_id && (
            <p className="text-sm text-destructive mt-1">{errors.location_id.message}</p>
          )}
        </div>
      )}

      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-semibold mb-2 block">Start Time *</Label>
          <div className="flex gap-2">
            <Popover modal={true} open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "flex-1 justify-start text-left font-normal h-10 px-3 border-input bg-background",
                    !watch('start_time') && "text-muted-foreground"
                  )}
                  disabled={isViewMode}
                >
                 <HugeiconsIcon icon={Calendar02Icon} />
                  {watch('start_time') ? format(new Date(watch('start_time')), "P") : <span>Pick date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watch('start_time') ? new Date(watch('start_time')) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const current = watch('start_time') ? new Date(watch('start_time')) : new Date();
                      date.setHours(current.getHours(), current.getMinutes());
                      setValue('start_time', formatDateTimeLocal(date.toISOString()));
                      setStartDateOpen(false);

                      // Auto-populate End Date to match the new Start Date, preserving existing end time
                      const currentEnd = watch('end_time') ? new Date(watch('end_time')) : new Date();
                      const newEndDate = new Date(date);
                      newEndDate.setHours(currentEnd.getHours(), currentEnd.getMinutes());
                      setValue('end_time', formatDateTimeLocal(newEndDate.toISOString()));
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
              dateInputClassName="h-10"
              hourCycle={24}
              value={watch('start_time') ? new Time(new Date(watch('start_time')).getHours(), new Date(watch('start_time')).getMinutes()) : null}
              onChange={(time) => {
                if (time) {
                  const date = watch('start_time') ? new Date(watch('start_time')) : new Date();
                  date.setHours(time.hour, time.minute);
                  setValue('start_time', formatDateTimeLocal(date.toISOString()));
                }
              }}
              disabled={isViewMode}
            />
            <input type="hidden" {...register('start_time', { required: 'Start time is required' })} />
          </div>
          {errors.start_time && (
            <p className="text-sm text-destructive mt-1">{errors.start_time.message}</p>
          )}
        </div>

        <div>
          <Label className="text-xs font-semibold mb-2 block">End Time *</Label>
          <div className="flex gap-2">
            <Popover modal={true} open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "flex-1 justify-start text-left font-normal h-10 px-3 border-input bg-background",
                    !watch('end_time') && "text-muted-foreground"
                  )}
                  disabled={isViewMode}
                >
                  <HugeiconsIcon icon={Calendar02Icon} />
                  {watch('end_time') ? format(new Date(watch('end_time')), "P") : <span>Pick date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watch('end_time') ? new Date(watch('end_time')) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const current = watch('end_time') ? new Date(watch('end_time')) : new Date();
                      date.setHours(current.getHours(), current.getMinutes());
                      setValue('end_time', formatDateTimeLocal(date.toISOString()));
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
              dateInputClassName="h-10"
              hourCycle={24}
              value={watch('end_time') ? new Time(new Date(watch('end_time')).getHours(), new Date(watch('end_time')).getMinutes()) : null}
              onChange={(time) => {
                if (time) {
                  const date = watch('end_time') ? new Date(watch('end_time')) : new Date();
                  date.setHours(time.hour, time.minute);
                  setValue('end_time', formatDateTimeLocal(date.toISOString()));
                }
              }}
              disabled={isViewMode}
            />
            <input type="hidden" {...register('end_time', { required: 'End time is required' })} />
          </div>
          {errors.end_time && (
            <p className="text-sm text-destructive mt-1">{errors.end_time.message}</p>
          )}
        </div>
      </div>

      {/* Recurring Shift */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_recurring"
            checked={watch('is_recurring')}
            onCheckedChange={(checked) => setValue('is_recurring', checked)}
            disabled={isViewMode}
          />
          <Label htmlFor="is_recurring" className='mb-0'>Recurring Shift</Label>
        </div>

        {watch('is_recurring') && (
          <div className="space-y-4 pl-6 border-l-2 border-muted">
            <div>
              <Label htmlFor="recurrence_frequency" className="text-xs font-semibold mb-2">Frequency *</Label>
              <Select
                value={watch('recurrence_frequency')}
                onValueChange={(value) => setValue('recurrence_frequency', value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY')}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {watch('recurrence_frequency') === 'WEEKLY' && (
              <div>
                <Label className="text-xs font-semibold mb-2">Days of Week</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {weekDays.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={day.value}
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
                        disabled={isViewMode}
                      />
                      <label htmlFor={day.value} className="text-sm">
                        {day.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="recurrence_until" className="text-xs font-semibold mb-2">Repeat Until (Optional)</Label>
              <Popover modal={true} open={recurrenceUntilOpen} onOpenChange={setRecurrenceUntilOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 px-3 bg-background",
                      !watch('recurrence_until') && "text-muted-foreground"
                    )}
                    disabled={isViewMode}
                  >
                    <HugeiconsIcon icon={Calendar02Icon} />
                    <span className="truncate">
                      {watch('recurrence_until') ? format(new Date(watch('recurrence_until')!), "P") : "Pick date"}
                    </span>
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
                      }
                    }}
                    initialFocus
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      // Recurrence until date should be after the start date
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
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to repeat indefinitely
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Services */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">Services *</Label>
          {!isLoading && staffId && filteredServices.length > 0 && (
            <div className="flex items-center space-x-2">
              <Switch
                id="show-services"
                checked={showServices}
                onCheckedChange={setShowServices}
                disabled={isViewMode}
              />
              <Label htmlFor="show-services" className="text-xs font-normal cursor-pointer">
                Customize services
              </Label>
            </div>
          )}
        </div>

        {!staffId && !shift && (
          <p className="text-xs text-muted-foreground mb-2">
            Select a staff member first
          </p>
        )}

        {isLoading && staffId && (
          <p className="text-xs text-muted-foreground mb-2">
            Loading services...
          </p>
        )}

        {!isLoading && staffId && filteredServices.length === 0 && (
          <p className="text-xs text-amber-600 mb-2">
            Selected staff member is not qualified for any services
          </p>
        )}

        {!isLoading && staffId && filteredServices.length > 0 && !showServices && (
          <div className="border rounded-lg p-3 bg-muted" style={{ borderRadius: "10px" }}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
              </span>
              <span>•</span>
              <span>All staff services included</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Toggle &quot;Customize services&quot; to view and modify
            </p>
          </div>
        )}

        {showServices && (
          <div className="mt-2 space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Loading services...
              </div>
            ) : !staffId ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Please select a staff member to see their qualified services
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                This staff member has no service qualifications assigned
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  Showing {selectedServices.length} of {filteredServices.length} services selected
                </p>
                {filteredServices.map((service) => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={service.id}
                      className="rounded-full"
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={() => toggleService(service.id)}
                      disabled={isViewMode}
                    />
                    <div className="flex-1">
                      <label htmlFor={service.id} className="text-sm font-medium cursor-pointer">
                        {service.name}
                      </label>
                      {/* {selectedServices.includes(service.id) && (
                        <Input
                          type="number"
                          min="1"
                          placeholder="Max bookings (optional)"
                          value={watch(`max_concurrent_bookings.${service.id}`) || ''}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : null;
                            setValue(`max_concurrent_bookings.${service.id}`, value);
                          }}
                          className="mt-1 h-8 text-xs"
                          disabled={isViewMode}
                        />
                      )} */}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {!showServices && staffId && filteredServices.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Select services that can be booked during this shift
          </p>
        )}
      </div>

      {/* Priority */}
      {/* <div>
        <Label htmlFor="priority" className="text-xs font-semibold mb-2">Priority</Label>
        <Input
          id="priority"
          type="number"
          min="1"
          {...register('priority', { valueAsNumber: true })}
          disabled={isViewMode}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Higher priority shifts take precedence when overlapping
        </p>
      </div> */}

      {/* Notes */}
      <div>
        <Label htmlFor="notes" className="text-xs font-semibold mb-2">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Optional notes about this shift"
          rows={3}
          disabled={isViewMode}
        />
      </div>

      {/* Shift Breaks - Only when editing */}
      {shift && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Shift Breaks</Label>
          </div>
          {isLoadingBreaks ? (
            <p className="text-xs text-muted-foreground">Loading breaks...</p>
          ) : shiftBreaks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No breaks scheduled for this shift.</p>
          ) : (
            <div className="space-y-2">
              {shiftBreaks.map(b => (
                <div key={b.id} className="flex flex-col gap-2 border rounded p-2 text-sm bg-muted/20">
                  {editingBreakId === b.id ? (
                    <div className="flex items-center space-x-2 w-full">
                      <Input 
                        placeholder="Break name" 
                        value={editBreakName} 
                        onChange={e => setEditBreakName(e.target.value)} 
                        className="h-8 flex-1 text-xs"
                      />
                      <Input 
                        type="time" 
                        value={editBreakStart} 
                        onChange={e => setEditBreakStart(e.target.value)} 
                        className="h-8 w-20 text-xs px-2"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input 
                        type="time" 
                        value={editBreakEnd} 
                        onChange={e => setEditBreakEnd(e.target.value)} 
                        className="h-8 w-20 text-xs px-2"
                      />
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:text-green-700" onClick={updateShiftBreak} disabled={isUpdatingBreak || !editBreakName || !editBreakStart || !editBreakEnd}>
                        {isUpdatingBreak ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={cancelEditingBreak} disabled={isUpdatingBreak}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{b.name}</p>
                          {b.id.startsWith('inherited-') && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Sitewide</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{format(new Date(b.start_time), 'HH:mm')} - {format(new Date(b.end_time), 'HH:mm')}</p>
                      </div>
                      {!isViewMode && (
                        <div className="flex items-center space-x-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => startEditingBreak(b)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => deleteShiftBreak(b.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive/90">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Add Break Form */}
          {!isViewMode && (
            <div className="flex items-center space-x-2 mt-2">
              <Input 
                placeholder="Break name" 
                value={newBreakName} 
                onChange={e => setNewBreakName(e.target.value)} 
                className="h-9 flex-1 text-sm"
              />
              <Input 
                type="time" 
                value={newBreakStart} 
                onChange={e => setNewBreakStart(e.target.value)} 
                className="h-9 w-24 text-sm"
              />
              <span className="text-muted-foreground">-</span>
              <Input 
                type="time" 
                value={newBreakEnd} 
                onChange={e => setNewBreakEnd(e.target.value)} 
                className="h-9 w-24 text-sm"
              />
              <Button type="button" variant="outline" size="sm" className="h-9" disabled={!newBreakName || !newBreakStart || !newBreakEnd || isAddingBreak} onClick={addShiftBreak}>
                {isAddingBreak ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Form Actions */}
      {!isViewMode && (
        <div className="flex space-x-2 pt-4 border-t">
          {shift && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (shift._isRecurringInstance && shift._instanceDate) {
                  setShowRecurringDeletePrompt(true);
                } else {
                  setShowDeleteDialog(true);
                }
              }}
              className="mr-auto"
              disabled={isSubmitting || isDeleting}
            >
              Delete
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isDeleting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isDeleting || selectedServices.length === 0}>
            {isSubmitting ? 'Saving...' : shift ? 'Update Shift' : 'Create Shift'}
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialogs */}
      {shift && onDelete && (
        <>
          {/* Standard Delete Dialog for Non-Recurring or Single Shifts */}
          <DeleteConfirmationDialog
            isOpen={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
            onConfirm={performDelete}
            title="Delete Shift"
            description="Are you sure you want to delete this shift? This action cannot be undone."
            itemName={`Shift on ${new Date(shift.start_time).toLocaleDateString()}`}
            confirmButtonText={isDeleting ? 'Deleting...' : 'Delete'}
          />

          {/* Delete Prompt for Recurring Shifts */}
          <AlertDialog open={showRecurringDeletePrompt} onOpenChange={setShowRecurringDeletePrompt}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Recurring Shift</AlertDialogTitle>
                <AlertDialogDescription>
                  This shift is part of a recurring series. Do you want to delete only this occurrence, or the entire series?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <Button 
                  variant="outline" 
                  onClick={handleCreateDeleteException}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Only this occurrence
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={performDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Entire series
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Edit Prompt for Recurring Shifts (Rendered outside shift conditionally based on pendingSubmitData) */}
      <AlertDialog open={showRecurringEditPrompt} onOpenChange={setShowRecurringEditPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Recurring Shift</AlertDialogTitle>
            <AlertDialogDescription>
              This shift is part of a recurring series. Do you want to apply these changes to only this occurrence, or the entire series?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={() => pendingSubmitData && performSubmit(pendingSubmitData, true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Only this occurrence
            </Button>
            <Button 
              onClick={() => pendingSubmitData && performSubmit(pendingSubmitData, false)}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Entire series
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
