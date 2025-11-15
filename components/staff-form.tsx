'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, ChevronDown } from 'lucide-react';
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
}

export default function StaffForm({ staff, onSave, onCancel }: StaffFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  
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
      is_active: true,
      location_ids: [],
      service_ids: []
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
              service_ids: data.data.service_ids || []
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
            service_ids: []
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
        service_ids: []
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
        const servicesResponse = await fetch('/api/services');
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
    const current = watch('service_ids');
    if (current.includes(serviceId)) {
      setValue('service_ids', current.filter(id => id !== serviceId));
    } else {
      setValue('service_ids', [...current, serviceId]);
    }
  };

  const removeService = (serviceId: string) => {
    setValue('service_ids', watch('service_ids').filter(id => id !== serviceId));
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
            <Label htmlFor="user_id" className="text-xs font-semibold mb-2">User Account *</Label>
            <Select
              value={watch('user_id')}
              onValueChange={handleUserSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user account" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {/* Search Input Inside Dropdown */}
                <div className="p-2 border-b space-y-2">
                  <Input
                    placeholder="Search users by name or email..."
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
                      {userSearchTerm ? 'No users found matching your search' : 'No users available'}
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
              Selecting a user will auto-fill the fields below
            </p>
          </div>
        )}

        {/* First Name */}
        <div>
          <Label htmlFor="first_name" className="text-xs font-semibold mb-2">First Name *</Label>
          <Input
            id="first_name"
            {...register('first_name', { required: 'First name is required' })}
            placeholder="John"
          />
          {errors.first_name && (
            <p className="text-sm text-destructive mt-1">{errors.first_name.message}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <Label htmlFor="last_name" className="text-xs font-semibold mb-2">Last Name *</Label>
          <Input
            id="last_name"
            {...register('last_name', { required: 'Last name is required' })}
            placeholder="Doe"
          />
          {errors.last_name && (
            <p className="text-sm text-destructive mt-1">{errors.last_name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" className="text-xs font-semibold mb-2">Email *</Label>
          <Input
            id="email"
            type="email"
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
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
          <Label htmlFor="phone" className="text-xs font-semibold mb-2">Phone</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder="+1-555-0123"
          />
        </div>

        {/* Hire Date */}
        <div>
          <Label htmlFor="hire_date" className="text-xs font-semibold mb-2">Hire Date</Label>
          <Input
            id="hire_date"
            type="date"
            {...register('hire_date')}
          />
        </div>

        {/* Role */}
        <div>
          <Label htmlFor="role" className="text-xs font-semibold mb-2">Role *</Label>
          <Select
            value={watch('role')}
            onValueChange={(value) => setValue('role', value as StaffRole)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="technician">Technician</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="admin">Administrator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bio */}
        <div className="md:col-span-2">
          <Label htmlFor="bio" className="text-xs font-semibold mb-2">Bio</Label>
          <Textarea
            id="bio"
            {...register('bio')}
            placeholder="Brief bio about the staff member"
            rows={3}
          />
        </div>

        {/* Location Assignments */}
        <div className="md:col-span-2">
          <Label htmlFor="location_ids" className="text-xs font-semibold mb-2">Location Assignments</Label>
          <Popover open={locationDropdownOpen} onOpenChange={setLocationDropdownOpen}>
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
                    ? 'Select locations...'
                    : `${selectedLocations.length} location${selectedLocations.length !== 1 ? 's' : ''} selected`}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
              <Command>
                <CommandInput placeholder="Search locations..." />
                <CommandList>
                  <CommandEmpty>No locations found.</CommandEmpty>
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
                            onChange={() => {}}
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
                <Badge key={location.id} variant="secondary" className="gap-1">
                  {location.name}
                  <button
                    type="button"
                    onClick={() => removeLocation(location.id)}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20"
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
          <Label htmlFor="service_ids" className="text-xs font-semibold mb-2">Service Qualifications</Label>
          <Popover open={serviceDropdownOpen} onOpenChange={setServiceDropdownOpen}>
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
                    ? 'Select services...'
                    : `${selectedServices.length} service${selectedServices.length !== 1 ? 's' : ''} selected`}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
              <Command>
                <CommandInput placeholder="Search services..." />
                <CommandList>
                  <CommandEmpty>No services found.</CommandEmpty>
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
                            onChange={() => {}}
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
              {selectedServices.map((service) => (
                <Badge key={service.id} variant="secondary" className="gap-1">
                  <span>{service.name}</span>
                  <span className="text-xs text-muted-foreground">({service.duration}m)</span>
                  <button
                    type="button"
                    onClick={() => removeService(service.id)}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20"
                    aria-label={`Remove ${service.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
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
            <Label htmlFor="is_active" className="text-xs font-semibold">Active Staff Member</Label>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Only active staff are available for scheduling
          </p>
        </div>
          </div>
        </div>

        {/* Form Actions - Fixed at Bottom */}
        <div className="py-4 border-t bg-background mt-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              {staff ? 'Review and update staff details' : 'Complete required fields to add this staff member'}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : staff ? 'Update Staff' : 'Create Staff'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
