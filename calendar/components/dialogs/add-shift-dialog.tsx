"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useDisclosure } from "@/hooks/use-disclosure";
import { useCalendar } from "@/calendar/contexts/calendar-context";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogClose, DialogContent, DialogTrigger, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { buildRecurrenceRule, RecurrenceOptions } from "@/lib/types/shift";
import { Staff } from "@/lib/types/staff";
import { Location } from "@/lib/types/location_simple";
import { Service } from "@/lib/types/service";

interface IProps {
  children: React.ReactNode;
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
  recurrence_days?: string[];
  recurrence_until?: string;
  priority: number;
  notes: string;
  service_ids: string[];
  max_concurrent_bookings: { [key: string]: number | null };
}

export function AddShiftDialog({ children, startDate, startTime, onShiftCreated }: IProps) {
  const { isOpen, onClose, onToggle } = useDisclosure();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [staffLocationMap, setStaffLocationMap] = useState<{ [key: string]: string[] }>({});
  const [staffServiceMap, setStaffServiceMap] = useState<{ [key: string]: string[] }>({});
  const [showServices, setShowServices] = useState(false);

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
        // Get cache version from localStorage (updated on mutations) or use timestamp
        const { getStaffAssignmentsCacheVersion } = await import('@/lib/utils/cache-invalidation');
        const cacheVersion = getStaffAssignmentsCacheVersion();
        
        // Fetch all data in parallel - single API call for staff with assignments
        // Add cache version to bust cache when mutations occur
        const [staffResponse, locationsResponse, servicesResponse] = await Promise.all([
          fetch(`/api/staff?active_only=true&limit=1000&with_assignments=true&v=${cacheVersion}`, {
            cache: 'no-store', // Always fetch fresh when dialog opens
          }),
          fetch('/api/locations-simple?active_only=true&limit=1000'),
          fetch('/api/services?active_only=true&limit=1000'),
        ]);

        const [staffData, locationsData, servicesData] = await Promise.all([
          staffResponse.json(),
          locationsResponse.json(),
          servicesResponse.json(),
        ]);

        if (staffData.success) {
          const staffList = staffData.data || [];
          setStaff(staffList);
          
          // Build staff-location and staff-service mappings from the single response
          const locationMapping: { [key: string]: string[] } = {};
          const serviceMapping: { [key: string]: string[] } = {};
          
          for (const member of staffList) {
            locationMapping[member.id] = member.location_ids || [];
            serviceMapping[member.id] = member.service_ids || [];
          }
          
          setStaffLocationMap(locationMapping);
          setStaffServiceMap(serviceMapping);
        }

        if (locationsData.success) {
          setLocations(locationsData.data || []);
        }

        if (servicesData.success) {
          setServices(servicesData.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchData();
    } else {
      // Reset state when dialog closes
      setSelectedServices([]);
      setShowServices(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Set initial date/time when dialog opens
  useEffect(() => {
    if (isOpen && startDate && startTime) {
      const start = new Date(startDate);
      start.setHours(startTime.hour, startTime.minute, 0, 0);
      
      const end = new Date(start);
      end.setHours(start.getHours() + 1); // Default 1 hour duration

      setValue('start_time', formatDateTimeLocal(start));
      setValue('end_time', formatDateTimeLocal(end));
    } else if (isOpen && startDate) {
      const start = new Date(startDate);
      start.setHours(9, 0, 0, 0); // Default 9 AM
      
      const end = new Date(start);
      end.setHours(17, 0, 0, 0); // Default 5 PM

      setValue('start_time', formatDateTimeLocal(start));
      setValue('end_time', formatDateTimeLocal(end));
    }
  }, [isOpen, startDate, startTime, setValue]);

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const onSubmit = async (data: ShiftFormData) => {
    setIsSubmitting(true);
    try {
      // Build recurrence rule if recurring
      let recurrence_rule = null;
      if (data.is_recurring && data.recurrence_frequency) {
        const recurrenceOptions: RecurrenceOptions = {
          frequency: data.recurrence_frequency,
          daysOfWeek: data.recurrence_days as RecurrenceOptions['daysOfWeek'],
          until: data.recurrence_until,
        };
        recurrence_rule = buildRecurrenceRule(recurrenceOptions);
      }

      const requestBody = {
        staff_id: data.staff_id,
        location_id: data.location_id,
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
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
        if (result.conflicts) {
          alert(`Shift conflicts detected:\n${result.conflicts.map((c: any) => c.message).join('\n')}`);
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
      alert(err instanceof Error ? err.message : 'Failed to save shift');
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

  return (
    <Dialog open={isOpen} onOpenChange={onToggle}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Shift</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <form id="shift-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Staff Selection */}
            <div>
              <Label htmlFor="staff_id">Staff Member *</Label>
              <Select
                value={watch('staff_id')}
                onValueChange={handleStaffChange}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? "Loading..." : "Select staff member"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Loading staff...
                    </div>
                  ) : filteredStaff.length === 0 ? (
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
            <div>
              <Label htmlFor="location_id">Location *</Label>
              <Select
                value={watch('location_id')}
                onValueChange={handleLocationChange}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? "Loading..." : "Select location"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Loading locations...
                    </div>
                  ) : filteredLocations.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      {watch('staff_id') 
                        ? 'Selected staff is not assigned to any locations'
                        : 'No locations available'}
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

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  {...register('start_time', { required: 'Start time is required' })}
                />
                {errors.start_time && (
                  <p className="text-sm text-destructive mt-1">{errors.start_time.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  {...register('end_time', { required: 'End time is required' })}
                />
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
                <Label htmlFor="is_recurring">Recurring Shift</Label>
              </div>

              {watch('is_recurring') && (
                <div className="space-y-3 pl-6 border-l-2 border-muted">
                  <div>
                    <Label htmlFor="recurrence_frequency">Frequency *</Label>
                    <Select
                      value={watch('recurrence_frequency')}
                      onValueChange={(value) => setValue('recurrence_frequency', value as any)}
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
                      <Label>Days of Week</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
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
                    <Label htmlFor="recurrence_until">Repeat Until</Label>
                    <Input
                      id="recurrence_until"
                      type="date"
                      {...register('recurrence_until')}
                    />
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
                <Label>Services *</Label>
                {watch('staff_id') && filteredServices.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-services"
                      checked={showServices}
                      onCheckedChange={setShowServices}
                    />
                    <Label htmlFor="show-services" className="text-xs font-normal cursor-pointer">
                      Customize services
                    </Label>
                  </div>
                )}
              </div>

              {!watch('staff_id') && (
                <p className="text-xs text-muted-foreground mb-2">
                  Select a staff member first
                </p>
              )}

              {watch('staff_id') && filteredServices.length === 0 && (
                <p className="text-xs text-amber-600 mb-2">
                  Selected staff member is not qualified for any services
                </p>
              )}

              {watch('staff_id') && filteredServices.length > 0 && !showServices && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
                    </span>
                    <span>•</span>
                    <span>All staff services included</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Toggle "Customize services" to view and modify
                  </p>
                </div>
              )}

              {showServices && (
                <div className="mt-2 space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                  {!watch('staff_id') ? (
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
                        <div key={service.id} className="flex items-start space-x-2">
                          <Checkbox
                            id={service.id}
                            checked={selectedServices.includes(service.id)}
                            onCheckedChange={() => toggleService(service.id)}
                          />
                          <div className="flex-1">
                            <label htmlFor={service.id} className="text-sm font-medium cursor-pointer">
                              {service.name}
                            </label>
                            {selectedServices.includes(service.id) && (
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
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  {...register('priority', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Optional notes"
                rows={2}
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>

          <Button 
            form="shift-form" 
            type="submit" 
            disabled={isSubmitting || selectedServices.length === 0}
          >
            {isSubmitting ? 'Creating...' : 'Create Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

