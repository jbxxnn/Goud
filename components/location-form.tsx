'use client';

import { useState, 
    // useEffect 
    } from 'react';
    // import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { Location03Icon, AllBookmarkIcon, MultiplicationSignIcon } from '@hugeicons/core-free-icons';
import { Location, CreateLocationRequest, UpdateLocationRequest } from '@/lib/types/location_simple';
import { validatePhoneNumber, formatPhoneNumber } from '@/lib/types/location_simple';

interface LocationFormProps {
  location?: Location;
  onSave: (data: CreateLocationRequest | UpdateLocationRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function LocationForm({ location, onSave, onCancel, loading = false }: LocationFormProps) {
  const [formData, setFormData] = useState({
    name: location?.name || '',
    address: location?.address || '',
    phone: location?.phone || '',
    email: location?.email || '',
    is_active: location?.is_active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form data
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Location name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle phone number formatting
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    handleInputChange('phone', formatted);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HugeiconsIcon icon={Location03Icon} className="h-5 w-5" />
          {location ? 'Edit Location' : 'Add New Location'}
        </CardTitle>
        <CardDescription>
          {location 
            ? 'Update the location information below'
            : 'Fill in the details to create a new location'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Location Information</h3>
            
            <div>
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Downtown Clinic"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="e.g., 123 Main Street, Suite 100"
                className={errors.address ? 'border-destructive' : ''}
              />
              {errors.address && (
                <p className="text-sm text-destructive mt-1">{errors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="e.g., (555) 123-4567"
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="e.g., info@clinic.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                title="Active Location"
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked.toString())}
                className="rounded"
              />
              <Label htmlFor="is_active">Active Location</Label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <HugeiconsIcon icon={MultiplicationSignIcon} className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <HugeiconsIcon icon={AllBookmarkIcon} className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : location ? 'Update Location' : 'Create Location'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
