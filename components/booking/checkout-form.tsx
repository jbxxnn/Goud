'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Loader, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { bookingContactSchema, BookingContactInput } from '@/lib/validation/booking';
import { translateValidationError } from '@/lib/validation/translate-error';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar03Icon } from '@hugeicons/core-free-icons';
import Link from 'next/link';

type BookingProfileLookup = {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    houseNumber: string;
    postalCode: string;
    streetName: string;
    city: string;
    birthDate: string;
};

interface CheckoutFormProps {
    currentEmail: string;
    contactDefaults: Omit<BookingContactInput, 'clientEmail'>;
    contactDefaultsVersion: number;
    emailChecked: null | { exists: boolean };
    password: string;
    isLoggedIn: boolean;
    userRole: string | null;
    onEmailChange: (value: string) => void | Promise<void>;
    onPasswordChange: (value: string) => void;
    onLogin: (email: string) => void | Promise<void>;
    onLogout?: () => void | Promise<void>;
    onSubmit: (values: BookingContactInput) => void | Promise<void>;
    finalizing: boolean;
    onValidationChange?: (isValid: boolean) => void;
    onMissingFieldsChange?: (fields: string[]) => void;
    serviceId?: string;
    hiddenFields?: string[];
}

export function CheckoutForm({
    currentEmail,
    contactDefaults,
    contactDefaultsVersion,
    emailChecked,
    password,
    isLoggedIn,
    userRole,
    onEmailChange,
    onPasswordChange,
    onLogin,
    onLogout,
    onSubmit,
    finalizing,
    onValidationChange,
    onMissingFieldsChange,
    serviceId,
    hiddenFields = [],
}: CheckoutFormProps) {
    const t = useTranslations('Booking.flow.form');
    const tv = useTranslations('Booking.flow');
    const [midwives, setMidwives] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; practice_name: string | null }>>([]);
    const [currentMidwifeRecordId, setCurrentMidwifeRecordId] = useState('');
    const [hasExistingBookingClient, setHasExistingBookingClient] = useState(false);
    const [hasMidwifePracticeMismatch, setHasMidwifePracticeMismatch] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isLookingUpBookingClient, setIsLookingUpBookingClient] = useState(false);
    const isInternalUser = ['admin', 'staff', 'assistant', 'midwife'].includes(userRole || '');
    const isMidwifeUser = userRole === 'midwife';
    const [isBookingForClient, setIsBookingForClient] = useState(() => {
        if (isInternalUser) {
            return true;
        }
        return true;
    });
    const [isDueDateOpen, setIsDueDateOpen] = useState(false);
    const [isBirthDateOpen, setIsBirthDateOpen] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        reset,
        trigger,
        getValues,
        watch,
        setValue,
        control,
    } = useForm<BookingContactInput>({
        resolver: zodResolver(bookingContactSchema),
        mode: 'onChange',
        reValidateMode: 'onChange',
        shouldUnregister: false,
        defaultValues: {
            clientEmail: currentEmail,
            firstName: contactDefaults.firstName ?? '',
            lastName: contactDefaults.lastName ?? '',
            phone: contactDefaults.phone ?? '',
            address: contactDefaults.address ?? '',
            dueDate: contactDefaults.dueDate ?? '',
            birthDate: contactDefaults.birthDate ?? '',
            midwifeId: contactDefaults.midwifeId ?? '',
            otherMidwifeName: '',
            houseNumber: contactDefaults.houseNumber ?? '',
            postalCode: contactDefaults.postalCode ?? '',
            streetName: contactDefaults.streetName ?? '',
            city: contactDefaults.city ?? '',
            notes: contactDefaults.notes ?? '',
            midwifeClientEmail: contactDefaults.midwifeClientEmail ?? '',
        },
    });

    // Fetch midwives
    useEffect(() => {
        const fetchMidwives = async () => {
            try {
                const response = await fetch('/api/midwives?active_only=true&limit=1000');
                const data = await response.json();
                if (data.success) {
                    setMidwives(data.data || []);
                }
            } catch (error) {
                console.error('Error fetching midwives:', error);
            }
        };
        fetchMidwives();
    }, []);

    useEffect(() => {
        if (!isLoggedIn || !isMidwifeUser) {
            setCurrentMidwifeRecordId('');
            return;
        }

        const fetchCurrentMidwife = async () => {
            try {
                const response = await fetch('/api/users/current');
                const payload = await response.json();
                setCurrentMidwifeRecordId(payload?.data?.midwife_id || '');
            } catch (error) {
                console.error('Error loading current midwife link:', error);
                setCurrentMidwifeRecordId('');
            }
        };

        fetchCurrentMidwife();
    }, [isLoggedIn, isMidwifeUser]);

    const defaultsVersionRef = useRef(contactDefaultsVersion);
    const clientLookupTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastAutofillRef = useRef<BookingProfileLookup | null>(null);
    const clientLookupRequestIdRef = useRef(0);

    useEffect(() => {
        if (contactDefaultsVersion !== defaultsVersionRef.current) {
            defaultsVersionRef.current = contactDefaultsVersion;
            const currentMidwifeId = getValues('midwifeId');
            reset({
                clientEmail: getValues('clientEmail'),
                firstName: contactDefaults.firstName ?? '',
                lastName: contactDefaults.lastName ?? '',
                phone: contactDefaults.phone ?? '',
                address: contactDefaults.address ?? '',
                dueDate: contactDefaults.dueDate ?? '',
                birthDate: contactDefaults.birthDate ?? '',
                midwifeId: contactDefaults.midwifeId || currentMidwifeId || '',
                otherMidwifeName: getValues('otherMidwifeName') || '',
                houseNumber: contactDefaults.houseNumber ?? '',
                postalCode: contactDefaults.postalCode ?? '',
                streetName: contactDefaults.streetName ?? '',
                city: contactDefaults.city ?? '',
                notes: contactDefaults.notes ?? '',
                midwifeClientEmail: contactDefaults.midwifeClientEmail ?? '',
            });
            
            // Also update the toggle if needed
            if (isInternalUser && !isBookingForClient) {
                setIsBookingForClient(true);
            }
        }
    }, [contactDefaults, contactDefaultsVersion, getValues, isBookingForClient, isInternalUser, reset]);

    useEffect(() => {
        if (isInternalUser && !isBookingForClient) {
            setIsBookingForClient(true);
        }
    }, [isBookingForClient, isInternalUser]);

    // Watch fields for validation
    const midwifeClientEmailValue = watch('midwifeClientEmail');
    const gravidaValue = watch('gravida');
    const paraValue = watch('para');
    const birthDateValue = watch('birthDate');
    const dueDateValue = watch('dueDate');
    const streetNameValue = watch('streetName');
    const houseNumberValue = watch('houseNumber');
    const postalCodeValue = watch('postalCode');
    const cityValue = watch('city');
    const firstNameValue = watch('firstName');
    const lastNameValue = watch('lastName');
    const phoneValue = watch('phone');
    const midwifeIdValue = watch('midwifeId');
    const otherMidwifeNameValue = watch('otherMidwifeName');
    const showLoginForm = emailChecked?.exists === true && !isLoggedIn;
    const showDetailsForm = emailChecked?.exists === false || isLoggedIn;

    const missingFields = useMemo(() => {
        const fields: string[] = [];
        const addIfMissing = (value: string | undefined | null, label: string) => {
            if (!value || value.trim() === '') fields.push(label);
        };

        if (showLoginForm && !password) {
            fields.push(t('password'));
        }

        if (!showDetailsForm) {
            return fields;
        }

        addIfMissing(firstNameValue, t('firstName'));
        addIfMissing(lastNameValue, t('lastName'));
        addIfMissing(phoneValue, t('phone'));
        addIfMissing(streetNameValue, t('street'));
        addIfMissing(houseNumberValue, t('houseNumber'));
        addIfMissing(postalCodeValue, t('postalCode'));
        addIfMissing(cityValue, t('city'));
        addIfMissing(birthDateValue, t('birthDate'));

        if (!hiddenFields.includes('due_date')) {
            addIfMissing(dueDateValue, t('dueDate'));
        }

        if (!hiddenFields.includes('midwife')) {
            addIfMissing(midwifeIdValue, t('midwife'));
            if (midwifeIdValue === 'other') {
                addIfMissing(otherMidwifeNameValue, t('otherMidwifeName'));
            }
        }

        if (isInternalUser) {
            if (isBookingForClient) {
                addIfMissing(midwifeClientEmailValue, t('clientEmailPlaceholder'));
            }
            addIfMissing(gravidaValue, t('gravida'));
            addIfMissing(paraValue, t('para'));
        }

        return [...new Set(fields)];
    }, [
        birthDateValue,
        cityValue,
        dueDateValue,
        firstNameValue,
        gravidaValue,
        hiddenFields,
        houseNumberValue,
        isBookingForClient,
        lastNameValue,
        midwifeClientEmailValue,
        midwifeIdValue,
        otherMidwifeNameValue,
        paraValue,
        password,
        phoneValue,
        postalCodeValue,
        showDetailsForm,
        showLoginForm,
        streetNameValue,
        t,
        userRole,
    ]);

    // Notify parent of validation state changes
    useEffect(() => {
        if (onValidationChange) {
            let valid = isValid;
            
            // Additional manual checks for fields that might have complex conditional requirements
            // or those marked as compulsory (*) in the UI
            if (isInternalUser) {
                if (isBookingForClient && !midwifeClientEmailValue) valid = false;
                if (!gravidaValue || gravidaValue.trim() === '') valid = false;
                if (!paraValue || paraValue.trim() === '') valid = false;
            }

            if (isMidwifeUser && (isLookingUpBookingClient || hasMidwifePracticeMismatch)) {
                valid = false;
            }

            // Ensure midwife and dueDate are provided if not hidden
            if (!hiddenFields.includes('midwife') && !watch('midwifeId')) valid = false;
            if (!hiddenFields.includes('due_date') && !dueDateValue) valid = false;

            onValidationChange(valid);
        }
    }, [
        isValid, 
        onValidationChange, 
        isBookingForClient, 
        midwifeClientEmailValue, 
        userRole, 
        gravidaValue, 
        paraValue,
        isLookingUpBookingClient,
        hasMidwifePracticeMismatch,
        birthDateValue,
        dueDateValue,
        streetNameValue,
        houseNumberValue,
        postalCodeValue,
        cityValue
    ]);

    useEffect(() => {
        onMissingFieldsChange?.(missingFields);
    }, [missingFields, onMissingFieldsChange]);

    useEffect(() => {
        const savedMidwifeId = contactDefaults.midwifeId ?? '';
        const currentMidwifeId = getValues('midwifeId') ?? '';

        if (showDetailsForm && savedMidwifeId && currentMidwifeId !== savedMidwifeId) {
            setValue('midwifeId', savedMidwifeId, { shouldValidate: true });
        }
    }, [contactDefaults.midwifeId, contactDefaultsVersion, getValues, setValue, showDetailsForm]);

    useEffect(() => {
        if (!showDetailsForm || !isMidwifeUser || !currentMidwifeRecordId) {
            return;
        }

        const currentMidwifeId = getValues('midwifeId') ?? '';
        if (currentMidwifeId !== currentMidwifeRecordId) {
            setValue('midwifeId', currentMidwifeRecordId, { shouldValidate: true });
        }
    }, [currentMidwifeRecordId, getValues, isMidwifeUser, setValue, showDetailsForm]);

    const availableMidwives = useMemo(() => {
        if (isMidwifeUser && currentMidwifeRecordId) {
            return midwives.filter((midwife) => midwife.id === currentMidwifeRecordId);
        }
        return midwives;
    }, [currentMidwifeRecordId, isMidwifeUser, midwives]);

    // Debounce email check
    const emailDebounceTimer = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        return () => {
            if (emailDebounceTimer.current) {
                clearTimeout(emailDebounceTimer.current);
            }
            if (clientLookupTimerRef.current) {
                clearTimeout(clientLookupTimerRef.current);
            }
        };
    }, []);

    const handleEmailChangeDebounced = (value: string) => {
        if (emailDebounceTimer.current) {
            clearTimeout(emailDebounceTimer.current);
        }
        emailDebounceTimer.current = setTimeout(async () => {
            setIsCheckingEmail(true);
            try {
                await onEmailChange(value);
            } finally {
                setIsCheckingEmail(false);
            }
        }, 1500);
    };

    const emailField = register('clientEmail');
    const firstNameField = register('firstName');
    const lastNameField = register('lastName');
    const phoneField = register('phone');
    const addressField = register('address');
    const houseNumberField = register('houseNumber');
    const postalCodeField = register('postalCode');
    const streetNameField = register('streetName');
    const cityField = register('city');
    const notesField = register('notes');
    const otherMidwifeNameField = register('otherMidwifeName');
    const gravidaField = register('gravida');
    const paraField = register('para');
    const lockExistingClientFields = isMidwifeUser && hasExistingBookingClient;
    const disableClientIdentityFields = isMidwifeUser && isLookingUpBookingClient;
    const lockOrDisableClientIdentityFields = lockExistingClientFields || disableClientIdentityFields;
    const hideFieldsForPracticeMismatch = isMidwifeUser && hasMidwifePracticeMismatch;

    useEffect(() => {
        if (!isInternalUser || !isBookingForClient) {
            lastAutofillRef.current = null;
            return;
        }

        if (clientLookupTimerRef.current) {
            clearTimeout(clientLookupTimerRef.current);
        }

        const email = (midwifeClientEmailValue || '').trim();
        if (!email || !email.includes('@')) {
            clientLookupRequestIdRef.current += 1;
            setIsLookingUpBookingClient(false);
            setHasExistingBookingClient(false);
            setHasMidwifePracticeMismatch(false);
            const previousAutofill = lastAutofillRef.current;
            if (previousAutofill) {
                const fieldsToClear: Array<keyof BookingProfileLookup> = [
                    'firstName',
                    'lastName',
                    'phone',
                    'address',
                    'houseNumber',
                    'postalCode',
                    'streetName',
                    'city',
                    'birthDate',
                ];

                fieldsToClear.forEach((fieldName) => {
                    const currentValue = (getValues(fieldName) ?? '') as string;
                    if (currentValue === previousAutofill[fieldName]) {
                        setValue(fieldName, '', { shouldValidate: true });
                    }
                });
            }
            lastAutofillRef.current = null;
            return;
        }

        clientLookupTimerRef.current = setTimeout(async () => {
            const requestId = ++clientLookupRequestIdRef.current;
            setIsLookingUpBookingClient(true);
            try {
                const response = await fetch(`/api/users/booking-profile?email=${encodeURIComponent(email)}`);
                const payload = await response.json();

                if (requestId !== clientLookupRequestIdRef.current) {
                    return;
                }

                setHasExistingBookingClient(Boolean(payload?.user));
                setHasMidwifePracticeMismatch(Boolean(payload?.practiceMismatch));

                const nextAutofill: BookingProfileLookup | null = payload?.user
                    ? {
                        firstName: payload.user.first_name || '',
                        lastName: payload.user.last_name || '',
                        phone: payload.user.phone || '',
                        address: payload.user.address || '',
                        houseNumber: payload.user.house_number || '',
                        postalCode: payload.user.postal_code || '',
                        streetName: payload.user.street_name || '',
                        city: payload.user.city || '',
                        birthDate: payload.user.birth_date || '',
                    }
                    : null;

                const previousAutofill = lastAutofillRef.current;
                const fieldsToSync: Array<keyof BookingProfileLookup> = [
                    'firstName',
                    'lastName',
                    'phone',
                    'address',
                    'houseNumber',
                    'postalCode',
                    'streetName',
                    'city',
                    'birthDate',
                ];

                fieldsToSync.forEach((fieldName) => {
                    const currentValue = (getValues(fieldName) ?? '') as string;
                    const previousValue = previousAutofill?.[fieldName] || '';
                    const nextValue = nextAutofill?.[fieldName] || '';
                    const shouldReplace = currentValue === '' || currentValue === previousValue;

                    if (shouldReplace && currentValue !== nextValue) {
                        setValue(fieldName, nextValue, { shouldValidate: true });
                    }
                });

                lastAutofillRef.current = nextAutofill;
            } catch (error) {
                if (requestId !== clientLookupRequestIdRef.current) {
                    return;
                }
                setHasExistingBookingClient(false);
                setHasMidwifePracticeMismatch(false);
                console.error('Error looking up booking profile:', error);
            } finally {
                if (requestId === clientLookupRequestIdRef.current) {
                    setIsLookingUpBookingClient(false);
                }
            }
        }, 500);

        return () => {
            if (clientLookupTimerRef.current) {
                clearTimeout(clientLookupTimerRef.current);
            }
        };
    }, [currentMidwifeRecordId, getValues, isBookingForClient, isInternalUser, isMidwifeUser, midwifeClientEmailValue, setValue]);

    return (
        <div className="relative">
            {finalizing && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-3">
                        <Loader className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm font-medium text-primary animate-pulse">{t('processingDetails')}</span>
                    </div>
                </div>
            )}
            <form id="checkout-form" className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('email')}</label>
                        <div className="relative">
                            <Input
                                type="email"
                                readOnly={isLoggedIn}
                                className={`h-12 rounded-xl border-gray-200 px-8 text-base font-medium transition-all duration-200 ${isLoggedIn
                                    ? 'bg-gray-100 text-gray-500 cursor-default pointer-events-none'
                                    : 'bg-gray-50/50 hover:bg-white focus:bg-white'
                                    }`}
                                tabIndex={isLoggedIn ? -1 : undefined}
                                placeholder={t('emailPlaceholder')}
                                {...emailField}
                                onChange={(e) => {
                                    emailField.onChange(e);
                                    handleEmailChangeDebounced(e.target.value);
                                }}
                            />
                            {isCheckingEmail && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Loader className="h-4 w-4 animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                            {errors.clientEmail && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.clientEmail.message, tv)}</div>}

                        {isLoggedIn && onLogout && (
                            <div className="flex justify-end -mt-1">
                                <button
                                    type="button"
                                    onClick={onLogout}
                                    className="text-xs text-primary hover:text-red-600 hover:underline transition-colors font-medium cursor-pointer"
                                >
                                    {t('notYouLogout')}
                                </button>
                            </div>
                        )}

                        {emailChecked?.exists === true && !isLoggedIn && (
                            <div className="absolute top-0 right-0 p-1 bg-blue-50 text-blue-700 text-[10px] rounded-full border border-blue-200 font-medium">
                                {t('accountFound')}
                            </div>
                        )}
                        {emailChecked?.exists === true && isLoggedIn && (
                            <div className="absolute top-0 right-0 p-1 bg-green-50 text-green-700 text-[10px] rounded-full border border-green-200 font-medium">
                                {t('loggedIn')}
                            </div>
                        )}
                        {emailChecked?.exists === false && (
                            <div className="absolute top-0 right-0 p-1 bg-gray-50 text-gray-600 text-[10px] rounded-full border border-gray-200 font-medium">
                                {t('accountCreationNotice')}
                            </div>
                        )}
                    </div>

                    {showLoginForm && (
                        <div className="md:col-span-2 space-y-4 pt-2">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('password')}</label>
                                    <Link href="/auth/forgot-password" target="_blank" className="text-xs text-primary hover:underline font-medium">
                                        {t('forgotPassword')}
                                    </Link>
                                </div>
                                <Input
                                    type="password"
                                    className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200"
                                    value={password}
                                    onChange={(e) => onPasswordChange(e.target.value)}
                                    placeholder={t('passwordPlaceholder')}
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter' && password) {
                                            const valid = await trigger('clientEmail');
                                            if (valid) await onLogin(getValues('clientEmail'));
                                        }
                                    }}
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={async () => {
                                    const valid = await trigger('clientEmail');
                                    if (valid) await onLogin(getValues('clientEmail'));
                                }}
                                disabled={finalizing || !password}
                                className="h-11 bg-primary hover:bg-secondary-foreground shadow-md"
                                style={{ borderRadius: '1rem' }}
                            >
                                {finalizing ? t('loggingIn') : t('loginContinue')}
                            </Button>
                        </div>
                    )}

                    <Separator className="w-full md:col-span-2 my-2" />

                    {showDetailsForm && (
                        <>
                            {!hideFieldsForPracticeMismatch && missingFields.length > 0 && (
                                <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    <p className="font-semibold">{t('missingFieldsTitle')}</p>
                                    <p className="mt-1 text-xs">{t('missingFieldsHint', { fields: missingFields.join(', ') })}</p>
                                </div>
                            )}
                            {isInternalUser && (
                                <div className="space-y-4 md:col-span-2 pt-2 pb-2">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={isBookingForClient}
                                            onCheckedChange={setIsBookingForClient}
                                            id="booking-for-client-mode"
                                            disabled
                                        />
                                        <Label htmlFor="booking-for-client-mode" className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 mb-0">
                                            {t('bookingForClient')}
                                        </Label>
                                    </div>
                                    {isBookingForClient && (
                                        <>
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-200 relative">
                                                <Input
                                                    required
                                                    type="email"
                                                    className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200 pr-10"
                                                    placeholder={t('clientEmailPlaceholder')}
                                                    {...register('midwifeClientEmail')}
                                                />
                                                {isLookingUpBookingClient && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <Loader className="h-4 w-4 animate-spin text-primary" />
                                                    </div>
                                                )}
                                            </div>
                                            {hasMidwifePracticeMismatch && (
                                                <p className="mt-2 text-xs font-medium text-amber-700">
                                                    {t('clientMidwifeMismatch')}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                            {!hideFieldsForPracticeMismatch && (
                                <>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('firstName')} *</label>
                                <Input
                                    readOnly={lockOrDisableClientIdentityFields}
                                    className={`h-12 rounded-xl border-gray-200 transition-all duration-200 ${lockOrDisableClientIdentityFields
                                        ? 'bg-gray-100 text-gray-500 cursor-default pointer-events-none'
                                        : 'bg-gray-50/50 hover:bg-white focus:bg-white'
                                        }`}
                                    tabIndex={lockOrDisableClientIdentityFields ? -1 : undefined}
                                    placeholder={t('firstNamePlaceholder')}
                                    {...firstNameField}
                                />
                                {errors.firstName && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.firstName.message, tv)}</div>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('lastName')} *</label>
                                <Input
                                    readOnly={lockOrDisableClientIdentityFields}
                                    className={`h-12 rounded-xl border-gray-200 transition-all duration-200 ${lockOrDisableClientIdentityFields
                                        ? 'bg-gray-100 text-gray-500 cursor-default pointer-events-none'
                                        : 'bg-gray-50/50 hover:bg-white focus:bg-white'
                                        }`}
                                    tabIndex={lockOrDisableClientIdentityFields ? -1 : undefined}
                                    placeholder={t('lastNamePlaceholder')}
                                    {...lastNameField}
                                />
                                {errors.lastName && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.lastName.message, tv)}</div>}
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('phone')} *</label>
                                <Input
                                    readOnly={lockOrDisableClientIdentityFields}
                                    className={`h-12 rounded-xl border-gray-200 transition-all duration-200 ${lockOrDisableClientIdentityFields
                                        ? 'bg-gray-100 text-gray-500 cursor-default pointer-events-none'
                                        : 'bg-gray-50/50 hover:bg-white focus:bg-white'
                                        }`}
                                    tabIndex={lockOrDisableClientIdentityFields ? -1 : undefined}
                                    placeholder={t('phonePlaceholder')}
                                    {...phoneField}
                                />
                                {errors.phone && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.phone.message, tv)}</div>}
                            </div>

                            {isInternalUser && (
                                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('gravida')} *</label>
                                        <Input
                                            className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200"
                                            placeholder={t('gravidaPlaceholder')}
                                            {...gravidaField}
                                        />
                                        {errors.gravida && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.gravida.message, tv)}</div>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('para')} *</label>
                                        <Input
                                            className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200"
                                            placeholder={t('paraPlaceholder')}
                                            {...paraField}
                                        />
                                        {errors.para && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.para.message, tv)}</div>}
                                    </div>
                                </div>
                            )}

                            {/* Address fields */}
                            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('street')} *</label>
                                    <Input
                                        readOnly={lockOrDisableClientIdentityFields}
                                        tabIndex={lockOrDisableClientIdentityFields ? -1 : undefined}
                                        placeholder={t('streetPlaceholder')}
                                        className={`h-12 rounded-xl border-gray-200 transition-all duration-200 ${lockOrDisableClientIdentityFields
                                            ? 'bg-gray-100 text-gray-500 cursor-default pointer-events-none'
                                            : 'bg-gray-50/50 hover:bg-white focus:bg-white'
                                            }`}
                                        {...streetNameField}
                                    />
                                    {errors.streetName && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.streetName.message, tv)}</div>}
                                </div>
                                <div className="col-span-2 md:col-span-1 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('houseNumber')} *</label>
                                    <Input
                                        readOnly={lockOrDisableClientIdentityFields}
                                        tabIndex={lockOrDisableClientIdentityFields ? -1 : undefined}
                                        placeholder={t('houseNumberPlaceholder')}
                                        className={`h-12 rounded-xl border-gray-200 transition-all duration-200 ${lockOrDisableClientIdentityFields
                                            ? 'bg-gray-100 text-gray-500 cursor-default pointer-events-none'
                                            : 'bg-gray-50/50 hover:bg-white focus:bg-white'
                                            }`}
                                        {...houseNumberField}
                                    />
                                    {errors.houseNumber && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.houseNumber.message, tv)}</div>}
                                </div>
                                <div className="col-span-1 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('postalCode')} *</label>
                                    <Input
                                        readOnly={lockOrDisableClientIdentityFields}
                                        tabIndex={lockOrDisableClientIdentityFields ? -1 : undefined}
                                        placeholder={t('postalCodePlaceholder')}
                                        className={`h-12 rounded-xl border-gray-200 transition-all duration-200 ${lockOrDisableClientIdentityFields
                                            ? 'bg-gray-100 text-gray-500 cursor-default pointer-events-none'
                                            : 'bg-gray-50/50 hover:bg-white focus:bg-white'
                                            }`}
                                        {...postalCodeField}
                                    />
                                    {errors.postalCode && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.postalCode.message, tv)}</div>}
                                </div>
                                <div className="col-span-1 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('city')} *</label>
                                    <Input
                                        readOnly={lockOrDisableClientIdentityFields}
                                        tabIndex={lockOrDisableClientIdentityFields ? -1 : undefined}
                                        placeholder={t('cityPlaceholder')}
                                        className={`h-12 rounded-xl border-gray-200 transition-all duration-200 ${lockOrDisableClientIdentityFields
                                            ? 'bg-gray-100 text-gray-500 cursor-default pointer-events-none'
                                            : 'bg-gray-50/50 hover:bg-white focus:bg-white'
                                            }`}
                                        {...cityField}
                                    />
                                    {errors.city && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.city.message, tv)}</div>}
                                </div>
                            </div>

                            {/* Dates */}
                            {!hiddenFields.includes('due_date') && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('dueDate')} *</label>
                                <Controller
                                    control={control}
                                    name="dueDate"
                                    render={({ field }) => (
                                        <Popover open={isDueDateOpen} onOpenChange={setIsDueDateOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full h-12 rounded-xl justify-start text-left font-normal border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200 px-4 text-sm shadow-md",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                    style={{ borderRadius: "0.5rem" }}
                                                >
                                                    <HugeiconsIcon icon={Calendar03Icon} />
                                                    {field.value ? format(new Date(field.value), "dd-MM-yyyy") : <span>{t('selectDate')}</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border border-gray-100 bg-white overflow-hidden" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value ? new Date(field.value) : undefined}
                                                    onSelect={(date) => {
                                                        field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                                                        setIsDueDateOpen(false);
                                                    }}
                                                    captionLayout="dropdown"
                                                    fromYear={new Date().getFullYear()}
                                                    toYear={new Date().getFullYear() + 2}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                />
                                {errors.dueDate && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.dueDate.message, tv)}</div>}
                            </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('birthDate')} *</label>
                                <Controller
                                    control={control}
                                    name="birthDate"
                                    render={({ field }) => (
                                        <Popover open={isBirthDateOpen} onOpenChange={setIsBirthDateOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full h-12 rounded-xl justify-start text-left font-normal border-gray-200 px-4 text-sm shadow-md transition-all duration-200",
                                                        lockOrDisableClientIdentityFields
                                                            ? "bg-gray-100 text-gray-500 cursor-default pointer-events-none"
                                                            : "bg-gray-50/50 hover:bg-white focus:bg-white",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                    style={{ borderRadius: "0.5rem" }}
                                                    disabled={lockOrDisableClientIdentityFields}
                                                >
                                                    <HugeiconsIcon icon={Calendar03Icon} />
                                                    {field.value ? format(new Date(field.value), "dd-MM-yyyy") : <span>{t('selectDate')}</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border border-gray-100 bg-white overflow-hidden" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value ? new Date(field.value) : undefined}
                                                    onSelect={(date) => {
                                                        field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                                                        setIsBirthDateOpen(false);
                                                    }}
                                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                                    captionLayout="dropdown"
                                                    fromYear={1900}
                                                    toYear={new Date().getFullYear()}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                />
                                {errors.birthDate && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.birthDate.message, tv)}</div>}
                            </div>

                            {!hiddenFields.includes('midwife') && (
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('midwife')} *</label>
                                    <Select
                                        value={watch('midwifeId') || ''}
                                        onValueChange={(value) => setValue('midwifeId', value || '', { shouldValidate: true })}
                                        disabled={lockOrDisableClientIdentityFields}
                                    >
                                        <SelectTrigger className={`w-full h-12 rounded-xl border-gray-200 transition-all duration-200 ${lockOrDisableClientIdentityFields
                                            ? 'bg-gray-100 text-gray-500 cursor-default pointer-events-none'
                                            : 'bg-gray-50/50 hover:bg-white focus:bg-white'
                                            }`}>
                                            <SelectValue placeholder={t('midwifePlaceholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableMidwives.map((m) => {
                                                const label = m.practice_name
                                                    ? `${m.practice_name} (${[m.first_name, m.last_name].filter(Boolean).join(' ')})`
                                                    : [m.first_name, m.last_name].filter(Boolean).join(' ');
                                                return <SelectItem key={m.id} value={m.id}>{label || t('unknownMidwife')}</SelectItem>;
                                            })}
                                            {!isMidwifeUser && <SelectItem value="other">{t('otherMidwife')}</SelectItem>}
                                        </SelectContent>
                                    </Select>
                                    {errors.midwifeId && <div className="text-xs text-red-600 font-medium">{translateValidationError(errors.midwifeId.message, tv)}</div>}
                                </div>
                            )}
                            
                            {(!hiddenFields.includes('midwife') && watch('midwifeId') === 'other') && (
                                <div className="md:col-span-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('otherMidwifeName')}</label>
                                    <Input
                                        className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200"
                                        placeholder={t('otherMidwifeNamePlaceholder')}
                                        {...otherMidwifeNameField}
                                    />
                                    {errors.otherMidwifeName && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.otherMidwifeName.message, tv)}</div>}
                                </div>
                            )}

                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('notes')}</label>
                                <textarea
                                    className="flex w-full rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] transition-all duration-200"
                                    placeholder={t('notesPlaceholder')}
                                    {...notesField}
                                />
                                {errors.notes && <div className="text-xs text-red-600 font-medium ml-1">{translateValidationError(errors.notes.message, tv)}</div>}
                            </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </form>
        </div>
    );
}
