'use client';

import { useRef, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Loader, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { bookingContactSchema, BookingContactInput } from '@/lib/validation/booking';
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
}: CheckoutFormProps) {
    const t = useTranslations('Booking.flow.form');
    const [midwives, setMidwives] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; practice_name: string | null }>>([]);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isBookingForClient, setIsBookingForClient] = useState(true);
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
        defaultValues: {
            clientEmail: currentEmail,
            firstName: contactDefaults.firstName ?? '',
            lastName: contactDefaults.lastName ?? '',
            phone: contactDefaults.phone ?? '',
            address: contactDefaults.address ?? '',
            dueDate: contactDefaults.dueDate ?? '',
            birthDate: contactDefaults.birthDate ?? '',
            midwifeId: contactDefaults.midwifeId ?? '',
            houseNumber: contactDefaults.houseNumber ?? '',
            postalCode: contactDefaults.postalCode ?? '',
            streetName: contactDefaults.streetName ?? '',
            city: contactDefaults.city ?? '',
            notes: contactDefaults.notes ?? '',
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

    const defaultsVersionRef = useRef(contactDefaultsVersion);

    useEffect(() => {
        if (contactDefaultsVersion !== defaultsVersionRef.current) {
            defaultsVersionRef.current = contactDefaultsVersion;
            reset({
                clientEmail: getValues('clientEmail'),
                firstName: contactDefaults.firstName ?? '',
                lastName: contactDefaults.lastName ?? '',
                phone: contactDefaults.phone ?? '',
                address: contactDefaults.address ?? '',
                dueDate: contactDefaults.dueDate ?? '',
                birthDate: contactDefaults.birthDate ?? '',
                midwifeId: contactDefaults.midwifeId ?? '',
                houseNumber: contactDefaults.houseNumber ?? '',
                postalCode: contactDefaults.postalCode ?? '',
                streetName: contactDefaults.streetName ?? '',
                city: contactDefaults.city ?? '',
                notes: contactDefaults.notes ?? '',
            });
        }
    }, [contactDefaults, contactDefaultsVersion, getValues, reset]);

    // Watch midwifeClientEmail for validation
    const midwifeClientEmailValue = watch('midwifeClientEmail');

    // Notify parent of validation state changes
    useEffect(() => {
        if (onValidationChange) {
            let valid = isValid;
            if (userRole === 'midwife' && isBookingForClient && !midwifeClientEmailValue) {
                valid = false;
            }
            onValidationChange(valid);
        }
    }, [isValid, onValidationChange, isBookingForClient, midwifeClientEmailValue, userRole]);

    // Debounce email check
    const emailDebounceTimer = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        return () => {
            if (emailDebounceTimer.current) {
                clearTimeout(emailDebounceTimer.current);
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

    const showLoginForm = emailChecked?.exists === true && !isLoggedIn;
    const showDetailsForm = emailChecked?.exists === false || isLoggedIn;

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
                        {errors.clientEmail && <div className="text-xs text-red-600 font-medium ml-1">{errors.clientEmail.message}</div>}

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
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('password')}</label>
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
                            {userRole === 'midwife' && (
                                <div className="space-y-4 md:col-span-2 pt-2 pb-2">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={isBookingForClient}
                                            onCheckedChange={setIsBookingForClient}
                                            id="booking-for-client-mode"
                                        />
                                        <Label htmlFor="booking-for-client-mode" className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 mb-0">
                                            {t('bookingForClient')}
                                        </Label>
                                    </div>
                                    {isBookingForClient && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                            <Input
                                                required
                                                type="email"
                                                className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200"
                                                placeholder={t('clientEmailPlaceholder')}
                                                {...register('midwifeClientEmail')}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('firstName')}</label>
                                <Input
                                    className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200"
                                    placeholder={t('firstNamePlaceholder')}
                                    {...firstNameField}
                                />
                                {errors.firstName && <div className="text-xs text-red-600 font-medium ml-1">{errors.firstName.message}</div>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('lastName')}</label>
                                <Input
                                    className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200"
                                    placeholder={t('lastNamePlaceholder')}
                                    {...lastNameField}
                                />
                                {errors.lastName && <div className="text-xs text-red-600 font-medium ml-1">{errors.lastName.message}</div>}
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('phone')}</label>
                                <Input
                                    className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200"
                                    placeholder={t('optional')}
                                    {...phoneField}
                                />
                                {errors.phone && <div className="text-xs text-red-600 font-medium ml-1">{errors.phone.message}</div>}
                            </div>

                            {/* Address fields */}
                            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('street')}</label>
                                    <Input placeholder={t('streetPlaceholder')} className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200" {...streetNameField} />
                                    {errors.streetName && <div className="text-xs text-red-600 font-medium ml-1">{errors.streetName.message}</div>}
                                </div>
                                <div className="col-span-2 md:col-span-1 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('houseNumber')}</label>
                                    <Input placeholder={t('houseNumberPlaceholder')} className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200" {...houseNumberField} />
                                    {errors.houseNumber && <div className="text-xs text-red-600 font-medium ml-1">{errors.houseNumber.message}</div>}
                                </div>
                                <div className="col-span-1 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('postalCode')}</label>
                                    <Input placeholder={t('postalCodePlaceholder')} className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200" {...postalCodeField} />
                                    {errors.postalCode && <div className="text-xs text-red-600 font-medium ml-1">{errors.postalCode.message}</div>}
                                </div>
                                <div className="col-span-1 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('city')}</label>
                                    <Input placeholder={t('cityPlaceholder')} className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200" {...cityField} />
                                    {errors.city && <div className="text-xs text-red-600 font-medium ml-1">{errors.city.message}</div>}
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('dueDate')}</label>
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
                                                    {field.value ? format(new Date(field.value), "P") : <span>{t('selectDate')}</span>}
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
                                {errors.dueDate && <div className="text-xs text-red-600 font-medium ml-1">{errors.dueDate.message}</div>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('birthDate')}</label>
                                <Controller
                                    control={control}
                                    name="birthDate"
                                    render={({ field }) => (
                                        <Popover open={isBirthDateOpen} onOpenChange={setIsBirthDateOpen}>
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
                                                    {field.value ? format(new Date(field.value), "P") : <span>{t('selectDate')}</span>}
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
                                {errors.birthDate && <div className="text-xs text-red-600 font-medium ml-1">{errors.birthDate.message}</div>}
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('midwife')}</label>
                                <Select
                                    value={watch('midwifeId') || ''}
                                    onValueChange={(value) => setValue('midwifeId', value || '', { shouldValidate: true })}
                                >
                                    <SelectTrigger className="w-full h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all duration-200">
                                        <SelectValue placeholder={t('midwifePlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {midwives.map((m) => {
                                            const label = m.practice_name
                                                ? `${m.practice_name} (${[m.first_name, m.last_name].filter(Boolean).join(' ')})`
                                                : [m.first_name, m.last_name].filter(Boolean).join(' ');
                                            return <SelectItem key={m.id} value={m.id}>{label || t('unknownMidwife')}</SelectItem>;
                                        })}
                                        <SelectItem value="other">{t('otherMidwife')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.midwifeId && <div className="text-xs text-red-600 font-medium">{errors.midwifeId.message}</div>}
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('notes')}</label>
                                <textarea
                                    className="flex w-full rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] transition-all duration-200"
                                    placeholder={t('notesPlaceholder')}
                                    {...notesField}
                                />
                                {errors.notes && <div className="text-xs text-red-600 font-medium ml-1">{errors.notes.message}</div>}
                            </div>
                        </>
                    )}
                </div>
            </form>
        </div>
    );
}
