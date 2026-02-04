import { useTranslations } from 'next-intl';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BookingContactInput } from '@/lib/validation/booking';
import {
    AddonSelections,
    BOOKING_STATE_KEY,
    BookingState,
    DateRange,
    Location,
    PolicyAnswerValue,
    PolicyResponses,
    Service,
    ServiceApiResponse,
    Slot,
    STATE_EXPIRY_MS,
    Addon
} from '@/lib/types/booking';
import { normalizeAddons, normalizePolicyFields, calculatePolicyExtraPriceCents, calculateAddonExtraPriceCents } from './booking-utils';

interface BookingContextProps {
    // State
    step: 1 | 2 | 3 | 4;
    services: Service[];
    loadingServices: boolean;
    serviceId: string;
    selectedService: Service | undefined;
    locations: Location[];
    loadingLocations: boolean;
    locationId: string;
    date: string;
    monthCursor: Date;
    heatmap: Record<string, number>;
    loadingHeatmap: boolean;
    slots: Slot[];
    loadingSlots: boolean;
    selectedSlot: Slot | null;
    policyResponses: PolicyResponses;
    policyErrors: Record<string, string>;
    selectedAddons: AddonSelections;
    hasAddons: boolean;
    clientEmail: string;
    contactDefaults: Omit<BookingContactInput, 'clientEmail'>;
    contactDefaultsVersion: number;
    emailChecked: null | { exists: boolean };
    isLoggedIn: boolean;
    finalizing: boolean;
    errorMsg: string;
    policyExtraPriceCents: number;
    addonExtraPriceCents: number;
    grandTotalCents: number;
    selectedAddOnItems: Addon[];
    showDetailsForm: boolean;
    isFormValid: boolean;
    userRole: string | null;

    // Actions
    setStep: (step: 1 | 2 | 3 | 4) => void;
    setServiceId: (id: string) => void;
    setLocationId: (id: string) => void;
    setDate: (date: string) => void;
    setMonthCursor: (date: Date) => void;
    setPrevMonth: () => void;
    setNextMonth: () => void;
    setSelectedSlot: (slot: Slot | null) => void;
    updatePolicyResponse: (fieldId: string, value: PolicyAnswerValue) => void;
    toggleMultiChoiceOption: (fieldId: string, optionId: string) => void;
    clearPolicyError: (fieldId: string) => void;
    setPolicyErrors: (errors: Record<string, string>) => void;
    toggleAddonSelection: (addonId: string) => void;
    setClientEmail: (email: string) => void;
    setContactDefaults: (defaults: Omit<BookingContactInput, 'clientEmail'>) => void;
    setIsLoggedIn: (value: boolean) => void;
    setEmailChecked: (value: null | { exists: boolean }) => void;
    setFinalizing: (value: boolean) => void;
    setErrorMsg: (msg: string) => void;
    setIsFormValid: (valid: boolean) => void;
    handleStartOver: () => void;
    handleEmailChange: (value: string) => Promise<void>;
    setUserRole: (role: string | null) => void;
    setContactDefaultsVersion: (valueOrFn: number | ((prev: number) => number)) => void;

    // Helpers
    getDisplayStepNumber: (step: number) => number;
    totalSteps: number;
    currentStepNumber: number;
}

const BookingContext = createContext<BookingContextProps | undefined>(undefined);

export function useBooking() {
    const context = useContext(BookingContext);
    if (!context) {
        throw new Error('useBooking must be used within a BookingProvider');
    }
    return context;
}

const PREFETCH_MONTHS = 2;

function saveBookingState(state: Partial<BookingState>): void {
    if (typeof window === 'undefined') return;
    try {
        const serializable: Partial<BookingState> = {
            ...state,
            timestamp: Date.now(),
        };
        if (serializable.selectedSlot !== undefined && serializable.selectedSlot !== null) {
            serializable.selectedSlot = {
                shiftId: String(serializable.selectedSlot.shiftId || ''),
                staffId: String(serializable.selectedSlot.staffId || ''),
                startTime: String(serializable.selectedSlot.startTime || ''),
                endTime: String(serializable.selectedSlot.endTime || ''),
            };
        }
        localStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(serializable));
    } catch (e) {
        console.warn('Failed to save booking state:', e);
        try { clearBookingState(); } catch { }
    }
}

