'use client';

import {
  useState,
  // useEffect 
} from 'react';
// import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { HugeiconsIcon } from '@hugeicons/react';
import { CallIcon, MailIcon, Location03Icon } from '@hugeicons/core-free-icons';
import { Location, CreateLocationRequest, UpdateLocationRequest } from '@/lib/types/location_simple';
import { validatePhoneNumber, formatPhoneNumber } from '@/lib/types/location_simple';

interface LocationFormProps {
  location?: Location;
  onSave: (data: CreateLocationRequest | UpdateLocationRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

type LocationFormState = {
  name: string;
  locationCode: string;
  address: string;
  phone: string;
  email: string;
  color: string;
  is_active: boolean;
};

const generateLocationCode = (name: string): string => {
  const lettersOnly = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  return lettersOnly.slice(0, 3);
};

import { useTranslations } from 'next-intl';

export function LocationForm({ location, onSave, onCancel, loading = false }: LocationFormProps) {
  const t = useTranslations('Locations.form');
  const tCommon = useTranslations('Common');

  const initialLocationCode =
    location?.locationCode ??
    generateLocationCode(location?.name ?? '');

  const [formData, setFormData] = useState<LocationFormState>({
    name: location?.name || '',
    locationCode: initialLocationCode,
    address: location?.address || '',
    phone: location?.phone || '',
    email: location?.email || '',
    color: location?.color || '#3b82f6',
    is_active: location?.is_active ?? true,
  });

  const [hasCustomLocationCode, setHasCustomLocationCode] = useState<boolean>(
    initialLocationCode.trim().length > 0 && Boolean(location?.locationCode)
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form data
  const validateForm = (data: LocationFormState) => {
    const newErrors: Record<string, string> = {};

    if (!data.name.trim()) {
      newErrors.name = t('validation.nameRequired');
    }

    if (!data.locationCode.trim()) {
      newErrors.locationCode = t('validation.codeRequired');
    } else if (!/^[A-Z]{3}$/.test(data.locationCode.trim())) {
      newErrors.locationCode = t('validation.codeLength');
    }

    if (!data.address.trim()) {
      newErrors.address = t('validation.addressRequired');
    }

    if (data.phone && !validatePhoneNumber(data.phone)) {
      newErrors.phone = t('validation.phoneInvalid');
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = t('validation.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userProvidedCode = formData.locationCode.trim();
    const sanitizedUserCode = userProvidedCode
      ? userProvidedCode.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3)
      : '';
    const generatedCode = generateLocationCode(formData.name);
    const finalLocationCode = sanitizedUserCode || generatedCode;

    const submissionData: LocationFormState = {
      ...formData,
      locationCode: finalLocationCode,
    };

    const isCustom = Boolean(sanitizedUserCode);

    if (!validateForm(submissionData)) {
      setFormData(submissionData);
      setHasCustomLocationCode(isCustom);
      return;
    }

    try {
      setFormData(submissionData);
      setHasCustomLocationCode(isCustom);
      await onSave(submissionData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof LocationFormState, value: string | boolean) => {
    if (field === 'is_active') {
      setFormData(prev => ({ ...prev, [field]: value as boolean }));
    } else if (field === 'name') {
      const nameValue = value as string;
      setFormData(prev => {
        const next: LocationFormState = { ...prev, name: nameValue };
        if (!hasCustomLocationCode) {
          next.locationCode = generateLocationCode(nameValue);
        }
        return next;
      });
    } else if (field === 'locationCode') {
      const sanitized = (value as string).replace(/[^A-Za-z]/g, '').toUpperCase();
      const truncated = sanitized.slice(0, 3);
      setFormData(prev => ({ ...prev, locationCode: truncated }));
      setHasCustomLocationCode(truncated.trim().length > 0);
    } else {
      setFormData(prev => ({ ...prev, [field]: value as string }));
    }

    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  // Handle phone number formatting
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    handleInputChange('phone', formatted);
  };

  const isFormComplete = () => {
    return (
      formData.name.trim().length > 0 &&
      formData.address.trim().length > 0 &&
      formData.locationCode.trim().length === 3
    );
  };

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto space-y-12 pb-10">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-xs font-semibold mb-2">{t('name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={t('namePlaceholder')}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="locationCode" className="text-xs font-semibold mb-2">{t('code')}</Label>
                <Input
                  id="locationCode"
                  value={formData.locationCode}
                  onChange={(e) => handleInputChange('locationCode', e.target.value)}
                  placeholder={t('codePlaceholder')}
                  className={errors.locationCode ? 'border-destructive' : ''}
                />
                {/* <p className="text-xs text-muted-foreground mt-1">
                Defaults to the first three letters of the name if left blank.
              </p> */}
                {errors.locationCode && (
                  <p className="text-sm text-destructive mt-1">{errors.locationCode}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="address" className="text-xs font-semibold mb-2">{t('address')}</Label>
              <div className="relative">
                <HugeiconsIcon
                  icon={Location03Icon}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
                />
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder={t('addressPlaceholder')}
                  className={`pl-10 ${errors.address ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.address && (
                <p className="text-sm text-destructive mt-1">{errors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="text-xs font-semibold mb-2">{t('phone')}</Label>
                <div className="relative">
                  <HugeiconsIcon
                    icon={CallIcon}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder={t('phonePlaceholder')}
                    className={`pl-10 ${errors.phone ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-destructive mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email" className="text-xs font-semibold mb-2">{t('email')}</Label>
                <div className="relative">
                  <HugeiconsIcon
                    icon={MailIcon}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="color" className="text-xs font-semibold mb-2">{t('color')}</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="color"
                    type="color"
                    title="Select location color"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    className="h-10 w-20 rounded border border-input cursor-pointer"
                    aria-label="Location color picker"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-6">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active" className="cursor-pointer text-xs font-semibold">{t('active')}</Label>
              </div>
            </div>
          </div>

        </div>

        {/* Form Actions - Fixed at Bottom */}
        <div className="py-4 border-t bg-background mt-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              {location
                ? t('hint.review')
                : isFormComplete()
                  ? t('hint.ready')
                  : t('hint.incomplete')}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? tCommon('saving') : location ? tCommon('update') : tCommon('create')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
