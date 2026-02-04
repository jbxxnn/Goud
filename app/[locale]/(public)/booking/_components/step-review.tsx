'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useBooking } from './booking-context';
import { CheckoutForm } from './checkout-form';
import { BookingContactInput } from '@/lib/validation/booking';
import { buildAddonPayload, buildPolicyAnswerPayload } from './booking-utils';
import { HugeiconsIcon } from '@hugeicons/react';
import { CircleArrowLeft02Icon, CircleArrowRight02Icon } from '@hugeicons/core-free-icons';

export function StepReview() {
    const router = useRouter();
    const {
        selectedService, selectedSlot,
        grandTotalCents,
        clientEmail, contactDefaults, contactDefaultsVersion, emailChecked,
        isLoggedIn, hasAddons, showDetailsForm, finalizing, errorMsg, isFormValid, setIsFormValid,
        handleEmailChange, setClientEmail, setIsLoggedIn, setErrorMsg, setFinalizing,
        setStep, policyResponses, selectedAddons, serviceId, locationId, userRole,
        setEmailChecked, setUserRole, setContactDefaults, setContactDefaultsVersion,
    } = useBooking();

    const t = useTranslations('Booking.flow');

    // We handle local password state for login here as it is transient UI state
    const [password, setPassword] = 'useState' in require('react') ? require('react').useState('') : ['', ''];

    const handleLogin = async (emailForLogin: string) => {
        setErrorMsg('');
        if (!emailForLogin) { setErrorMsg(t('review.errors.emailRequired')); return; }
        if (!password) { setErrorMsg(t('review.errors.passwordRequired')); return; }

        setFinalizing(true);
        try {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
                email: emailForLogin,
                password,
            });
            if (loginErr) throw new Error(loginErr.message || t('review.errors.loginFailed'));
            if (!loginData?.session) throw new Error(t('review.errors.loginSessionFailed'));

            setIsLoggedIn(true);
            setPassword('');
            setErrorMsg('');

            try {
                const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(emailForLogin)}`);
                const payload = await response.json();
                // We could fetch user details here if needed
            } catch (e) {
                console.error('Error fetching user details after login:', e);
            }
        } catch (e: any) {
            setErrorMsg(e?.message || t('review.errors.loginFailed'));
        } finally {
            setFinalizing(false);
        }
    };


    const handleLogout = async () => {
        try {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            await supabase.auth.signOut();
        } catch (e) {
            console.error('Logout error:', e);
        } finally {
            setIsLoggedIn(false);
            setClientEmail('');
            setEmailChecked(null);
            setUserRole(null);
            setPassword('');
            setContactDefaults({
                firstName: '', lastName: '', phone: undefined, address: undefined,
                postalCode: undefined, houseNumber: undefined, streetName: undefined,
                city: undefined, birthDate: undefined, midwifeId: undefined,
                dueDate: undefined, notes: undefined
            });
            setContactDefaultsVersion(v => v + 1);
        }
    };

    const handleBookingSubmit = async (values: BookingContactInput) => {
        try {
            setErrorMsg('');
            if (!selectedService || !selectedSlot || !locationId) {
                throw new Error(t('review.errors.incompleteSelection'));
            }
            if (emailChecked?.exists === true && !isLoggedIn) {
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

            // Attach session token if logged in
            if (isLoggedIn) {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }
            }

            const resp = await fetch('/api/bookings', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    midwifeClientEmail: values.midwifeClientEmail || undefined,
                    clientEmail: values.clientEmail,
                    firstName: values.firstName,
                    lastName: values.lastName,
                    phone: values.phone,
                    address: values.address,
                    dueDate: values.dueDate || undefined,
                    birthDate: values.birthDate || undefined,
                    midwifeId: values.midwifeId || undefined,
                    houseNumber: values.houseNumber || undefined,
                    postalCode: values.postalCode || undefined,
                    streetName: values.streetName || undefined,
                    city: values.city || undefined,
                    notes: values.notes || undefined,
                    serviceId,
                    locationId,
                    staffId: selectedSlot.staffId,
                    shiftId: selectedSlot.shiftId,
                    startTime: selectedSlot.startTime,
                    endTime: selectedSlot.endTime,
                    priceEurCents: priceCents,
                    policyAnswers: policyAnswersPayload.length > 0 ? policyAnswersPayload : undefined,
                    addons: addOnPayload.length > 0 ? addOnPayload : undefined,
                    sessionToken: sessionStorage.getItem('booking_session_token') || undefined,
                }),
            });

            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data.error || t('review.errors.bookingFailed'));
            }

            // Refresh session if needed
            if (emailChecked?.exists === true && isLoggedIn) {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                await supabase.auth.getSession();
            }

            // Magic link for new users
            if (emailChecked?.exists === false) {
                try {
                    const { createClient } = await import('@/lib/supabase/client');
                    const supabase = createClient();
                    await supabase.auth.signInWithOtp({
                        email: values.clientEmail,
                        options: {
                            emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
                        },
                    });
                } catch { }
            }

            // Start payment flow if checkout link exists
            if (data.checkoutUrl) {
                // Clear state before leaving
                try { localStorage.removeItem('goudecho_booking_state'); } catch { }
                window.location.href = data.checkoutUrl;
                return;
            }

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
                <h2 className="text-sm font-bold text-gray-900">{t('review.title')}</h2>
                <p className="text-xs text-gray-600">{t('review.subtitle')}</p>
            </div>

            <CheckoutForm
                currentEmail={clientEmail}
                contactDefaults={contactDefaults}
                contactDefaultsVersion={contactDefaultsVersion}
                emailChecked={emailChecked}
                password={password}
                isLoggedIn={isLoggedIn}
                userRole={userRole}
                onEmailChange={handleEmailChange}
                onPasswordChange={setPassword}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onSubmit={handleBookingSubmit}
                finalizing={finalizing}
                onValidationChange={setIsFormValid}
            />
            {errorMsg && (
                <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-100">
                    {errorMsg}
                </div>
            )}

            <div className="flex justify-between pt-2">
                <Button
                    onClick={() => setStep(hasAddons ? 3 : 2)}
                    className="h-auto px-8 bg-primary shadow-lg hover:bg-secondary-foreground text-white font-medium hover:shadow-lg transition-all duration-300 ease-in-out" style={{ borderRadius: '1rem' }}
                >
                    <HugeiconsIcon icon={CircleArrowLeft02Icon} />
                    {t('back')}
                </Button>
                {showDetailsForm && (
                    <Button
                        type="submit"
                        form="checkout-form"
                        disabled={finalizing || !isFormValid}
                        className="h-auto px-8 bg-primary shadow-lg hover:bg-secondary-foreground text-white font-medium hover:shadow-lg transition-all duration-300 ease-in-out" style={{ borderRadius: '1rem' }}
                    >
                        {finalizing ? t('review.processing') : t('review.completeBooking')}
                        <HugeiconsIcon icon={CircleArrowRight02Icon} />
                    </Button>
                )}
            </div>
        </div>
    );
}
