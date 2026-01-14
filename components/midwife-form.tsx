'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Midwife, CreateMidwifeRequest, UpdateMidwifeRequest } from '@/lib/types/midwife';

interface MidwifeFormProps {
  midwife?: Midwife;
  onSave: (midwife: CreateMidwifeRequest | UpdateMidwifeRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface MidwifeFormData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  practice_name: string;
  is_active: boolean;
}

export default function MidwifeForm({ midwife, onSave, onCancel, isSubmitting: externalIsSubmitting }: MidwifeFormProps) {
  const t = useTranslations('Midwives.form');
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const isSubmitting = externalIsSubmitting !== undefined ? externalIsSubmitting : internalIsSubmitting;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
  } = useForm<MidwifeFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      practice_name: '',
      is_active: true,
    },
  });

  // Reset form when midwife changes
  useEffect(() => {
    if (midwife) {
      reset({
        first_name: midwife.first_name || '',
        last_name: midwife.last_name || '',
        phone: midwife.phone || '',
        email: midwife.email || '',
        practice_name: midwife.practice_name || '',
        is_active: midwife.is_active,
      });
    } else {
      reset({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        practice_name: '',
        is_active: true,
      });
    }
  }, [midwife, reset]);

  const onSubmit = async (data: MidwifeFormData) => {
    if (externalIsSubmitting === undefined) {
      setInternalIsSubmitting(true);
    }
    try {
      const payload: CreateMidwifeRequest | UpdateMidwifeRequest = {
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        phone: data.phone.trim() || undefined,
        email: data.email.trim() || undefined,
        practice_name: data.practice_name.trim() || undefined,
        is_active: data.is_active,
      };
      await onSave(payload);
    } finally {
      if (externalIsSubmitting === undefined) {
        setInternalIsSubmitting(false);
      }
    }
  };

  return (
    <form id="midwife-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto space-y-6 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <Label htmlFor="first_name" className="text-xs font-semibold mb-2">
              {t('firstName')}
            </Label>
            <Input
              id="first_name"
              {...register('first_name', {
                required: t('validation.firstNameRequired'),
                maxLength: { value: 100, message: t('validation.firstNameLength') },
              })}
              placeholder={t('firstNamePlaceholder')}
            />
            {errors.first_name && (
              <p className="text-sm text-destructive mt-1">{errors.first_name.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <Label htmlFor="last_name" className="text-xs font-semibold mb-2">
              {t('lastName')}
            </Label>
            <Input
              id="last_name"
              {...register('last_name', {
                required: t('validation.lastNameRequired'),
                maxLength: { value: 100, message: t('validation.lastNameLength') },
              })}
              placeholder={t('lastNamePlaceholder')}
            />
            {errors.last_name && (
              <p className="text-sm text-destructive mt-1">{errors.last_name.message}</p>
            )}
          </div>

          {/* Practice Name */}
          <div className="md:col-span-2">
            <Label htmlFor="practice_name" className="text-xs font-semibold mb-2">
              {t('practiceName')}
            </Label>
            <Input
              id="practice_name"
              {...register('practice_name', {
                maxLength: { value: 255, message: t('validation.practiceLength') },
              })}
              placeholder={t('practicePlaceholder')}
            />
            {errors.practice_name && (
              <p className="text-sm text-destructive mt-1">{errors.practice_name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-xs font-semibold mb-2">
              {t('email')}
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email', {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t('validation.emailInvalid'),
                },
              })}
              placeholder={t('emailPlaceholder')}
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone" className="text-xs font-semibold mb-2">
              {t('phone')}
            </Label>
            <Input
              id="phone"
              {...register('phone', {
                maxLength: { value: 32, message: t('validation.phoneLength') },
              })}
              placeholder={t('phonePlaceholder')}
            />
            {errors.phone && (
              <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
            )}
          </div>

          {/* Active Status */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                {...register('is_active')}
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
              <Label htmlFor="is_active" className="text-xs font-semibold cursor-pointer">
                {t('active')}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('activeHint')}
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}

