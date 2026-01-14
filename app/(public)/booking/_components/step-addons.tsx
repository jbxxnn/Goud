'use client';

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
        grandTotalCents,
        setStep,
    } = useBooking();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-poppins font-bold text-gray-900">Select add-ons</h2>
                <p className="text-sm text-gray-600">Choose any additional services you&apos;d like to include.</p>
            </div>

            {!selectedService ? (
                <p className="text-sm text-gray-600">Selecteer eerst een service om beschikbare add-ons te zien.</p>
            ) : (
                <div className="space-y-3">
                    {selectedService.addons.map((addon) => {
                        const checked = addon.isRequired || Boolean(selectedAddons[addon.id]);
                        return (
                            <label key={addon.id} className="flex items-start gap-4 p-4 bg-gray-50 transition-colors cursor-pointer" style={{ borderRadius: '1rem' }}>
                                <Checkbox
                                    className="mt-1 rounded-full border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-primary"
                                    checked={checked}
                                    disabled={addon.isRequired}
                                    onCheckedChange={() => toggleAddonSelection(addon.id)}
                                />
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-sm font-bold">{addon.name}</span>
                                        <span className="text-sm text-gray-700 font-bold">{formatEuroCents(addon.priceCents)}</span>
                                    </div>
                                    {addon.description && <p className="text-sm text-gray-500">{addon.description}</p>}
                                    {addon.isRequired && (
                                        <p className="text-xs text-amber-600 font-medium">Deze add-on is verplicht en automatisch toegevoegd.</p>
                                    )}
                                </div>
                            </label>
                        );
                    })}
                </div>
            )}

            {selectedService && (
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 animate-in fade-in slide-in-from-top-4 duration-500 ease-in-out" style={{ borderRadius: '1rem' }}>
                    <span className="text-sm font-bold text-gray-700">Actuele totaalprijs</span>
                    <span className="text-sm font-bold text-gray-900">{formatEuroCents(grandTotalCents)}</span>
                </div>
            )}

            <div className="flex justify-between pt-2">
                <Button onClick={() => setStep(2)} className="h-auto px-8 bg-primary hover:bg-secondary-foreground text-white font-medium shadow-lg transition-all duration-300 ease-in-out" style={{ borderRadius: '1rem' }}>
                    <HugeiconsIcon icon={ArrowLeft01Icon} />
                    Back
                </Button>
                <Button
                    onClick={() => setStep(4)}
                    className="h-auto px-8 bg-primary hover:bg-secondary-foreground text-white font-medium shadow-lg transition-all duration-300 ease-in-out" style={{ borderRadius: '1rem' }}
                >
                    Continue
                    <HugeiconsIcon icon={ArrowRight01Icon} />
                </Button>
            </div>
        </div>
    );
}
