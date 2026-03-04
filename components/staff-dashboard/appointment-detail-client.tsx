'use client';

import { useState } from 'react';
import { Booking } from '@/lib/types/booking';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    Calendar02Icon,
    Clock01Icon,
    Location01Icon,
    UserIcon,
    File01Icon,
    Tick01Icon,
    AlertCircleIcon,
    ImageUploadIcon,
    ArrowLeft01Icon,
    Link01Icon,
    InformationCircleIcon,
    Loading03Icon
} from '@hugeicons/core-free-icons';
import { parseISO, differenceInWeeks, differenceInDays, addDays, subDays, differenceInMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { nl, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { MediaSection } from './media-section';
import PageContainer, { PageItem } from '@/components/ui/page-transition';
import { useQueryClient } from '@tanstack/react-query';
import { RepeatPrescriber } from '@/components/repeat-prescriber';
import { useTranslations } from 'next-intl';
import { ChecklistManager } from './checklist-manager';
import { MidwifeLabel } from '../midwife-label';
import { useLocale } from 'next-intl';

interface AppointmentDetailClientProps {
    booking: any;
    currentUser: any;
    previousBookings?: any[];
}

export function AppointmentDetailClient({ booking, currentUser, previousBookings = [] }: AppointmentDetailClientProps) {
    const t = useTranslations('AppointmentDetail');
    const tModal = useTranslations('BookingModal');
    const locale = useLocale();
    const router = useRouter();
    const queryClient = useQueryClient();
    // const [notes, setNotes] = useState(booking.internal_notes || '');
    // const [isSaving, setIsSaving] = useState(false);
    // const [isCompleting, setIsCompleting] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isNoShowing, setIsNoShowing] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    // Gestational Age Calculation
    const calculateGA = () => {
        if (!booking.due_date) return null;
        const dueDate = new Date(booking.due_date);
        const today = new Date();

        // Due date is 40 weeks (280 days) from LMP roughly.
        // Days Remaining = DueDate - Today
        // Days Elapsed = 280 - Days Remaining

        const daysRemaining = differenceInDays(dueDate, today);
        const daysElapsed = 280 - daysRemaining;

        if (daysElapsed < 0) return { weeks: 0, days: 0 }; // Future conception?

        const weeks = Math.floor(daysElapsed / 7);
        const days = daysElapsed % 7;

        return { weeks, days };
    };

    const ga = calculateGA();

    // const handleSaveNotes = async () => {
    //     setIsSaving(true);
    //     try {
    //         const res = await fetch(`/api/bookings/${booking.id}`, {
    //             method: 'PATCH',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ internal_notes: notes })
    //         });
    //
    //         if (!res.ok) throw new Error('Failed to save notes');
    //
    //         toast.success(t('toasts.notesSaved'));
    //         // Invalidate bookings list so the dashboard is fresh
    //         queryClient.invalidateQueries({ queryKey: ['bookings'] });
    //     } catch (error) {
    //         toast.error(t('toasts.notesError'));
    //     } finally {
    //         setIsSaving(false);
    //     }
    // };

    return (
        <PageContainer className="container py-6 max-w-5xl mx-auto space-y-6">
            <PageItem>
                <Button 
                    variant="ghost" 
                    className="mb-2" 
                    onClick={() => {
                        setIsNavigating(true);
                        router.back();
                    }}
                    disabled={isNavigating}
                >
                    {isNavigating ? (
                        <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-2 h-4 w-4" />
                    )}
                    {t('backToDashboard')}
                </Button>
            </PageItem>

            {/* Header Section */}
            <PageItem>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            {booking.users?.first_name} {booking.users?.last_name}
                            <Badge variant={
                                booking.status === 'confirmed' ? 'default' :
                                    booking.status === 'completed' ? 'default' : 'secondary'
                            }>
                                {booking.status}
                            </Badge>
                            {booking.parent_booking_id && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] px-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                    onClick={() => {
                                        setIsNavigating(true);
                                        router.push(`/dashboard/appointments/${booking.parent_booking_id}`);
                                    }}
                                    disabled={isNavigating}
                                >
                                    <HugeiconsIcon icon={isNavigating ? Loading03Icon : Link01Icon} size={12} className={`mr-1 ${isNavigating ? 'animate-spin' : ''}`} />
                                    {t('linkedToParent')}
                                </Button>
                            )}
                        </h1>
                        <div className="text-muted-foreground flex items-center gap-4 mt-1 text-sm">
                            <span className="flex items-center gap-1">
                                <HugeiconsIcon icon={Calendar02Icon} size={14} />
                                {formatInTimeZone(new Date(booking.start_time), 'Europe/Amsterdam', 'PPP', { locale: locale === 'nl' ? nl : enUS })}
                            </span>
                            <span className="flex items-center gap-1">
                                <HugeiconsIcon icon={Clock01Icon} size={14} />
                                {formatInTimeZone(new Date(booking.start_time), 'Europe/Amsterdam', 'HH:mm')} - {formatInTimeZone(new Date(booking.end_time), 'Europe/Amsterdam', 'HH:mm')}
                            </span>
                            <span className="flex items-center gap-1">
                                <HugeiconsIcon icon={Location01Icon} size={14} />
                                <a href={`https://google.com/maps/search/?api=1&query=${booking.locations?.address}`} target="_blank">
                                    {booking.locations?.name}
                                </a>
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {booking.status === 'completed' && (
                            <RepeatPrescriber bookingId={booking.id} serviceId={booking.service_id} />
                        )}
                        {['confirmed', 'completed', 'ongoing'].includes(booking.status) && (
                            <>
                                <Button
                                    disabled={isNoShowing || isCompleting}
                                    className='bg-gray-800'
                                    onClick={async () => {
                                        try {
                                            setIsNoShowing(true);
                                            const res = await fetch(`/api/bookings/${booking.id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ status: 'no_show' })
                                            });
                                            if (!res.ok) throw new Error('Failed to mark as no show');
                                            toast.success(t('toasts.noShow', { fallback: 'Marked as no show' }));
                                            queryClient.invalidateQueries({ queryKey: ['bookings'] });
                                            router.refresh();
                                        } catch (e) {
                                            toast.error(t('toasts.noShowError', { fallback: 'Failed to mark as no show' }));
                                            setIsNoShowing(false);
                                        }
                                    }}
                                >
                                    {isNoShowing ? t('markingNoShow', { fallback: 'Marking...' }) : t('markNoShow', { fallback: 'Mark No Show' })}
                                </Button>
                                {booking.status === 'confirmed' && (
                                <Button
                                    disabled={isCompleting}
                                    onClick={async () => {
                                    try {
                                        setIsCompleting(true);
                                        const res = await fetch(`/api/bookings/${booking.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ status: 'completed' })
                                        });
                                        if (!res.ok) throw new Error('Failed to complete');
                                        toast.success(t('toasts.completed'));
                                        queryClient.invalidateQueries({ queryKey: ['bookings'] });
                                        router.refresh();
                                    } catch (e) {
                                        toast.error(t('toasts.completeError'));
                                        setIsCompleting(false);
                                    }
                                }}
                            >
                                {isCompleting ? t('completing') : t('completeAppointment')}
                            </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </PageItem>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column: Patient Info */}
                <div className="space-y-6">
                    <PageItem className='space-y-6'>
                        <Card style={{borderRadius: '10px'}}>
                            <CardHeader>
                                <CardTitle className="text-base">{t('patientDetails')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">{t('email')}</div>
                                    <div>{booking.users?.email}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">{t('phone')}</div>
                                    <div>{booking.users?.phone || 'N/A'}</div>
                                </div>
                                <Separator />
                                
                                {(booking.users?.street_name || booking.users?.city || booking.users?.address) && (
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">{tModal('address')}</div>
                                        <div className="text-sm">
                                            {booking.users.street_name ? (
                                                `${booking.users.street_name} ${booking.users.house_number || ''}, ${booking.users.postal_code || ''} ${booking.users.city || ''}`
                                            ) : (
                                                booking.users.address || 'N/A'
                                            )}
                                        </div>
                                    </div>
                                )}

                                {(booking.users?.birth_date || booking.birth_date) && (
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">{tModal('birthDate')}</div>
                                        <div className="text-sm">
                                            {formatInTimeZone(new Date(booking.users?.birth_date || booking.birth_date!), 'Europe/Amsterdam', 'PPP', { locale: locale === 'nl' ? nl : enUS })}
                                        </div>
                                    </div>
                                )}

                                <Separator />
                                
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">{t('dueDate')}</div>
                                    <div className="font-semibold">{booking.due_date ? formatInTimeZone(new Date(booking.due_date), 'Europe/Amsterdam', 'PPP', { locale: locale === 'nl' ? nl : enUS }) : t('notSet')}</div>
                                </div>

                                {(booking.midwife_id || booking.other_midwife_name) && (
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">{tModal('midwife')}</div>
                                        <div className="text-sm">
                                            {booking.midwife_id ? (
                                                <MidwifeLabel id={booking.midwife_id} />
                                            ) : (
                                                booking.other_midwife_name
                                            )}
                                        </div>
                                    </div>
                                )}

                                {(booking.gravida || booking.para) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        {booking.gravida && (
                                            <div>
                                                <div className="text-sm font-medium text-muted-foreground">{tModal('gravida')}</div>
                                                <div className="text-sm">{booking.gravida}</div>
                                            </div>
                                        )}
                                        {booking.para && (
                                            <div>
                                                <div className="text-sm font-medium text-muted-foreground">{tModal('para')}</div>
                                                <div className="text-sm">{booking.para}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {ga && (
                                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                                        <div className="text-sm font-medium text-primary">{t('gestationalAge')}</div>
                                        <div className="text-2xl font-bold text-primary">
                                            {ga.weeks}<span className="text-sm font-normal text-muted-foreground ml-1">w</span> {ga.days}<span className="text-sm font-normal text-muted-foreground ml-1">d</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <MediaSection bookingId={booking.id} />

                        {/* Previous History */}
                        <Card style={{borderRadius: '10px'}}>
                            <CardHeader>
                                <CardTitle className="text-base">{t('previousAppointments')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {previousBookings && previousBookings.length > 0 ? (
                                    <div className="space-y-3">
                                        {previousBookings.map((prev: any) => (
                                            <div 
                                                key={prev.id} 
                                                className={`flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer ${isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                                onClick={() => {
                                                    if (isNavigating) return;
                                                    setIsNavigating(true);
                                                    router.push(`/dashboard/appointments/${prev.id}`);
                                                }}
                                            >
                                                <div className="space-y-1">
                                                    <div className="font-medium text-sm flex items-center gap-2">
                                                        {prev.services?.name}
                                                        {isNavigating && <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin text-muted-foreground" />}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                        <span>{formatInTimeZone(new Date(prev.start_time), 'Europe/Amsterdam', 'PPP', { locale: locale === 'nl' ? nl : enUS })}</span>
                                                        <span>•</span>
                                                        <span>{prev.locations?.name}</span>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-xs">{prev.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">{t('noHistory')}</p>
                                )}
                            </CardContent>
                        </Card>
                    </PageItem>
                </div>

                {/* Right Column: Medical View */}
                <div className="md:col-span-2 space-y-6">

                    {/* Internal Staff Notes */}
                    {booking.internal_notes && (
                        <Card className="border-blue-200 bg-blue-50" style={{borderRadius: '10px'}}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                                    <HugeiconsIcon icon={InformationCircleIcon} size={16} />
                                    {t('internalNotes') || "Internal Staff Notes"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-blue-700 whitespace-pre-wrap">{booking.internal_notes}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Service & Notes */}
                    <Card style={{borderRadius: '10px'}}>
                        <CardHeader>
                            <CardTitle>{booking.services?.name} {booking.isRepeat && <Badge variant="secondary" className="bg-primary text-primary-foreground border-primary hover:bg-primary/20 h-4 text-xs px-1 uppercase font-bold tracking-wider">
                                {differenceInMinutes(new Date(booking.end_time), new Date(booking.start_time))}
                            </Badge>}</CardTitle>
                            <CardDescription>
                                {booking.booking_addons && booking.booking_addons.length > 0 ? (
                                    <span>{t('addons')} {booking.booking_addons.map((a: any) => a.service_addons?.name).join(', ')}</span>
                                ) : t('standardAppointment')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Checklist Manager */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <HugeiconsIcon icon={File01Icon} size={16} />
                                        {t('medicalNotesAndChecklist')}
                                    </label>
                                </div>
                                <ChecklistManager bookingId={booking.id} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Price Breakdown */}
                    <Card style={{borderRadius: '10px'}}>
                        <CardHeader>
                            <CardTitle className="text-base">{tModal('priceBreakdown')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                const addonsTotal = (booking.booking_addons || []).reduce((sum: number, addon: any) => sum + ((addon.price_eur_cents || 0) * (addon.quantity || 1)), 0);
                                const policyTotal = (() => {
                                    if (!booking.policy_answers || !Array.isArray(booking.policy_answers)) return 0;
                                    return booking.policy_answers.reduce((sum: number, answer: { priceEurCents?: number }) => {
                                        return sum + (answer.priceEurCents || 0);
                                    }, 0);
                                })();
                                const basePrice = booking.price_eur_cents - addonsTotal - policyTotal;

                                return (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">{tModal('baseService')}</span>
                                            <span className="font-medium">€{(basePrice / 100).toFixed(2)}</span>
                                        </div>

                                        {policyTotal > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">{tModal('servicePolicy')}</span>
                                                <span className="font-medium">€{(policyTotal / 100).toFixed(2)}</span>
                                            </div>
                                        )}

                                        {addonsTotal > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">{tModal('addons')}</span>
                                                <span className="font-medium">€{(addonsTotal / 100).toFixed(2)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center pt-3 mt-3 border-t">
                                            <span className="font-semibold text-base">{tModal('total')}</span>
                                            <span className="font-bold text-lg text-primary">€{(booking.price_eur_cents / 100).toFixed(2)}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>

                    {/* Selected Addons */}
                    {booking.booking_addons && booking.booking_addons.length > 0 && (
                        <Card style={{borderRadius: '10px'}}>
                            <CardHeader>
                                <CardTitle className="text-base">{tModal('selectedAddons')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {booking.booking_addons.map((addon: any) => (
                                    <div key={addon.id} className="flex justify-between items-start p-3 bg-muted/30 border border-muted-foreground/10 rounded-lg text-sm">
                                        <div className="flex-1">
                                            <div className="font-medium">{addon.service_addons?.name}</div>
                                            {addon.service_addons?.description && (
                                                <div className="text-muted-foreground text-xs mt-1">{addon.service_addons.description}</div>
                                            )}
                                            {addon.quantity > 1 && (
                                                <div className="text-muted-foreground text-xs mt-1">{tModal('quantity', { quantity: addon.quantity })}</div>
                                            )}
                                        </div>
                                        <div className="font-medium ml-4">€{(((addon.price_eur_cents || 0) * (addon.quantity || 1)) / 100).toFixed(2)}</div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}



                </div>
            </div>
        </PageContainer>
    );
}
