'use client';

import { useMemo } from 'react';
import { useTranslations, useFormatter } from 'next-intl';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useBooking } from './booking-context';
import { formatEuroCents } from '@/lib/currency/format';
import { StepService } from './step-service';
import { StepDateTime } from './step-datetime';
import { StepAddons } from './step-addons';
import { StepReview } from './step-review';

export function BookingFlow() {
    const t = useTranslations('Booking.flow');
    const format = useFormatter();

    const {
        step,
        handleStartOver,
        currentStepNumber,
        totalSteps,
        hasAddons,
        locations,
        locationId,
        loadingLocations,
        date,
        loadingHeatmap,
        selectedSlot,
        loadingServices,
        selectedService,
        serviceId,
        grandTotalCents,
        selectedAddOnItems,
        policyResponses,
    } = useBooking();

    const otherSelections = useMemo(() => {
        const items: { label: string; price: number }[] = [];
        if (selectedService?.policyFields && policyResponses) {
            selectedService.policyFields.forEach(field => {
                const response = policyResponses[field.id];
                if (response && field.choices) {
                    if (typeof response === 'string') {
                        const option = field.choices.find(o => o.id === response);
                        if (option) {
                            items.push({
                                label: `${field.title}: ${option.title}`,
                                price: option.price ? Math.round(option.price * 100) : 0
                            });
                        }
                    } else if (Array.isArray(response)) {
                        response.forEach(rId => {
                            const option = field.choices?.find(o => o.id === rId);
                            if (option) {
                                items.push({
                                    label: `${field.title}: ${option.title}`,
                                    price: option.price ? Math.round(option.price * 100) : 0
                                });
                            }
                        });
                    }
                }
            });
        }
        if (selectedAddOnItems) {
            selectedAddOnItems.forEach(addon => {
                items.push({
                    label: addon.name,
                    price: addon.priceCents
                });
            });
        }
        return items;
    }, [selectedAddOnItems, selectedService, policyResponses]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-start justify-center p-4 gap-6">


            {/* this is the left card */}
            <Card className="w-full max-w-lg shadow-2xl shadow-black/5 border-0 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-xl sticky top-18">
                <CardHeader className="relative pb-6 pt-8 px-8">
                    <div className="flex items-start justify-between">
                        {/* <div>
                            <h1 className="text-2xl font-poppins font-bold text-gray-900 tracking-tight">Your Booking</h1>
                            <p className="text-sm text-gray-500 mt-1 font-medium">Complete the steps to schedule</p>
                        </div> */}
                        <div className="flex gap-2 w-20">
                            {Array.from({ length: totalSteps }).map((_, idx) => {
                                const stepNum = idx + 1;
                                const isActive = currentStepNumber >= stepNum;
                                return (
                                    <div
                                        key={idx}
                                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ease-out ${isActive ? 'bg-primary shadow-sm shadow-primary/30' : 'bg-gray-100'}`}
                                    />
                                );
                            })}
                        </div>
                        <div className="flex flex-col gap-2">
                            {/* <div className="px-3 py-1 bg-primary/10 rounded-full">
                                <span className="text-xs font-bold text-primary tracking-wide">STEP {currentStepNumber} / {totalSteps}</span>
                            </div> */}
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        size="sm"
                                        className="text-xs text-gray-400 hover:text-red-500 h-auto p-1 px-2 bg-primary border border-primary text-primary-foreground hover:bg-red-300 hover:border hover:border-red-500 font-medium transition-colors"
                                        style={{ borderRadius: '1rem' }}
                                    >
                                        {t('reset')}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-white/90 backdrop-blur-xl border-0 rounded-[2rem] shadow-2xl max-w-sm" style={{ borderRadius: '1rem' }}>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-xl font-bold text-gray-900">{t('resetTitle')}</AlertDialogTitle>
                                        <AlertDialogDescription className="text-gray-600">
                                            {t('resetDescription')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-xl border-0 bg-gray-100/50 hover:bg-gray-200/50 text-gray-700">{t('back')}</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleStartOver}
                                            className="rounded-xl bg-primary hover:bg-secondary-foreground text-white shadow-lg shadow-primary/20"
                                        >
                                            {t('confirmReset')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
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
                                    <div>
                                        <div className="flex items-center gap-2 opacity-25">
                                            <div className="h-4 w-10 bg-gray-300 rounded-full animate-pulse" />
                                            <div className="h-4 w-40 bg-gray-300 rounded-full animate-pulse delay-75" />
                                        </div>
                                        <div className="flex items-center gap-2 opacity-25 mt-2">
                                            <div className="h-2 w-16 bg-gray-300 rounded-full animate-pulse" />
                                            <div className="h-2 w-10 bg-gray-300 rounded-full animate-pulse delay-75" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in zoom-in-95 duration-500">
                                        <p className="text-2xl font-bold text-gray-900">{selectedService?.name}</p>
                                        {(selectedService?.price ?? 0) > 0 && (
                                            <p className="text-sm font-bold text-primary mt-0.5">{formatEuroCents(selectedService?.price ?? 0)}</p>
                                        )}
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
                                        <div className="h-4 w-10 bg-gray-300 rounded-full animate-pulse" />
                                        <div className="h-4 w-40 bg-gray-300 rounded-full animate-pulse delay-75" />
                                    </div>
                                    <div className="flex items-center gap-2 opacity-25 mt-2">
                                        <div className="h-2 w-16 bg-gray-300 rounded-full animate-pulse" />
                                        <div className="h-2 w-10 bg-gray-300 rounded-full animate-pulse delay-75" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Location Summary */}
                    {(loadingLocations || locationId) ? (
                        <div className="group relative overflow-hidden rounded-2xl bg-gray-50 hover:bg-gray-50/80 transition-colors duration-300">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
                            <div className="p-5 pl-7">
                                <p className="text-xs font-bold text-gray-800 tracking-wider mb-2">{t('location')}</p>
                                {loadingLocations ? (
                                    <div className="h-6 w-3/4 bg-gray-200/50 rounded animate-pulse" />
                                ) : (
                                    <div className="animate-in fade-in zoom-in-95 duration-500">
                                        <p className="text-lg font-bold text-gray-900">
                                            {locations.find(l => l.id === locationId)?.name}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="group relative overflow-hidden rounded-2xl bg-gray-50 hover:bg-gray-50/80 transition-colors duration-300">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
                            <div className="p-5 pl-7">
                                <p className="text-xs font-bold text-gray-800 tracking-wider mb-2">{t('location')}</p>
                                <div>
                                    <div className="flex items-center gap-2 opacity-25">
                                        <div className="h-4 w-10 bg-gray-300 rounded-full animate-pulse" />
                                        <div className="h-4 w-32 bg-gray-300 rounded-full animate-pulse delay-75" />
                                    </div>
                                    <div className="flex items-center gap-2 opacity-25 mt-2">
                                        <div className="h-2 w-12 bg-gray-300 rounded-full animate-pulse" />
                                        <div className="h-2 w-8 bg-gray-300 rounded-full animate-pulse delay-75" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Date & Time Summary */}
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
                                    <div className="flex items-center gap-2 opacity-25 mt-2">
                                        <div className="h-2 w-16 bg-gray-300 rounded-full animate-pulse" />
                                        <div className="h-2 w-10 bg-gray-300 rounded-full animate-pulse delay-75" />
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
                                    <div className="flex items-center gap-2 opacity-25 mt-2">
                                        <div className="h-2 w-12 bg-gray-300 rounded-full animate-pulse" />
                                        <div className="h-2 w-8 bg-gray-300 rounded-full animate-pulse delay-75" />
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


            {/* this is the right card */}
            <Card className="w-full max-w-lg shadow-2xl shadow-black/5 border-0 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-xl">
                {/* <div className="w-full h-12" style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem', background: 'linear-gradient(180deg, oklch(0.8412 0.0402 57.2748) 0%, oklch(0.9449 0.0154 48.5561) 100%)' }}></div> */}
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
                            <StepReview />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
