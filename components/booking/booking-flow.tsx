'use client';

import { useBooking } from './booking-context';
import { StepService } from './step-service';
import { StepDateTime } from './step-datetime';
import { StepReview } from './step-review';
import { StepAddons } from './step-addons';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { useFormatter } from 'next-intl';
import { formatEuroCents } from '@/lib/currency/format';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogAction, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { RotateLeft01Icon } from '@hugeicons/core-free-icons';

export function BookingFlow({ embedded = false }: { embedded?: boolean }) {
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
        addonExtraPriceCents,
        selectedAddOnItems,
        handleStartOver,
        errorMsg,
        lockService,
    } = useBooking();

    const t = useTranslations('Booking.flow');
    const format = useFormatter();

    const otherSelections = [
        ...(policyExtraPriceCents > 0 ? [{ label: t('policyExtras'), price: policyExtraPriceCents }] : []),
        ...selectedAddOnItems.map(a => ({ label: a.name, price: a.priceCents })),
    ];

    const containerClassName = embedded
        ? `w-full max-w-none flex flex-col lg:flex-row gap-6 items-start justify-stretch px-0 ${lockService ? 'mt-0 pb-0' : 'mt-[2rem] pb-[2rem]'}`
        : `mx-auto w-full max-w-5xl flex flex-col lg:flex-row gap-6 items-start justify-center px-4 ${lockService ? 'mt-0 pb-0' : 'mt-[2rem] pb-[2rem]'}`;
    const mobileSummaryCardClassName = embedded ? 'w-full lg:hidden' : 'w-full max-w-lg lg:hidden';
    const mainCardClassName = embedded
        ? 'w-full min-w-0 shadow-2xl shadow-black/5 border-0 rounded-md overflow-hidden bg-white/80 backdrop-blur-xl lg:flex-[1.15]'
        : 'w-full max-w-lg shadow-2xl shadow-black/5 border-0 rounded-md overflow-hidden bg-white/80 backdrop-blur-xl';
    const sidebarCardClassName = embedded
        ? 'w-full min-w-0 hidden lg:flex flex-col shadow-2xl shadow-black/5 border-0 rounded-md overflow-hidden bg-white/80 backdrop-blur-xl lg:flex-1 lg:sticky lg:top-18'
        : 'w-full max-w-lg hidden lg:flex flex-col shadow-2xl shadow-black/5 border-0 rounded-md overflow-hidden bg-white/80 backdrop-blur-xl lg:sticky lg:top-18';

    return (
        <div 
            className={containerClassName}
            style={lockService ? {} : { marginTop: "2rem", marginBottom: "2rem", paddingBottom: "2rem" }}
        >


            {step === 4 && (
                <Card className={mobileSummaryCardClassName} style={{ borderRadius: "0.5rem" }}>
                    
                    <CardContent className="p-4 space-y-4">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="default" size="sm" className="h-8 text-white hover:text-white rounded-full px-3 text-xs font-medium transition-colors">
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
                                    <AlertDialogAction onClick={handleStartOver} className="bg-red-600 hover:bg-red-700 text-white border-0 rounded-full" style={{ borderRadius: '10rem' }}>
                                        {t('confirmReset')}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            <p className="text-lg font-bold text-gray-900 leading-tight">
                                {selectedService?.name || t('noServiceSelected')}
                            </p>
                            {(selectedService?.price ?? 0) > 0 && (
                                <p className="text-xs font-bold text-primary mt-1">
                                    {formatEuroCents((selectedService?.price ?? 0))}
                                </p>
                            )}
                        </div>
                         <div className="animate-in fade-in zoom-in-95 duration-500">
                                        <p className="text-lg font-bold text-gray-900 capitalize">
                                            {format.dateTime(new Date(date), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })}
                                        </p>
                                        {selectedSlot && (
                                            <p className="text-sm font-bold text-primary mt-0.5">
                                                {format.dateTime(new Date(selectedSlot.startTime), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })}
                                            </p>
                                        )}
                        </div>

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
                        <div className="flex flex-col items-end">
                                <span className="text-2xl font-bold text-primary tracking-tight">
                                    {grandTotalCents > 0 
                                        ? formatEuroCents(grandTotalCents) 
                                        : (selectedService?.customPriceLabel || formatEuroCents(0))}
                                </span>
                                {grandTotalCents === 0 && selectedService?.customPriceDescription && (
                                    <span className="text-xs text-gray-500 mt-1 font-medium text-right">
                                        {selectedService.customPriceDescription}
                                    </span>
                                )}
                            </div>
                                    
                    </CardContent>
                </Card>
            )}
            {/* this is the right card */}
            <Card className={mainCardClassName} style={{ borderRadius: "0.5rem" }}>
                {/* <div className="w-full h-12" style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem', background: 'linear-gradient(180deg, oklch(0.8412 0.0402 57.2748) 0%, oklch(0.9449 0.0154 48.5561) 100%)' }}></div> */}
                <CardContent className="space-y-6 pt-12">
                    {errorMsg && step === 1 && !loadingServices ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center text-center space-y-4 py-8"
                        >
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
                                <HugeiconsIcon icon={RotateLeft01Icon} className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">{t('errorTitle')}</h2>
                            <p className="text-gray-600 max-w-xs mx-auto leading-relaxed">
                                {errorMsg}
                            </p>
                            <Button
                                onClick={() => window.location.href = '/'}
                                className="mt-4 rounded-full px-8 bg-primary hover:bg-primary/90 text-white"
                            >
                                {t('confirmReset')}
                            </Button>
                        </motion.div>
                    ) : (
                        <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step-service"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <StepService />
                            </motion.div>
                        )}
                        {step === 2 && (
                            <motion.div
                                key="step-datetime"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <StepDateTime />
                            </motion.div>
                        )}
                        {step === 3 && hasAddons && (
                            <motion.div
                                key="step-addons"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <StepAddons />
                            </motion.div>
                        )}
                        {step === 4 && (
                            <motion.div
                                key="step-review"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <StepReview />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    )}
                </CardContent>
            </Card>
            

            {/* this is the left card */}
            <Card className={sidebarCardClassName} style={{ borderRadius: "0.5rem" }}>
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
                                    <AlertDialogAction onClick={handleStartOver} className="bg-red-600 hover:bg-red-700 text-white border-0 rounded-full" style={{ borderRadius: '10rem' }}>
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
                    {serviceId && (
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
                                        {(selectedService?.price ?? 0) > 0 && (
                                            <p className="text-sm font-bold text-primary mt-1">
                                                {formatEuroCents((selectedService?.price ?? 0))}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    {/* Date/Time Summary */}
                    {date && (
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
                                            {format.dateTime(new Date(date), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })}
                                        </p>
                                        {selectedSlot && (
                                            <p className="text-sm font-bold text-primary mt-0.5">
                                                {format.dateTime(new Date(selectedSlot.startTime), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Others Summary */}
                    {otherSelections.length > 0 && (
                        <div className="group relative overflow-hidden rounded-2xl bg-gray-50 hover:bg-gray-50/80 transition-colors duration-300">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
                            <div className="p-5 pl-7">
                                <p className="text-xs font-bold text-gray-800 tracking-wider mb-2">{t('others')}</p>
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
                            </div>
                        </div>
                    )}

                    {/* Total Cost Summary */}
                    <div className="pt-4 mt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            {!(grandTotalCents === 0 && selectedService?.customPriceLabel) && (
                                <span className="text-xs font-bold text-gray-800">{t('totalDue')}</span>
                            )}
                            <div className="flex flex-col items-end">
                                <span className="text-2xl font-bold text-primary tracking-tight">
                                    {grandTotalCents > 0 
                                        ? formatEuroCents(grandTotalCents) 
                                        : (selectedService?.customPriceLabel || formatEuroCents(0))}
                                </span>
                                {grandTotalCents === 0 && selectedService?.customPriceDescription && (
                                    <span className="text-xs text-gray-500 mt-1 font-medium text-right">
                                        {selectedService.customPriceDescription}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>


            </Card>

        </div>
    );
}
