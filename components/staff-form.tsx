'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, ChevronDown, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Staff, CreateStaffRequest, UpdateStaffRequest, StaffRole } from '@/lib/types/staff';
import { Location } from '@/lib/types/location_simple';
import { Service } from '@/lib/types/service';
import { User } from '@/lib/types/user';

interface StaffFormProps {
  staff?: Staff;
  onSave: (staff: CreateStaffRequest | UpdateStaffRequest) => void;
  onCancel: () => void;
}

interface StaffFormData {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  hire_date: string;
  role: StaffRole;
  bio: string;
  is_active: boolean;
  location_ids: string[];
  service_ids: string[];
  services: { service_id: string; is_twin_qualified: boolean }[];
}

export default function StaffForm({ staff, onSave, onCancel }: StaffFormProps) {
  const t = useTranslations('Staff.form');
  const tCommon = useTranslations('Common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue
  } = useForm<StaffFormData>({
    defaultValues: {
      user_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      hire_date: '',
      role: 'technician',
      bio: '',
      location_ids: [],
      service_ids: [],
      services: []
    },
  });

  // Reset form when staff changes
  useEffect(() => {
    if (staff) {
      // Fetch staff with locations and services
      const fetchStaffDetails = async () => {
        try {
          const response = await fetch(`/api/staff/${staff.id}`);
          const data = await response.json();

          if (data.success && data.data) {
            reset({
              user_id: data.data.user_id,
              first_name: data.data.first_name,
              last_name: data.data.last_name,
              email: data.data.email,
              phone: data.data.phone || '',
              hire_date: data.data.hire_date || '',
              role: data.data.role,
              bio: data.data.bio || '',
              is_active: data.data.is_active,
              location_ids: data.data.location_ids || [],
              service_ids: data.data.service_ids || [],
              services: data.data.services || []
            });
          }
        } catch (error) {
          console.error('Error fetching staff details:', error);
          // Fallback to basic staff data
          reset({
            user_id: staff.user_id,
            first_name: staff.first_name,
            last_name: staff.last_name,
            email: staff.email,
            phone: staff.phone || '',
            hire_date: staff.hire_date || '',
            role: staff.role,
            bio: staff.bio || '',
            is_active: staff.is_active,
            location_ids: [],
            service_ids: [],
            services: []
          });
        }
      };

      fetchStaffDetails();
    } else {
      reset({
        user_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        hire_date: '',
        role: 'technician',
        bio: '',
        is_active: true,
        location_ids: [],
        service_ids: [],
        services: []
      });
    }
  }, [staff, reset]);

  // Fetch locations, services, and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch locations
        const locationsResponse = await fetch('/api/locations-simple');
        const locationsData = await locationsResponse.json();
        if (locationsData.success) {
          setLocations(locationsData.data || []);
        }

        // Fetch services
        const servicesResponse = await fetch(`/api/services?limit=100&t=${Date.now()}`, { cache: 'no-store' });
        const servicesData = await servicesResponse.json();
        if (servicesData.success) {
          setServices(servicesData.data || []);
        }

        // Fetch users (for user_id selection)
        const usersResponse = await fetch('/api/users');
        const usersData = await usersResponse.json();
        if (usersData.success) {
          const usersList = (usersData.data || []).filter(
            (user: User) => user.role !== 'staff' && user.role !== 'midwife' && user.role !== 'admin'
          );
          setUsers(usersList);
          setFilteredUsers(usersList);
        } else {
          console.error('Users API error:', usersData.error);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Filter users based on search term
  useEffect(() => {
    if (userSearchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.first_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [userSearchTerm, users]);

  // Handle user selection and prefill form fields
  const handleUserSelect = (userId: string) => {
    setValue('user_id', userId);

    // Find the selected user
    const selectedUser = users.find(user => user.id === userId);
    if (selectedUser) {
      // Prefill fields from user data
      if (selectedUser.first_name) {
        setValue('first_name', selectedUser.first_name);
      }
      if (selectedUser.last_name) {
        setValue('last_name', selectedUser.last_name);
      }
      if (selectedUser.email) {
        setValue('email', selectedUser.email);
      }
      if (selectedUser.phone) {
        setValue('phone', selectedUser.phone);
      }
    }
  };

  const onSubmit = async (data: StaffFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLocation = (locationId: string) => {
    const current = watch('location_ids');
    if (current.includes(locationId)) {
      setValue('location_ids', current.filter(id => id !== locationId));
    } else {
      setValue('location_ids', [...current, locationId]);
    }
  };

  const removeLocation = (locationId: string) => {
    setValue('location_ids', watch('location_ids').filter(id => id !== locationId));
  };

  const toggleService = (serviceId: string) => {
    const currentIds = watch('service_ids');
    const currentServices = watch('services') || [];

    if (currentIds.includes(serviceId)) {
      setValue('service_ids', currentIds.filter(id => id !== serviceId));
      setValue('services', currentServices.filter(s => s.service_id !== serviceId));
    } else {
      setValue('service_ids', [...currentIds, serviceId]);
      setValue('services', [...currentServices, { service_id: serviceId, is_twin_qualified: false }]);
    }
  };

  const removeService = (serviceId: string) => {
    setValue('service_ids', watch('service_ids').filter(id => id !== serviceId));
    setValue('services', (watch('services') || []).filter(s => s.service_id !== serviceId));
  };

  const toggleTwinQualification = (serviceId: string) => {
    const currentServices = watch('services') || [];
    const index = currentServices.findIndex(s => s.service_id === serviceId);

    if (index >= 0) {
      const newServices = [...currentServices];
      newServices[index] = {
        ...newServices[index],
        is_twin_qualified: !newServices[index].is_twin_qualified
      };
      setValue('services', newServices);
    }
  };

  // Get selected items
  const selectedLocations = locations.filter(loc => watch('location_ids').includes(loc.id));
  const selectedServices = services.filter(svc => watch('service_ids').includes(svc.id));

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto space-y-12 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* User Selection (only for new staff) */}
            {!staff && (
              <div className="md:col-span-2">
                <Label htmlFor="user_id" className="text-xs font-semibold mb-2">{t('userAccount')}</Label>
                <Select
                  value={watch('user_id')}
                  onValueChange={handleUserSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('userPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {/* Search Input Inside Dropdown */}
                    <div className="p-2 border-b space-y-2">
                      <Input
                        placeholder={t('userSearchPlaceholder')}
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="h-8"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* User List */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredUsers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          {userSearchTerm ? t('noUsers') : t('noUsersAvailable')}
                        </div>
                      ) : (
                        filteredUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {user.first_name} {user.last_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {user.email} • {user.role}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </div>
                  </SelectContent>
                </Select>
                {errors.user_id && (
                  <p className="text-sm text-destructive mt-1">{errors.user_id.message}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {t('userHint')}
                </p>
              </div>
            )}

            {/* First Name */}
            <div>
              <Label htmlFor="first_name" className="text-xs font-semibold mb-2">{t('firstName')}</Label>
              <Input
                id="first_name"
                {...register('first_name', { required: t('validation.firstNameRequired') })}
                placeholder="John"
              />
              {errors.first_name && (
                <p className="text-sm text-destructive mt-1">{errors.first_name.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <Label htmlFor="last_name" className="text-xs font-semibold mb-2">{t('lastName')}</Label>
              <Input
                id="last_name"
                {...register('last_name', { required: t('validation.lastNameRequired') })}
                placeholder="Doe"
              />
              {errors.last_name && (
                <p className="text-sm text-destructive mt-1">{errors.last_name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-xs font-semibold mb-2">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                {...register('email', {
                  required: t('validation.emailRequired'),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: t('validation.emailInvalid')
                  }
                })}
                placeholder="john.doe@clinic.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone" className="text-xs font-semibold mb-2">{t('phone')}</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+1-555-0123"
              />
            </div>

            {/* Hire Date */}
            <div>
              <Label htmlFor="hire_date" className="text-xs font-semibold mb-2">{t('hireDate')}</Label>
              <Popover modal={true} open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-12 border border-gray-200 bg-gray-50",
                      !watch('hire_date') && "text-muted-foreground"
                    )}
                    style={{ borderRadius: '0.2rem' }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch('hire_date') ? format(new Date(watch('hire_date')), "PPP") : <span>{t('pickDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watch('hire_date') ? new Date(watch('hire_date')) : undefined}
                    onSelect={(date) => {
                      setValue('hire_date', date ? format(date, 'yyyy-MM-dd') : '');
                      setDatePickerOpen(false);
                    }}
                    initialFocus
                    captionLayout="dropdown"
                    fromYear={1990}
                    toYear={2030}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Role */}
            <div>
              <Label htmlFor="role" className="text-xs font-semibold mb-2">{t('role')}</Label>
              <Select
                value={watch('role')}
                onValueChange={(value) => setValue('role', value as StaffRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technician">{t('roles.technician')}</SelectItem>
                  <SelectItem value="supervisor">{t('roles.supervisor')}</SelectItem>
                  <SelectItem value="manager">{t('roles.manager')}</SelectItem>
                  <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bio */}
            <div className="md:col-span-2">
              <Label htmlFor="bio" className="text-xs font-semibold mb-2">{t('bio')}</Label>
              <Textarea
                id="bio"
                {...register('bio')}
                placeholder={t('bioPlaceholder')}
                rows={3}
              />
            </div>

            {/* Location Assignments */}
            <div className="md:col-span-2">
              <Label htmlFor="location_ids" className="text-xs font-semibold mb-2">{t('locations')}</Label>
              <Popover open={locationDropdownOpen} onOpenChange={setLocationDropdownOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={locationDropdownOpen}
                    className="w-full justify-between mt-1 bg-card h-11 border border-border active:bg-card hover:bg-card"
                    style={{ borderRadius: '0.2rem' }}
                  >
                    <span className="text-muted-foreground">
                      {selectedLocations.length === 0
                        ? t('locationsPlaceholder')
                        : `${selectedLocations.length} location${selectedLocations.length !== 1 ? 's' : ''} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandInput placeholder={t('locationsPlaceholder')} />
                    <CommandList className="max-h-[300px] overflow-y-auto overscroll-contain">
                      <CommandEmpty>{t('noLocations')}</CommandEmpty>
                      <CommandGroup>
                        {locations.map((location) => (
                          <CommandItem
                            key={location.id}
                            value={location.name}
                            onSelect={() => toggleLocation(location.id)}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="checkbox"
                                checked={watch('location_ids').includes(location.id)}
                                onChange={() => { }}
                                className="rounded"
                                aria-label={`Select ${location.name}`}
                              />
                              <span className="text-sm">{location.name}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected Locations as Badges */}
              {selectedLocations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedLocations.map((location) => (
                    <Badge key={location.id} variant="secondary" className="gap-1" style={{ borderRadius: '0.2rem' }}>
                      {location.name}
                      <button
                        type="button"
                        onClick={() => removeLocation(location.id)}
                        className="ml-1 hover:bg-muted-foreground/20"
                        style={{ borderRadius: '0.2rem' }}
                        aria-label={`Remove ${location.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Service Qualifications */}
            <div className="md:col-span-2">
              <Label htmlFor="service_ids" className="text-xs font-semibold mb-2">{t('services')}</Label>
              <Popover open={serviceDropdownOpen} onOpenChange={setServiceDropdownOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={serviceDropdownOpen}
                    className="w-full justify-between mt-1 bg-card h-11 border border-border active:bg-card hover:bg-card"
                    style={{ borderRadius: '0.2rem' }}
                  >
                    <span className="text-muted-foreground">
                      {selectedServices.length === 0
                        ? t('servicesPlaceholder')
                        : `${selectedServices.length} service${selectedServices.length !== 1 ? 's' : ''} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandInput placeholder={t('servicesPlaceholder')} />
                    <CommandList className="max-h-[300px] overflow-y-auto overscroll-contain">
                      <CommandEmpty>{t('noServices')}</CommandEmpty>
                      <CommandGroup>
                        {services.map((service) => (
                          <CommandItem
                            key={service.id}
                            value={service.name}
                            onSelect={() => toggleService(service.id)}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="checkbox"
                                checked={watch('service_ids').includes(service.id)}
                                onChange={() => { }}
                                className="rounded"
                                aria-label={`Select ${service.name}`}
                              />
                              <span className="text-sm">{service.name}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected Services as Badges */}
              {selectedServices.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedServices.map((service) => {
                    const qualification = (watch('services') || []).find(s => s.service_id === service.id);
                    const isTwinQualified = qualification?.is_twin_qualified || false;

                    return (
                      <Badge key={service.id} variant="secondary" className="gap-1 pr-1 items-center" style={{ borderRadius: '0.2rem' }}>
                        <div className="flex flex-col gap-1 py-1">
                          <div className="flex items-center gap-1">
                            <span>{service.name}</span>
                            <span className="text-xs text-muted-foreground">({service.duration}m)</span>
                          </div>

                          {service.allows_twins && (
                            <div
                              className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 -ml-1 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTwinQualification(service.id);
                              }}
                            >
                              <div className={`w-3 h-3 rounded border flex items-center justify-center ${isTwinQualified ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                {isTwinQualified && <ChevronDown className="h-2 w-2 text-primary-foreground" />}
                              </div>
                              <span className="text-[10px] text-muted-foreground">Twin Qualified</span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeService(service.id)}
                          className="ml-1 rounded-full hover:bg-muted-foreground/20 self-start mt-1"
                          aria-label={`Remove ${service.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Status */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                />
                <Label htmlFor="is_active" className="text-xs font-semibold">{t('active')}</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('activeHint')}
              </p>
            </div>

          </div>
        </div>

        {/* Form Actions - Fixed at Bottom */}
        <div className="py-4 border-t bg-background mt-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              {staff ? t('reviewHint') : t('createHint')}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? tCommon('saving') : staff ? tCommon('update') : tCommon('create')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

