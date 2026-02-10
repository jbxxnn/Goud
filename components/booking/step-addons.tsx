'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { formatEuroCents } from '@/lib/currency/format';
import { useBooking } from './booking-context';
import { Checkbox } from '@/components/ui/checkbox';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';

export function StepAddons() {
    const {
        selectedService,
        selectedAddons,
        toggleAddonSelection,
        toggleAddonOptionSelection,
        grandTotalCents,
        setStep,
    } = useBooking();

    const t = useTranslations('Booking.flow');


    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-poppins font-bold text-gray-900">{t('addons.title')}</h2>
                <p className="text-sm text-gray-600">{t('addons.subtitle')}</p>
            </div>

            {!selectedService ? (
                <p className="text-sm text-gray-600">{t('addons.selectServiceFirst')}</p>
            ) : (
                <div className="space-y-4">
                    {selectedService.addons.map((addon) => {
                        const hasOptions = addon.options && addon.options.length > 0;
                        const selection = selectedAddons[addon.id];
                        const checked = addon.isRequired || Boolean(selection);

                        return (
                            <div key={addon.id} className="bg-gray-50 border border-transparent transition-all" style={{ borderRadius: '1rem' }}>
                                <label className="flex items-start gap-4 p-4 cursor-pointer">
                                    <Checkbox
                                        className="mt-1 rounded-full border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-primary"
                                        checked={checked}
                                        disabled={addon.isRequired || hasOptions} // Force option selection if hasOptions
                                        onCheckedChange={() => !hasOptions && toggleAddonSelection(addon.id)}
                                    />
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="text-sm font-bold">{addon.name}</span>
                                            {!hasOptions && (
                                                <span className="text-sm text-gray-700 font-bold">{formatEuroCents(addon.priceCents)}</span>
                                            )}
                                        </div>
                                        {addon.description && <p className="text-sm text-gray-500">{addon.description}</p>}
                                        {addon.isRequired && (
                                            <p className="text-xs text-amber-600 font-medium">{t('addons.requiredAddon')}</p>
                                        )}
                                    </div>
                                </label>

                                {hasOptions && (
                                    <div className="px-4 pb-4 pt-1 ml-9 space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {addon.options!.map((option) => {
                                                const isSelected = selection === option.id;
                                                return (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        onClick={() => toggleAddonOptionSelection(addon.id, option.id)}
                                                        className={`flex items-center justify-between px-3 py-2 text-xs border rounded-lg transition-all ${isSelected
                                                            ? 'bg-primary border-primary text-white font-bold'
                                                            : 'bg-white border-gray-200 text-gray-700 hover:border-primary/50'
                                                            }`}
                                                    >
                                                        <span>{option.name}</span>
                                                        <span>{formatEuroCents(option.priceCents)}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedService && (
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 animate-in fade-in slide-in-from-top-4 duration-500 ease-in-out" style={{ borderRadius: '1rem' }}>
                    <span className="text-sm font-bold text-gray-700">{t('currentTotal')}</span>
                    <span className="text-sm font-bold text-gray-900">{formatEuroCents(grandTotalCents)}</span>
                </div>
            )}

            <div className="flex justify-between pt-2">
                <Button onClick={() => setStep(2)} className="h-auto px-8 bg-primary hover:bg-secondary-foreground text-white font-medium shadow-lg transition-all duration-300 ease-in-out" style={{ borderRadius: '1rem' }}>
                    <HugeiconsIcon icon={ArrowLeft01Icon} />
                    {t('back')}
                </Button>
                <Button
                    onClick={() => setStep(4)}
                    className="h-auto px-8 bg-primary hover:bg-secondary-foreground text-white font-medium shadow-lg transition-all duration-300 ease-in-out" style={{ borderRadius: '1rem' }}
                >
                    {t('continue')}
                    <HugeiconsIcon icon={ArrowRight01Icon} />
                </Button>
            </div>
        </div>
    );
}