function loadBookingState(): Partial<BookingState> | null {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem(BOOKING_STATE_KEY);
        if (!stored || stored.trim() === '') return null;
        let state: BookingState;
        try {
            state = JSON.parse(stored) as BookingState;
        } catch {
            clearBookingState();
            return null;
        }
        if (!state || typeof state !== 'object') {
            clearBookingState();
            return null;
        }
        if (typeof state.timestamp !== 'number' || Date.now() - state.timestamp > STATE_EXPIRY_MS) {
            clearBookingState();
            return null;
        }
        return state;
    } catch (e) {
        console.warn('Failed to load booking state:', e);
        clearBookingState();
        return null;
    }
}

function clearBookingState(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(BOOKING_STATE_KEY);
    } catch { }
}

// Helpers for Heatmap logic
function toISODate(d: Date): string {
    const y = d.getFullYear();
    const m2 = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m2}-${dd}`;
}

function parseISODate(iso: string): Date {
    try {
        if (!iso || typeof iso !== 'string') return new Date();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date();
        const date = new Date(`${iso}T00:00:00`);
        if (isNaN(date.getTime())) return new Date();
        return date;
    } catch {
        return new Date();
    }
}

function buildHeatmapForRange(cache: Record<string, number>, start: Date, end: Date): Record<string, number> {
    const result: Record<string, number> = {};
    const current = new Date(start);
    const targetEnd = new Date(end);
    while (current <= targetEnd) {
        const iso = toISODate(current);
        result[iso] = cache[iso] ?? 0;
        current.setDate(current.getDate() + 1);
    }
    return result;
}

function mergeRanges(ranges: DateRange[]): DateRange[] {
    if (!ranges.length) return [];
    const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
    const merged: DateRange[] = [{ ...sorted[0] }];
    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const last = merged[merged.length - 1];
        if (current.start <= last.end) {
            if (current.end > last.end) {
                last.end = current.end;
            }
        } else {
            merged.push({ ...current });
        }
    }
    return merged;
}

function computeMissingRanges(existing: DateRange[], target: DateRange): DateRange[] {
    const missing: DateRange[] = [];
    const merged = mergeRanges(existing);
    const targetStart = parseISODate(target.start);
    const targetEnd = parseISODate(target.end);
    const dayMs = 24 * 60 * 60 * 1000;

    let cursor = new Date(targetStart);
    if (cursor > targetEnd) return missing;

    for (const range of merged) {
        const rangeStart = parseISODate(range.start);
        const rangeEnd = parseISODate(range.end);

        if (rangeEnd < cursor) continue;
        if (rangeStart > targetEnd) break;

        if (rangeStart > cursor) {
            const missingEndTime = Math.min(rangeStart.getTime() - dayMs, targetEnd.getTime());
            if (missingEndTime >= cursor.getTime()) {
                missing.push({
                    start: toISODate(cursor),
                    end: toISODate(new Date(missingEndTime)),
                });
            }
        }

        if (rangeEnd.getTime() + dayMs > cursor.getTime()) {
            cursor = new Date(rangeEnd.getTime() + dayMs);
        }

        if (cursor > targetEnd) return missing;
    }

    if (cursor <= targetEnd) {
        missing.push({
            start: toISODate(cursor),
            end: toISODate(targetEnd),
        });
    }

    return missing;
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);
    const t = useTranslations('Booking.flow');
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    // Step 1
    const [services, setServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [serviceId, setServiceId] = useState<string>('');

    // Step 2
    const [locations, setLocations] = useState<Location[]>([]);
    const [loadingLocations, setLoadingLocations] = useState(true);
    const [locationId, setLocationId] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [monthCursor, setMonthCursor] = useState<Date>(() => {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [heatmap, setHeatmap] = useState<Record<string, number>>({});
    const [loadingHeatmap, setLoadingHeatmap] = useState(false);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

    const heatmapCacheRef = useRef<Record<string, number>>({});
    const heatmapRangesRef = useRef<DateRange[]>([]);

    const [policyResponses, setPolicyResponses] = useState<PolicyResponses>({});
    const [policyErrors, setPolicyErrors] = useState<Record<string, string>>({});
    const [selectedAddons, setSelectedAddons] = useState<AddonSelections>({});

    // Step 4
    const [clientEmail, setClientEmail] = useState('');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [emailChecked, setEmailChecked] = useState<null | { exists: boolean }>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [contactDefaults, setContactDefaults] = useState<Omit<BookingContactInput, 'clientEmail'>>({
        firstName: '',
        lastName: '',
        phone: undefined,
        address: undefined,
        postalCode: undefined,
        houseNumber: undefined,
        streetName: undefined,
        city: undefined,
        birthDate: undefined,
        midwifeId: undefined,
        dueDate: undefined,
        notes: undefined,
    });
    const [contactDefaultsVersion, setContactDefaultsVersion] = useState(0);
    const [hasAutofilled, setHasAutofilled] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);

    const emailLookupCounterRef = useRef(0);
    const previousServiceIdRef = useRef<string | undefined>(undefined);
    const isRestoringRef = useRef(false);
    const savedAddonsRef = useRef<AddonSelections | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSavingRef = useRef(false);

    const selectedService = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);

    const policyExtraPriceCents = useMemo(() => {
        if (!selectedService) return 0;
        return calculatePolicyExtraPriceCents(selectedService.policyFields, policyResponses);
    }, [selectedService, policyResponses]);

    const addonExtraPriceCents = useMemo(() => {
        if (!selectedService) return 0;
        return calculateAddonExtraPriceCents(selectedService.addons, selectedAddons);
    }, [selectedService, selectedAddons]);

    const grandTotalCents = useMemo(() => {
        if (!selectedService) return 0;
        return (selectedService.price ?? 0) + policyExtraPriceCents + addonExtraPriceCents;
    }, [selectedService, policyExtraPriceCents, addonExtraPriceCents]);

    const selectedAddOnItems = useMemo(() => {
        if (!selectedService) return [];
        return selectedService.addons.filter((addon) => addon.isRequired || selectedAddons[addon.id]);
    }, [selectedService, selectedAddons]);

    const hasAddons = useMemo(() => {
        return selectedService ? selectedService.addons.length > 0 : false;
    }, [selectedService]);

    const showDetailsForm = emailChecked?.exists === false || isLoggedIn;

    // Initial Load
    useEffect(() => {
        const load = async () => {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            const [svcRes, locRes] = await Promise.all([
                fetch('/api/services').then(r => r.json()).catch(() => ({ data: [] })),
                fetch('/api/locations-simple').then(r => r.json()).catch(() => ({ data: [] })),
            ]);

            const svcData = Array.isArray(svcRes?.data) ? svcRes.data : [];
            const normalizedServices: Service[] = (svcData as ServiceApiResponse[]).map((service) => ({
                id: service.id,
                name: service.name,
                price: typeof service.price === 'number' ? Math.round(service.price * 100) : 0,
                policyFields: normalizePolicyFields(service.policy_fields),
                addons: normalizeAddons(service.addons),
            }));
            setServices(normalizedServices);
            setLoadingServices(false);

            const locData = Array.isArray(locRes?.data) ? locRes.data : [];
            setLocations(locData.map((l: Location) => ({ id: l.id, name: l.name })));
            setLoadingLocations(false);

            // Auto-login check
            if (session?.user?.email) {
                const userEmail = session.user.email;
                setClientEmail(userEmail);
                setIsLoggedIn(true);
                setEmailChecked({ exists: true });

                try {
                    const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(userEmail)}`);
                    const payload = await response.json();
                    const user = payload?.user;
                    if (user) {
                        setUserRole(user.role || null);
                        setContactDefaults((prev) => {
                            if (user.role === 'midwife') return prev;
                            if (prev.firstName || prev.lastName) return prev;
                            return {
                                firstName: user.first_name || '',
                                lastName: user.last_name || '',
                                phone: user.phone || undefined,
                                address: user.address || undefined,
                                postalCode: user.postal_code || undefined,
                                houseNumber: user.house_number || undefined,
                                streetName: user.street_name || undefined,
                                city: user.city || undefined,
                                birthDate: user.birth_date || undefined,
                                midwifeId: user.midwife_id || undefined,
                                dueDate: prev.dueDate,
                                notes: prev.notes,
                            };
                        });
                        setContactDefaultsVersion(v => v + 1);
                        setHasAutofilled(true);
                    }
                } catch { }
            }
        };
        load();
    }, []);

    // Persistence Restore
    useEffect(() => {
        setIsMounted(true);
        const savedState = loadBookingState();
        if (savedState) {
            isRestoringRef.current = true;
            if (savedState.serviceId) previousServiceIdRef.current = savedState.serviceId;
            if (savedState.selectedAddons) savedAddonsRef.current = savedState.selectedAddons;

            if (savedState.step) setStep(savedState.step);
            if (savedState.serviceId) setServiceId(savedState.serviceId);
            if (savedState.locationId) setLocationId(savedState.locationId);
            if (savedState.date) setDate(savedState.date);
            if (savedState.monthCursor) setMonthCursor(new Date(savedState.monthCursor));
            if (savedState.selectedSlot) setSelectedSlot(savedState.selectedSlot);

            if (savedState.policyResponses && Object.keys(savedState.policyResponses).length > 0) {
                setTimeout(() => setPolicyResponses(savedState.policyResponses!), 0);
            }

            if (savedState.clientEmail) setClientEmail(savedState.clientEmail);
            if (savedState.contactDefaults) setContactDefaults(savedState.contactDefaults);
            if (savedState.emailChecked !== undefined) setEmailChecked(savedState.emailChecked);
            if (savedState.isLoggedIn !== undefined) setIsLoggedIn(savedState.isLoggedIn);

            // Simplified User Prefetch here if needed... (skipping for brevity as main login check handles most)

            setTimeout(() => { isRestoringRef.current = false; }, 100);
        }
    }, []);

    // Save State
    useEffect(() => {
        if (!isMounted || isRestoringRef.current) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            if (isRestoringRef.current || isSavingRef.current) return;
            isSavingRef.current = true;
            try {
                saveBookingState({
                    step,
                    serviceId,
                    locationId,
                    date,
                    selectedSlot,
                    policyResponses,
                    selectedAddons,
                    clientEmail,
                    contactDefaults,
                    emailChecked,
                    isLoggedIn,
                    monthCursor: monthCursor.toISOString(),
                });
            } catch (error) {
                console.error('Error saving booking state:', error);
            } finally {
                isSavingRef.current = false;
            }
        }, 500);
        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [isMounted, step, serviceId, locationId, date, selectedSlot, policyResponses, selectedAddons, clientEmail, contactDefaults, emailChecked, isLoggedIn, monthCursor]);

    // Slots
    useEffect(() => {
        if (serviceId && locationId && date) {
            setLoadingSlots(true);
            const params = new URLSearchParams({ serviceId, locationId, date });
            fetch(`/api/availability?${params.toString()}`)
                .then(r => r.json())
                .then(d => {
                    const s: Slot[] = (d.slots ?? []).map((x: Slot) => ({
                        shiftId: x.shiftId,
                        staffId: x.staffId,
                        startTime: new Date(x.startTime).toISOString(),
                        endTime: new Date(x.endTime).toISOString(),
                    }));
                    setSlots(s);
                })
                .catch(() => setSlots([]))
                .finally(() => setLoadingSlots(false));
        } else {
            setSlots([]);
        }
    }, [serviceId, locationId, date]);

    // Heatmap
    useEffect(() => {
        heatmapCacheRef.current = {};
        heatmapRangesRef.current = [];
        setHeatmap({});
    }, [serviceId, locationId]);

    useEffect(() => {
        if (!serviceId || !locationId) return;
        const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
        const last = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
        const startOffset = first.getDay();
        const endOffset = 6 - last.getDay();
        const gridStart = new Date(first);
        gridStart.setDate(first.getDate() - startOffset);
        const gridEnd = new Date(last);
        gridEnd.setDate(last.getDate() + endOffset);

        const applyCachedHeatmap = () => {
            setHeatmap(buildHeatmapForRange(heatmapCacheRef.current, gridStart, gridEnd));
        };

        const extendedEnd = new Date(gridEnd);
        extendedEnd.setHours(0, 0, 0, 0);
        extendedEnd.setMonth(extendedEnd.getMonth() + PREFETCH_MONTHS);
        extendedEnd.setDate(new Date(extendedEnd.getFullYear(), extendedEnd.getMonth() + 1, 0).getDate());

        const desiredRange: DateRange = {
            start: toISODate(gridStart),
            end: toISODate(extendedEnd),
        };

        const missingRanges = computeMissingRanges(heatmapRangesRef.current, desiredRange);

        if (missingRanges.length === 0) {
            applyCachedHeatmap();
            return;
        }

        let cancelled = false;
        setLoadingHeatmap(true);
        (async () => {
            for (const range of missingRanges) {
                if (cancelled) break;
                const params = new URLSearchParams({
                    serviceId,
                    locationId,
                    start: range.start,
                    end: range.end,
                });
                try {
                    const response = await fetch(`/api/availability/heatmap?${params.toString()}`);
                    const payload = await response.json();
                    if (cancelled) break;
                    const map: Record<string, number> = {};
                    for (const day of payload.days ?? []) {
                        if (day?.date) {
                            map[day.date] = typeof day.availableSlots === 'number' ? day.availableSlots : 0;
                        }
                    }
                    heatmapCacheRef.current = { ...heatmapCacheRef.current, ...map };
                    heatmapRangesRef.current = mergeRanges([...heatmapRangesRef.current, range]);
                } catch { }
            }
            if (!cancelled) applyCachedHeatmap();
        })().finally(() => {
            if (!cancelled) setLoadingHeatmap(false);
        });

        return () => { cancelled = true; };
    }, [serviceId, locationId, monthCursor]);

    // Policy Reset
    useEffect(() => {
        if (previousServiceIdRef.current !== undefined && previousServiceIdRef.current !== serviceId) {
            setPolicyResponses({});
            setPolicyErrors({});
        }
        previousServiceIdRef.current = serviceId;
    }, [serviceId]);

    // Addons Reset/Restore
    useEffect(() => {
        if (!selectedService) {
            setSelectedAddons({});
            return;
        }
        if (savedAddonsRef.current) {
            const savedAddons = savedAddonsRef.current;
            const next: AddonSelections = {};
            selectedService.addons.forEach((addon) => {
                // Fix: Check if addon is required, IF so it MUST be true.
                // IF not required, use saved value.
                if (addon.isRequired) {
                    next[addon.id] = true;
                } else {
                    next[addon.id] = Boolean(savedAddons[addon.id]);
                }
            });
            setSelectedAddons(next);
            savedAddonsRef.current = null;
        } else {
            setSelectedAddons((prev) => {
                const next: AddonSelections = {};
                selectedService.addons.forEach((addon) => {
                    if (addon.isRequired) {
                        next[addon.id] = true;
                    } else {
                        next[addon.id] = Boolean(prev[addon.id]);
                    }
                });
                return next;
            });
        }
    }, [selectedService]);

    // Step Adjustment
    useEffect(() => {
        if (step === 3 && !hasAddons) {
            setStep(4);
        }
    }, [step, hasAddons]);

    // Autofill Step 4
    useEffect(() => {
        if (step === 4 && !hasAutofilled) {
            const checkAndAutofill = async () => {
                let emailToUse = clientEmail;
                let shouldAutofill = isLoggedIn;
                if (!emailToUse || !shouldAutofill) {
                    try {
                        const { createClient } = await import('@/lib/supabase/client');
                        const supabase = createClient();
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.user?.email) {
                            emailToUse = session.user.email;
                            shouldAutofill = true;
                            if (!isLoggedIn) {
                                setIsLoggedIn(true);
                                setClientEmail(emailToUse);
                                setEmailChecked({ exists: true });
                            }
                        }
                    } catch { }
                }

                if (shouldAutofill && emailToUse) {
                    try {
                        const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(emailToUse)}`);
                        const payload = await response.json();
                        const user = payload?.user;
                        if (user) {
                            setUserRole(user.role || null);
                            if (user.role === 'midwife') {
                                setContactDefaultsVersion(v => v + 1);
                                setHasAutofilled(true);
                                return;
                            }
                            setContactDefaults({
                                firstName: user.first_name || '',
                                lastName: user.last_name || '',
                                phone: user.phone || undefined,
                                address: user.address || undefined,
                                postalCode: user.postal_code || undefined,
                                houseNumber: user.house_number || undefined,
                                streetName: user.street_name || undefined,
                                city: user.city || undefined,
                                birthDate: user.birth_date || undefined,
                                midwifeId: user.midwife_id || undefined,
                                dueDate: contactDefaults.dueDate,
                                notes: contactDefaults.notes,
                            });
                            setContactDefaultsVersion(v => v + 1);
                            setHasAutofilled(true);
                        }
                    } catch { }
                }
            };
            checkAndAutofill();
        }
    }, [step, isLoggedIn, clientEmail, hasAutofilled]);

    // Actions
    const updatePolicyResponse = (fieldId: string, value: PolicyAnswerValue) => {
        setPolicyResponses(prev => ({ ...prev, [fieldId]: value }));
        clearPolicyError(fieldId);
    };

    const toggleMultiChoiceOption = (fieldId: string, optionId: string) => {
        setPolicyResponses(prev => {
            const current = Array.isArray(prev[fieldId]) ? (prev[fieldId] as string[]) : [];
            const next = current.includes(optionId) ? current.filter(id => id !== optionId) : [...current, optionId];
            return { ...prev, [fieldId]: next };
        });
        clearPolicyError(fieldId);
    };

    const clearPolicyError = (fieldId: string) => {
        setPolicyErrors(prev => {
            if (!prev[fieldId]) return prev;
            const next = { ...prev };
            delete next[fieldId];
            return next;
        });
    };

    const toggleAddonSelection = (addonId: string) => {
        if (!selectedService) return;
        const target = selectedService.addons.find(a => a.id === addonId);
        if (!target || target.isRequired) return;
        setSelectedAddons(prev => ({ ...prev, [addonId]: !prev[addonId] }));
    };

    const handleStartOver = async () => {
        try {
            await fetch(`/api/bookings/lock?sessionToken=${sessionTokenRef.current}`, {
                method: 'DELETE',
            });
        } catch (e) {
            console.error('Failed to release lock', e);
        }
        clearBookingState();
        window.location.reload();
    };

    const handleEmailChange = async (value: string) => {
        setClientEmail(value);
        setEmailChecked(null);
        setIsLoggedIn(false);
        setUserRole(null);
        setErrorMsg('');

        // Helper to clear
        const clear = () => {
            setContactDefaults({
                firstName: '', lastName: '', phone: undefined, address: undefined,
                postalCode: undefined, houseNumber: undefined, streetName: undefined,
                city: undefined, birthDate: undefined, midwifeId: undefined,
                dueDate: undefined, notes: undefined
            });
            setContactDefaultsVersion(v => v + 1);
            setHasAutofilled(false);
        };

        if (hasAutofilled) clear();
        if (!value || !value.includes('@')) {
            if (value === '') clear();
            return;
        }

        const lookupId = ++emailLookupCounterRef.current;
        try {
            const res = await fetch('/api/auth/email-exists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: value }),
            });
            const data = await res.json();
            if (lookupId !== emailLookupCounterRef.current) return;
            const exists = !!data.exists;
            setEmailChecked({ exists });

            if (exists) {
                try {
                    const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(value)}`);
                    const payload = await response.json();
                    if (lookupId !== emailLookupCounterRef.current) return;
                    const user = payload?.user;
                    if (user) {
                        setUserRole(user.role || null);
                        if (user.role === 'midwife') {
                            setContactDefaultsVersion(v => v + 1);
                            setHasAutofilled(true);
                            return;
                        }
                        setContactDefaults({
                            firstName: user.first_name || '',
                            lastName: user.last_name || '',
                            phone: user.phone || undefined,
                            address: user.address || undefined,
                            postalCode: user.postal_code || undefined,
                            houseNumber: user.house_number || undefined,
                            streetName: user.street_name || undefined,
                            city: user.city || undefined,
                            birthDate: user.birth_date || undefined,
                            midwifeId: user.midwife_id || undefined,
                        });
                        setContactDefaultsVersion(v => v + 1);
                        setHasAutofilled(true);
                    } else {
                        clear();
                    }
                } catch {
                    if (lookupId === emailLookupCounterRef.current) clear();
                }
            } else {
                clear();
            }
        } catch {
            if (lookupId === emailLookupCounterRef.current) {
                setEmailChecked(null);
                clear();
            }
        }
    };

    // Session Token
    const sessionTokenRef = useRef<string>('');
    useEffect(() => {
        let token = sessionStorage.getItem('booking_session_token');
        if (!token) {
            token = crypto.randomUUID();
            sessionStorage.setItem('booking_session_token', token);
        }
        sessionTokenRef.current = token;
    }, []);

    const handleSelectSlot = async (slot: Slot | null) => {
        if (!slot) {
            setSelectedSlot(null);
            return;
        }
        if (loadingSlots) return;

        // Optimistic UI: Select immediately, revert if lock fails
        setSelectedSlot(slot);
        setErrorMsg('');

        try {
            const res = await fetch('/api/bookings/lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceId: serviceId,
                    locationId: locationId,
                    staffId: slot.staffId,
                    shiftId: slot.shiftId,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    sessionToken: sessionTokenRef.current,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Lock failed - Revert selection
                setSelectedSlot(null);

                // Refresh slots to show it's gone
                const params = new URLSearchParams({ serviceId, locationId, date, _t: Date.now().toString() });
                fetch(`/api/availability?${params.toString()}`, { headers: { 'Cache-Control': 'no-cache' } })
                    .then(r => r.json())
                    .then(d => {
                        const s: Slot[] = (d.slots ?? []).map((x: Slot) => ({
                            shiftId: x.shiftId,
                            staffId: x.staffId,
                            startTime: new Date(x.startTime).toISOString(),
                            endTime: new Date(x.endTime).toISOString(),
                        }));
                        setSlots(s);
                    });

                let msg = t('errors.slotNotAvailable');
                if (data.error === 'SLOT_BOOKED') msg = t('errors.slotBooked');
                if (data.error === 'SLOT_LOCKED') msg = t('errors.slotNotAvailable');
                setErrorMsg(msg);
                // Clear error after 3s
                setTimeout(() => setErrorMsg(''), 3000);
                return;
            }

            // Success - Keep selection
        } catch (e) {
            console.error('Lock error', e);
            setSelectedSlot(null); // Revert on error
            setErrorMsg('Failed to select slot');
        }
    };

    const getDisplayStepNumber = (internalStep: number): number => {
        if (!hasAddons && internalStep === 4) return 3;
        return internalStep;
    };

    const totalSteps = hasAddons ? 4 : 3;
    const currentStepNumber = getDisplayStepNumber(step);

    return (
        <BookingContext.Provider
            value={{
                step, setStep,
                services, loadingServices, serviceId, setServiceId, selectedService,
                locations, loadingLocations, locationId, setLocationId,
                date, setDate,
                monthCursor, setMonthCursor,
                setPrevMonth: () => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1)),
                setNextMonth: () => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)),
                heatmap, loadingHeatmap,
                slots, loadingSlots, selectedSlot, setSelectedSlot: handleSelectSlot,
                policyResponses, policyErrors, updatePolicyResponse, toggleMultiChoiceOption, clearPolicyError, setPolicyErrors,
                selectedAddons, toggleAddonSelection, hasAddons, selectedAddOnItems,
                clientEmail, setClientEmail,
                userRole, setUserRole,
                contactDefaults, setContactDefaults, contactDefaultsVersion, setContactDefaultsVersion,
                emailChecked, setEmailChecked,
                isLoggedIn, setIsLoggedIn,
                finalizing, setFinalizing,
                errorMsg, setErrorMsg,
                policyExtraPriceCents, addonExtraPriceCents, grandTotalCents,
                showDetailsForm, isFormValid, setIsFormValid,
                handleStartOver, handleEmailChange,
                getDisplayStepNumber, totalSteps, currentStepNumber
            }}
        >
            {children}
            {errorMsg && (
                <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 animate-in fade-in slide-in-from-bottom-4">
                    <p className="font-bold">Error</p>
                    <p>{errorMsg}</p>
                </div>
            )}
        </BookingContext.Provider>
    );
}
