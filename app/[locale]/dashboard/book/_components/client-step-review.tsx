'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/app/[locale]/(public)/booking/_components/booking-context';
import { HugeiconsIcon } from '@hugeicons/react';
import { CircleArrowLeft02Icon, CircleArrowRight02Icon } from '@hugeicons/core-free-icons';
import { useRouter } from 'next/navigation';
import { formatEuroCents } from '@/lib/currency/format';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { CheckoutForm } from '@/app/[locale]/(public)/booking/_components/checkout-form';
import { BookingContactInput } from '@/lib/validation/booking';
import { buildAddonPayload, buildPolicyAnswerPayload } from '@/app/[locale]/(public)/booking/_components/booking-utils';

export function ClientStepReview() {
    const router = useRouter();
    const [showForm, setShowForm] = useState(false);
    const {
        selectedService,
        selectedSlot,
        grandTotalCents,
        hasAddons,
        finalizing,
        setErrorMsg,
        setFinalizing,
        isLoggedIn,
        setStep,
        policyResponses,
        selectedAddons,
        serviceId,
        locationId,
        errorMsg,
        clientEmail,
        contactDefaults,
        contactDefaultsVersion,
        emailChecked,
        userRole,
    } = useBooking();

    const t = useTranslations('Booking.flow');

    const handleBookingSubmit = async (values?: BookingContactInput) => {
        try {
            setErrorMsg('');
            if (!selectedService || !selectedSlot || !locationId) {
                throw new Error(t('review.errors.incompleteSelection'));
            }
            // Ensure we have the basic contact info from defaults since we skipped the form.
            // In a real scenario, the backend might pull this from the user ID, but our API expects fields.
            // We'll use the pre-filled contact defaults which should be populated for logged-in users.

            if (!isLoggedIn) {
                // Should not happen in client dashboard, but safe guard
                throw new Error(t('review.errors.loginRequired'));
            }

            setFinalizing(true);

            const priceCents = grandTotalCents;
            const policyAnswersPayload = selectedService
                ? buildPolicyAnswerPayload(selectedService.policyFields, policyResponses)
                : [];
            const addOnPayload = selectedService
                ? buildAddonPayload(selectedService.addons, selectedAddons)
                : [];

            let headers: Record<string, string> = { 'Content-Type': 'application/json' };

            // Attach session token
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const payloadValues = values || {
                clientEmail: clientEmail,
                firstName: contactDefaults.firstName,
                lastName: contactDefaults.lastName,
                phone: contactDefaults.phone,
                address: contactDefaults.address,
                dueDate: contactDefaults.dueDate,
                birthDate: contactDefaults.birthDate,
                midwifeId: contactDefaults.midwifeId,
                houseNumber: contactDefaults.houseNumber,
                postalCode: contactDefaults.postalCode,
                streetName: contactDefaults.streetName,
                city: contactDefaults.city,
                notes: contactDefaults.notes,
            };

            const resp = await fetch('/api/bookings', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    // For client dashboard, we rely on the backend to link to the user,
                    // but the API validation might still require these fields.
                    // We use the defaults that were loaded into context.
                    clientEmail: payloadValues.clientEmail,
                    firstName: payloadValues.firstName,
                    lastName: payloadValues.lastName,
                    phone: payloadValues.phone,
                    address: payloadValues.address,
                    dueDate: payloadValues.dueDate || undefined,
                    birthDate: payloadValues.birthDate || undefined,
                    midwifeId: payloadValues.midwifeId || undefined,
                    houseNumber: payloadValues.houseNumber || undefined,
                    postalCode: payloadValues.postalCode || undefined,
                    streetName: payloadValues.streetName || undefined,
                    city: payloadValues.city || undefined,
                    notes: payloadValues.notes || undefined,
                    serviceId,
                    locationId,
                    staffId: selectedSlot.staffId,
                    shiftId: selectedSlot.shiftId,
                    startTime: selectedSlot.startTime,
                    endTime: selectedSlot.endTime,
                    priceEurCents: priceCents,
                    policyAnswers: policyAnswersPayload.length > 0 ? policyAnswersPayload : undefined,
                    addons: addOnPayload.length > 0 ? addOnPayload : undefined,
                }),
            });

            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data.error || t('review.errors.bookingFailed'));
            }

            // Clear state
            try { localStorage.removeItem('goudecho_booking_state'); } catch { }

            // Start payment flow if checkout link exists
            if (data.checkoutUrl) {
                // Clear state before leaving
                try { localStorage.removeItem('goudecho_booking_state'); } catch { }
                window.location.href = data.checkoutUrl;
                return;
            }

            // Redirect to success / my appointments
            router.push(`/booking/confirmation?bookingId=${data.booking.id}`);

        } catch (e: any) {
            setErrorMsg(e?.message || t('review.errors.bookingFailed'));
        } finally {
            setFinalizing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900">{t('review.title')}</h2>
                <p className="text-sm text-gray-600">{t('review.subtitle')}</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-900">{t('summary')}</h3>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="edit-details" className="text-xs text-gray-500 font-medium">Edit Details</Label>
                        <Switch
                            id="edit-details"
                            checked={showForm}
                            onCheckedChange={setShowForm}
                        />
                    </div>
                </div>

                {!showForm ? (
                    <>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{t('service')}</span>
                            <span className="font-medium">{selectedService?.name}</span>
                        </div>

                        {selectedSlot && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{t('dateTime')}</span>
                                <span className="font-medium">
                                    {new Date(selectedSlot.startTime).toLocaleString()}
                                </span>
                            </div>
                        )}

                        <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                            <span className="font-bold text-gray-900">{t('totalDue')}</span>
                            <span className="text-xl font-bold text-primary">
                                {formatEuroCents(grandTotalCents)}
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="pt-2">
                            <CheckoutForm
                                currentEmail={clientEmail}
                                contactDefaults={contactDefaults}
                                contactDefaultsVersion={contactDefaultsVersion}
                                emailChecked={emailChecked}
                                password={""} // Not needed for logged in
                                isLoggedIn={isLoggedIn}
                                userRole={userRole}
                                onEmailChange={() => { }} // Read only
                                onPasswordChange={() => { }} // Not needed
                                onLogin={() => { }} // Not needed
                                onLogout={() => { }} // Not needed
                                onSubmit={handleBookingSubmit}
                                finalizing={finalizing}
                            />
                        </div>
                    </div>
                )}
            </div>

            {errorMsg && (
                <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-100">
                    {errorMsg}
                </div>
            )}

            <div className="flex justify-between pt-2">
                <Button
                    onClick={() => setStep(hasAddons ? 3 : 2)}
                    variant="outline"
                    className="h-auto px-8 rounded-2xl"
                >
                    <HugeiconsIcon icon={CircleArrowLeft02Icon} className="mr-2 h-5 w-5" />
                    {t('back')}
                </Button>

                <Button
                    onClick={() => {
                        if (!showForm) {
                            handleBookingSubmit();
                        }
                    }}
                    type={showForm ? "submit" : "button"}
                    form={showForm ? "checkout-form" : undefined}
                    disabled={finalizing}
                    className="h-auto px-8 bg-primary text-white hover:bg-primary/90 rounded-2xl shadow-lg hover:shadow-xl transition-all"
                >
                    {finalizing ? t('review.processing') : t('review.confirmBooking')}
                    <HugeiconsIcon icon={CircleArrowRight02Icon} className="ml-2 h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
