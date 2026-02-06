'use client';

import { useBooking } from '@/app/[locale]/(public)/booking/_components/booking-context';
import { StepService } from '@/app/[locale]/(public)/booking/_components/step-service';
import { StepDateTime } from '@/app/[locale]/(public)/booking/_components/step-datetime';
import { StepAddons } from '@/app/[locale]/(public)/booking/_components/step-addons';
import { ClientStepReview } from './_components/client-step-review'; // Custom simplified review
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { useFormatter } from 'next-intl';
import { formatEuroCents } from '@/lib/currency/format';
import { Button } from '@/components/ui/button';
import { RotateLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ClientBookingFlow() {
    const {
        step,
        loadingServices,
        serviceId,
        selectedService,
        date,
        selectedSlot,
        loadingHeatmap,
        grandTotalCents,
        hasAddons,
        policyExtraPriceCents,
        selectedAddOnItems,
        handleStartOver,
        isTwin
    } = useBooking();

    const t = useTranslations('Booking.flow');
    const format = useFormatter();

    const otherSelections = [
        ...(isTwin && selectedService ? [{ label: `${t('isTwinPregnancy')} (+${formatEuroCents(selectedService.price ?? 0)})`, price: 0 }] : []),
        ...(policyExtraPriceCents > 0 ? [{ label: t('policyExtras'), price: policyExtraPriceCents }] : []),
        ...selectedAddOnItems.map(a => ({ label: a.name, price: a.priceCents })),
    ];

    return (
        <div className="mx-auto w-full max-w-5xl flex flex-col lg:flex-row gap-6 mt-6 items-start justify-center">


            {/* Right Card: Interactive Steps */}
            <Card className="w-full max-w-lg shadow-2xl shadow-black/5 border-0 overflow-hidden bg-white/80 backdrop-blur-xl" style={{ borderRadius: '0.5rem' }}>
                <CardContent className="space-y-6 pt-12">
                    {step === 1 && (
                        <div className="animate-in fade-in zoom-in-95 duration-500 ease-in-out">
                            <StepService />
                        </div>
                    )}
                    {step === 2 && (
                        <div className="animate-in fade-in zoom-in-95 duration-500 ease-in-out">
                            <StepDateTime />
                        </div>
                    )}
                    {step === 3 && hasAddons && (
                        <div className="animate-in fade-in zoom-in-95 duration-500 ease-in-out">
                            <StepAddons />
                        </div>
                    )}
                    {step === 4 && (
                        <div className="animate-in fade-in zoom-in-95 duration-500 ease-in-out">
                            {/* Use our custom review component here */}
                            <ClientStepReview />
                        </div>
                    )}
                </CardContent>
            </Card>


            {/* Left Card: Summary */}
            <Card className="w-full max-w-lg shadow-2xl shadow-black/5 border-0 overflow-hidden bg-white/80 backdrop-blur-xl lg:sticky lg:top-18" style={{ borderRadius: '0.5rem' }}>
                <CardHeader className="relative pb-6 pt-8 px-8">
                    <div className="flex items-start justify-between">
                        {/* Header content if needed */}
                        <div></div>
                        {/* Reset Button */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full px-3 text-xs font-medium transition-colors">
                                    <HugeiconsIcon icon={RotateLeft01Icon} className="mr-1.5 h-3.5 w-3.5" />
                                    {t('reset')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{t('resetTitle')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t('resetDescription')}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t('back')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleStartOver} className="bg-red-600 hover:bg-red-700 text-white border-0">
                                        {t('confirmReset')}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6 relative h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-primary transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${(step / 4) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <span className={step >= 1 ? "text-primary transition-colors duration-300 delay-100" : ""}>{t('steps.service')}</span>
                        <span className={step >= 2 ? "text-primary transition-colors duration-300 delay-100" : ""}>{t('steps.dateTime')}</span>
                        {hasAddons && <span className={step >= 3 ? "text-primary transition-colors duration-300 delay-100" : ""}>{t('steps.addons')}</span>}
                        <span className={step >= 4 ? "text-primary transition-colors duration-300 delay-100" : ""}>{t('steps.review')}</span>
                    </div>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-4">

                    {/* Service Summary */}
                    {(loadingServices || serviceId) ? (
                        <div className="group relative overflow-hidden rounded-2xl bg-gray-50 hover:bg-gray-50/80 transition-colors duration-300">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
                            <div className="p-5 pl-7">
                                <p className="text-xs font-bold text-gray-800 tracking-wider mb-2">{t('service')}</p>
                                {loadingServices ? (
                                    <div className="space-y-2">
                                        <div className="h-6 w-3/4 bg-gray-200/50 rounded animate-pulse" />
                                        <div className="h-4 w-1/4 bg-gray-200/50 rounded animate-pulse" />
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in zoom-in-95 duration-500">
                                        <p className="text-lg font-bold text-gray-900 leading-tight">
                                            {selectedService?.name || t('noServiceSelected')}
                                        </p>
                                        <p className="text-sm font-bold text-primary mt-1">
                                            {formatEuroCents((selectedService?.price ?? 0))}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="group relative overflow-hidden rounded-2xl bg-gray-50 hover:bg-gray-50/80 transition-colors duration-300">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
                            <div className="p-5 pl-7">
                                <p className="text-xs font-bold text-gray-800 tracking-wider mb-2">{t('service')}</p>
                                <div>
                                    <div className="flex items-center gap-2 opacity-25">
                                        <div className="h-4 w-24 bg-gray-300 rounded-full animate-pulse" />
                                        <div className="h-4 w-16 bg-gray-300 rounded-full animate-pulse delay-75" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Date/Time Summary */}
                    {(loadingHeatmap || date) ? (
                        <div className="group relative overflow-hidden rounded-2xl bg-gray-50 hover:bg-gray-50/80 transition-colors duration-300">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
                            <div className="p-5 pl-7">
                                <p className="text-xs font-bold text-gray-800 tracking-wider mb-2">{t('dateTime')}</p>
                                {loadingHeatmap ? (
                                    <div className="space-y-2">
                                        <div className="h-6 w-1/2 bg-gray-200/50 rounded animate-pulse" />
                                        <div className="h-4 w-1/3 bg-gray-200/50 rounded animate-pulse" />
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in zoom-in-95 duration-500">
                                        <p className="text-lg font-bold text-gray-900 capitalize">
                                            {format.dateTime(new Date(date), { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </p>
                                        {selectedSlot && (
                                            <p className="text-sm font-bold text-primary mt-0.5">
                                                {format.dateTime(new Date(selectedSlot.startTime), { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="group relative overflow-hidden rounded-2xl bg-gray-50 hover:bg-gray-50/80 transition-colors duration-300">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
                            <div className="p-5 pl-7">
                                <p className="text-xs font-bold text-gray-800 tracking-wider mb-2">{t('dateTime')}</p>
                                <div>
                                    <div className="flex items-center gap-2 opacity-25">
                                        <div className="h-4 w-10 bg-gray-300 rounded-full animate-pulse" />
                                        <div className="h-4 w-36 bg-gray-300 rounded-full animate-pulse delay-75" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Others Summary */}
                    {(loadingServices || otherSelections.length > 0) ? (
                        <div className="group relative overflow-hidden rounded-2xl bg-gray-50 hover:bg-gray-50/80 transition-colors duration-300">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
                            <div className="p-5 pl-7">
                                <p className="text-xs font-bold text-gray-800 tracking-wider mb-2">{t('others')}</p>
                                {loadingServices ? (
                                    <div className="h-6 w-3/4 bg-gray-200/50 rounded animate-pulse" />
                                ) : (
                                    <div className="animate-in fade-in zoom-in-95 duration-500">
                                        <div className="flex flex-col gap-1">
                                            {otherSelections.map((item, idx) => (
                                                <p key={idx} className="text-sm font-bold text-gray-900 leading-tight">
                                                    {item.label}
                                                    {item.price > 0 && (
                                                        <span className="text-primary ml-1">
                                                            (+{formatEuroCents(item.price)})
                                                        </span>
                                                    )}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="group relative overflow-hidden rounded-2xl bg-gray-50 hover:bg-gray-50/80 transition-colors duration-300">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
                            <div className="p-5 pl-7">
                                <p className="text-xs font-bold text-gray-800 tracking-wider mb-2">{t('others')}</p>
                                <div>
                                    <div className="flex items-center gap-2 opacity-25">
                                        <div className="h-4 w-10 bg-gray-300 rounded-full animate-pulse" />
                                        <div className="h-4 w-24 bg-gray-300 rounded-full animate-pulse delay-75" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Total Cost Summary */}
                    <div className="pt-4 mt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-800">{t('totalDue')}</span>
                            <span className="text-2xl font-bold text-primary tracking-tight">
                                {formatEuroCents(grandTotalCents || 0)}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
