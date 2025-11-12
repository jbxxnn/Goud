'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatEuroCents } from '@/lib/currency/format';
import { Button } from '@/components/ui/button';
import { bookingContactSchema, BookingContactInput, BookingPolicyAnswer, BookingAddonSelection } from '@/lib/validation/booking';
import { ServiceAddon, ServicePolicyField, ServicePolicyFieldChoice } from '@/lib/types/service';
// Using custom inline calendar below for finer heatmap control

type PolicyField = ServicePolicyField & {
  choices: ServicePolicyFieldChoice[];
  order: number;
};

type Addon = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  isRequired: boolean;
};

type Service = {
  id: string;
  name: string;
  price: number;
  policyFields: PolicyField[];
  addons: Addon[];
};
type Location = { id: string; name: string };
type Slot = { shiftId: string; staffId: string; startTime: string; endTime: string };
type PolicyAnswerValue = string | number | boolean | string[] | null;
type PolicyResponses = Record<string, PolicyAnswerValue>;
type AddonSelections = Record<string, boolean>;
type RawPolicyField = ServicePolicyField & {
  order?: number | null;
  field_order?: number | null;
  service_policy_field_choices?: ServicePolicyFieldChoice[];
};

type ServiceApiResponse = {
  id: string;
  name: string;
  price: number;
  policy_fields?: RawPolicyField[] | null;
  addons?: ServiceAddon[] | null;
};
type DateRange = { start: string; end: string };
const PREFETCH_MONTHS = 2;

export default function BookingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string>('');

  // Step 2
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string>('');
  const [date, setDate] = useState<string>(''); // YYYY-MM-DD
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0,0,0,0);
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

  // Check if service has addons to determine if we should show addons step
  const hasAddons = useMemo(() => {
    return selectedService ? selectedService.addons.length > 0 : false;
  }, [selectedService]);

  // Calculate the actual step number for display (adjusts if no addons)
  const getDisplayStepNumber = (internalStep: number): number => {
    if (!hasAddons && internalStep === 4) {
      // If no addons, step 4 (review) should display as step 3
      return 3;
    }
    return internalStep;
  };

  // Step 4 summary
  const [clientEmail, setClientEmail] = useState('');
  const [emailChecked, setEmailChecked] = useState<null | { exists: boolean }>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [contactDefaults, setContactDefaults] = useState<Omit<BookingContactInput, 'clientEmail'>>({
    firstName: '',
    lastName: '',
    phone: undefined,
    address: undefined,
  });
  const [contactDefaultsVersion, setContactDefaultsVersion] = useState(0);
  const [hasAutofilled, setHasAutofilled] = useState(false);
  const emailLookupCounterRef = useRef(0);

  useEffect(() => {
    // Load basic data for step 1 and 2
    const load = async () => {
      const [svcRes, locRes] = await Promise.all([
        fetch('/api/services').then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/locations-simple').then(r => r.json()).catch(() => ({ data: [] })),
      ]);
      const svcData = Array.isArray(svcRes?.data) ? svcRes.data : [];
      const normalizedServices: Service[] = (svcData as ServiceApiResponse[]).map((service) => ({
        id: service.id,
        name: service.name,
        // Services API returns price in euros; convert to cents for formatter
        price: typeof service.price === 'number' ? Math.round(service.price * 100) : 0,
        policyFields: normalizePolicyFields(service.policy_fields),
        addons: normalizeAddons(service.addons),
      }));
      setServices(normalizedServices);
      const locData = Array.isArray(locRes?.data) ? locRes.data : [];
      setLocations(locData.map((l: Location) => ({ id: l.id, name: l.name })));
    };
    load();
  }, []);

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

  useEffect(() => {
    setPolicyResponses({});
    setPolicyErrors({});
  }, [serviceId]);

  // Safety check: if we're on step 3 but service has no addons, skip to step 4
  useEffect(() => {
    if (step === 3 && !hasAddons) {
      setStep(4);
    }
  }, [step, hasAddons]);

  useEffect(() => {
    if (!selectedService) {
      setSelectedAddons({});
      return;
    }
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
  }, [selectedService]);

  useEffect(() => {
    heatmapCacheRef.current = {};
    heatmapRangesRef.current = [];
    setHeatmap({});
  }, [serviceId, locationId]);

  // Load day heatmap for calendar covering the full 6x7 grid (includes prev/next month spillover)
  useEffect(() => {
    if (!serviceId || !locationId) return;
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const last = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
    const startOffset = first.getDay(); // 0=Sun
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
          heatmapCacheRef.current = {
            ...heatmapCacheRef.current,
            ...map,
          };
          heatmapRangesRef.current = mergeRanges([
            ...heatmapRangesRef.current,
            range,
          ]);
        } catch {
          if (cancelled) break;
          // Keep existing cache; retry will happen on next navigation
        }
      }
      if (!cancelled) {
        applyCachedHeatmap();
      }
    })().finally(() => {
      if (!cancelled) {
        setLoadingHeatmap(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [serviceId, locationId, monthCursor]);

  const handleEmailChange = async (value: string) => {
    setClientEmail(value);
    setEmailChecked(null);
    setIsLoggedIn(false);
    setPassword('');
    setErrorMsg('');

    const clearContactDefaults = () => {
      setContactDefaults({
        firstName: '',
        lastName: '',
        phone: undefined,
        address: undefined,
      });
      setContactDefaultsVersion((prev) => prev + 1);
      setHasAutofilled(false);
    };

    if (hasAutofilled) {
      clearContactDefaults();
    }

    if (!value || !value.includes('@')) {
      if (value === '') {
        clearContactDefaults();
      }
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
            setContactDefaults({
              firstName: user.first_name || '',
              lastName: user.last_name || '',
              phone: user.phone || undefined,
              address: user.address || undefined,
            });
            setContactDefaultsVersion((prev) => prev + 1);
            setHasAutofilled(true);
          } else {
            clearContactDefaults();
          }
        } catch {
          if (lookupId !== emailLookupCounterRef.current) return;
          clearContactDefaults();
        }
      } else {
        clearContactDefaults();
      }
    } catch {
      if (lookupId !== emailLookupCounterRef.current) return;
      setEmailChecked(null);
      clearContactDefaults();
    }
  };

  const handleLogin = async (emailForLogin: string) => {
    setErrorMsg('');
    if (!emailForLogin) {
      setErrorMsg('E-mailadres is verplicht');
      return;
    }
    if (!password) {
      setErrorMsg('Voer uw wachtwoord in om door te gaan');
      return;
    }

    setFinalizing(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email: emailForLogin,
        password,
      });
      if (loginErr) {
        throw new Error(loginErr.message || 'Inloggen mislukt');
      }
      if (!loginData?.session) {
        throw new Error('Inloggen mislukt: geen sessie aangemaakt');
      }
      setIsLoggedIn(true);
      setPassword('');
      setErrorMsg('');
    } catch (e: unknown) {
      const message = (e as Error)?.message || 'Inloggen mislukt';
      setErrorMsg(message);
    } finally {
      setFinalizing(false);
    }
  };

  const handleBookingSubmit = async (values: BookingContactInput) => {
    try {
      setErrorMsg('');
      if (!selectedService || !selectedSlot || !locationId) {
        throw new Error('Selecteer eerst service, locatie en tijd');
      }
      if (emailChecked?.exists === true && !isLoggedIn) {
        throw new Error('Log in om door te gaan');
      }

      setFinalizing(true);

      const priceCents = grandTotalCents;
      const policyAnswersPayload = selectedService
        ? buildPolicyAnswerPayload(selectedService.policyFields, policyResponses)
        : [];
      const addOnPayload = selectedService
        ? buildAddonPayload(selectedService.addons, selectedAddons)
        : [];
      const resp = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: values.clientEmail,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          address: values.address,
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
        throw new Error(data.error || 'Boeking is niet gelukt');
      }

      if (emailChecked?.exists === true && isLoggedIn) {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          console.warn('Session not found after booking - user may need to log in again');
        }
      }

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
        } catch {}
      }

      // Redirect to confirmation page
      router.push(`/booking/confirmation?bookingId=${data.booking.id}`);
    } catch (e: unknown) {
      setErrorMsg((e as Error)?.message || 'Boeking is niet gelukt');
    } finally {
      setFinalizing(false);
    }
  };

  const clearPolicyError = (fieldId: string) => {
    setPolicyErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const updatePolicyResponse = (fieldId: string, value: PolicyAnswerValue) => {
    setPolicyResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    clearPolicyError(fieldId);
  };

  const toggleMultiChoiceOption = (fieldId: string, optionId: string) => {
    setPolicyResponses((prev) => {
      const current = Array.isArray(prev[fieldId]) ? (prev[fieldId] as string[]) : [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return {
        ...prev,
        [fieldId]: next,
      };
    });
    clearPolicyError(fieldId);
  };

  const validatePolicyFields = (service: Service): Record<string, string> => {
    const errors: Record<string, string> = {};
    for (const field of service.policyFields) {
      if (!field.is_required) {
        continue;
      }
      const value = policyResponses[field.id];
      switch (field.field_type) {
        case 'checkbox':
          if (value !== true) {
            errors[field.id] = 'Bevestig dit beleid om door te gaan.';
          }
          break;
        case 'multi_choice':
          if (!Array.isArray(value) || value.length === 0) {
            errors[field.id] = 'Maak minstens één keuze.';
          }
          break;
        case 'number_input':
          if (typeof value !== 'number' || Number.isNaN(value)) {
            errors[field.id] = 'Voer een geldig nummer in.';
          }
          break;
        case 'date_time':
          if (typeof value !== 'string' || value.trim() === '') {
            errors[field.id] = 'Selecteer een datum en tijd.';
          }
          break;
        case 'file_upload':
          errors[field.id] = 'Uploaden via dit formulier is nog niet beschikbaar. Neem contact op.';
          break;
        case 'text_input':
        default:
          if (typeof value !== 'string' || value.trim() === '') {
            errors[field.id] = 'Dit veld is verplicht.';
          }
          break;
      }
    }
    return errors;
  };

  const handleStep1Continue = () => {
    if (!serviceId) return;
    if (selectedService) {
      const errors = validatePolicyFields(selectedService);
      if (Object.keys(errors).length > 0) {
        setPolicyErrors(errors);
        return;
      }
    }
    setPolicyErrors({});
    setStep(2);
  };

  const toggleAddonSelection = (addonId: string) => {
    if (!selectedService) return;
    const target = selectedService.addons.find((addon) => addon.id === addonId);
    if (!target || target.isRequired) return;
    setSelectedAddons((prev) => ({
      ...prev,
      [addonId]: !prev[addonId],
    }));
  };

  const renderPolicyField = (field: PolicyField) => {
    const error = policyErrors[field.id];
    const description = field.description ? (
      <p className="text-sm text-gray-500">{field.description}</p>
    ) : null;

    switch (field.field_type) {
      case 'checkbox': {
        const checked = policyResponses[field.id] === true;
        return (
          <div key={field.id} className="space-y-2">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={checked}
                onChange={(e) => updatePolicyResponse(field.id, e.target.checked)}
              />
              <span>
                <span className="font-medium">
                  {field.title}
                  {field.is_required && <span className="text-red-600 ml-1">*</span>}
                </span>
                {description}
              </span>
            </label>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        );
      }
      case 'multi_choice': {
        const selected = Array.isArray(policyResponses[field.id]) ? (policyResponses[field.id] as string[]) : [];
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {field.title}
                {field.is_required && <span className="text-red-600 ml-1">*</span>}
              </span>
            </div>
            {description}
            <div className="space-y-2">
              {field.choices.length === 0 && (
                <p className="text-sm text-gray-500">Geen opties beschikbaar.</p>
              )}
              {field.choices.map((choice) => {
                const price =
                  typeof choice.price === 'number' && !Number.isNaN(choice.price)
                    ? choice.price
                    : 0;
                return (
                  <label key={choice.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(choice.id)}
                      onChange={() => toggleMultiChoiceOption(field.id, choice.id)}
                    />
                    <span className="flex-1">{choice.title}</span>
                    {price > 0 && (
                      <span className="text-sm text-gray-600">
                        {formatEuroCents(Math.round(price * 100))}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        );
      }
      case 'number_input': {
        const value = typeof policyResponses[field.id] === 'number' && !Number.isNaN(policyResponses[field.id])
          ? (policyResponses[field.id] as number)
          : '';
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium">
              {field.title}
              {field.is_required && <span className="text-red-600 ml-1">*</span>}
            </label>
            {description}
            <input
              type="number"
              className="border rounded px-3 py-2 w-full"
              value={value}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  updatePolicyResponse(field.id, null);
                  return;
                }
                const parsed = Number(raw);
                updatePolicyResponse(field.id, Number.isNaN(parsed) ? null : parsed);
              }}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        );
      }
      case 'date_time': {
        const value = typeof policyResponses[field.id] === 'string' ? (policyResponses[field.id] as string) : '';
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium">
              {field.title}
              {field.is_required && <span className="text-red-600 ml-1">*</span>}
            </label>
            {description}
            <input
              type="datetime-local"
              className="border rounded px-3 py-2 w-full"
              value={value}
              onChange={(e) => updatePolicyResponse(field.id, e.target.value)}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        );
      }
      case 'file_upload': {
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium">
              {field.title}
              {field.is_required && <span className="text-red-600 ml-1">*</span>}
            </label>
            {description}
            <p className="text-sm text-amber-600">
              Uploaden via dit formulier wordt binnenkort ondersteund. Neem contact op met de kliniek als dit verplicht is.
            </p>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        );
      }
      case 'text_input':
      default: {
        const value = typeof policyResponses[field.id] === 'string' ? (policyResponses[field.id] as string) : '';
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium">
              {field.title}
              {field.is_required && <span className="text-red-600 ml-1">*</span>}
            </label>
            {description}
            <input
              className="border rounded px-3 py-2 w-full"
              value={value}
              onChange={(e) => updatePolicyResponse(field.id, e.target.value)}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        );
      }
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Book an Appointment</h1>

      <Stepper step={step} />

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Step 1: Select Service</h2>
          <div className="space-y-2">
            {services.map(s => (
              <label key={s.id} className="flex items-center gap-3 p-3 border rounded">
                <input
                  type="radio"
                  name="service"
                  value={s.id}
                  checked={serviceId === s.id}
                  onChange={() => setServiceId(s.id)}
                />
                <span className="flex-1">{s.name}</span>
                <span className="font-medium">{formatEuroCents(s.price ?? 0)}</span>
              </label>
            ))}
          </div>
          {selectedService?.policyFields.length ? (
            <div className="space-y-3 border rounded p-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Servicebeleid</h3>
              <div className="space-y-4">
                {selectedService.policyFields.map((field) => renderPolicyField(field))}
              </div>
            </div>
          ) : null}
          {selectedService && (
            <div className="flex items-center justify-between rounded border bg-gray-50 px-3 py-2 text-sm">
              <span>Actuele totaalprijs</span>
              <span className="font-medium">
                {formatEuroCents(grandTotalCents)}
              </span>
            </div>
          )}
          <div className="flex justify-end">
            <button
              className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
              disabled={!serviceId}
              onClick={handleStep1Continue}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Step 2: Location, Date, Time</h2>
          <div>
            <label className="block text-sm mb-1">Location</label>
            <select title="Location" className="border rounded px-3 py-2 w-full" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Select location</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Calendar
              month={monthCursor}
              onPrevMonth={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
              onNextMonth={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
              selectedDate={date}
              onSelectDate={(d) => setDate(d)}
              heatmap={heatmap}
            />
            {loadingHeatmap && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded">
                <div className="h-6 w-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <TimePicker
            loading={loadingSlots}
            slots={slots}
            selected={selectedSlot}
            onSelect={(s) => setSelectedSlot(s)}
          />
          <div className="flex justify-between">
            <button className="px-4 py-2 border rounded" onClick={() => setStep(1)}>Back</button>
            <button
              className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
              disabled={!selectedSlot}
              onClick={() => {
                // Skip to review (step 4) if no addons, otherwise go to addons (step 3)
                setStep(hasAddons ? 3 : 4);
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && hasAddons && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Step 3: Add-ons</h2>
          {!selectedService ? (
            <p className="text-sm text-gray-600">Selecteer eerst een service om beschikbare add-ons te zien.</p>
          ) : (
            <div className="space-y-3">
              {selectedService.addons.map((addon) => {
                const checked = addon.isRequired || Boolean(selectedAddons[addon.id]);
                return (
                  <label key={addon.id} className="flex items-start gap-3 rounded border p-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      disabled={addon.isRequired}
                      checked={checked}
                      onChange={() => toggleAddonSelection(addon.id)}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium">{addon.name}</span>
                        <span className="text-sm text-gray-700">{formatEuroCents(addon.priceCents)}</span>
                      </div>
                      {addon.description && <p className="text-sm text-gray-600">{addon.description}</p>}
                      {addon.isRequired && (
                        <p className="text-xs text-amber-600">Deze add-on is verplicht en automatisch toegevoegd.</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {selectedService && (
            <div className="flex items-center justify-between rounded border bg-gray-50 px-3 py-2 text-sm">
              <span>Actuele totaalprijs</span>
              <span className="font-medium">{formatEuroCents(grandTotalCents)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <button className="px-4 py-2 border rounded" onClick={() => setStep(2)}>Back</button>
            <button className="px-4 py-2 bg-black text-white rounded" onClick={() => setStep(4)}>Continue</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Step {getDisplayStepNumber(4)}: Review & Checkout</h2>
          <div className="border rounded p-3 space-y-2">
            <div className="flex justify-between">
              <span>Service</span>
              <span>
                {selectedService?.name}
                <span className="block text-xs text-gray-500">Basisprijs: {formatEuroCents(selectedService?.price ?? 0)}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{date}</span>
            </div>
            <div className="flex justify-between">
              <span>Time</span>
              <span>{selectedSlot ? new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
            </div>
            {selectedAddOnItems.length > 0 && (
              <div className="pt-2">
                <p className="text-sm font-medium">Gekozen add-ons</p>
                <div className="space-y-1 pt-1">
                  {selectedAddOnItems.map((addon) => (
                    <div key={addon.id} className="flex justify-between text-sm">
                      <span>{addon.name}</span>
                      <span>{formatEuroCents(addon.priceCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {policyExtraPriceCents > 0 && (
              <div className="flex justify-between">
                <span>Servicebeleid</span>
                <span>{formatEuroCents(policyExtraPriceCents)}</span>
              </div>
            )}
            {addonExtraPriceCents > 0 && (
              <div className="flex justify-between">
                <span>Add-ons</span>
                <span>{formatEuroCents(addonExtraPriceCents)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total</span>
              <span>{formatEuroCents(grandTotalCents)}</span>
            </div>
          </div>
          <CheckoutForm
            currentEmail={clientEmail}
            contactDefaults={contactDefaults}
            contactDefaultsVersion={contactDefaultsVersion}
            emailChecked={emailChecked}
            password={password}
            isLoggedIn={isLoggedIn}
            onEmailChange={handleEmailChange}
            onPasswordChange={setPassword}
            onLogin={handleLogin}
            onSubmit={handleBookingSubmit}
            finalizing={finalizing}
            errorMsg={errorMsg}
          />
          <div className="flex justify-between">
            <button 
              className="px-4 py-2 border rounded" 
              onClick={() => {
                // Go back to addons step if addons exist, otherwise go back to step 2
                setStep(hasAddons ? 3 : 2);
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildHeatmapForRange(
  cache: Record<string, number>,
  start: Date,
  end: Date,
): Record<string, number> {
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

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-3 mb-6 text-sm">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className={`flex items-center gap-2 ${step >= s ? 'text-black' : 'text-gray-400'}`}>
          <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${step >= s ? 'bg-black text-white border-black' : ''}`}>{s}</div>
          <span className="hidden sm:inline">
            {s === 1 ? 'Service' : s === 2 ? 'Schedule' : s === 3 ? 'Add-ons' : 'Review'}
          </span>
          {s < 4 && <div className="w-6 h-px bg-gray-300" />}
        </div>
      ))}
    </div>
  );
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m2 = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m2}-${dd}`;
}

function parseISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function normalizePolicyFields(rawFields: RawPolicyField[] | null | undefined): PolicyField[] {
  if (!Array.isArray(rawFields)) return [];
  return rawFields
    .map((field, index) => {
      const order =
        typeof field.order === 'number'
          ? field.order
          : typeof field.field_order === 'number'
            ? field.field_order
            : index;
      const rawChoices = field.choices ?? field.service_policy_field_choices ?? [];
      const choices = rawChoices
        .map((choice, choiceIndex) => ({
          id: choice.id ?? `${field.id ?? 'choice'}-${choiceIndex}`,
          field_id: choice.field_id ?? field.id ?? '',
          title: choice.title ?? '',
          price: typeof choice.price === 'number' ? choice.price : Number(choice.price) || 0,
          order:
            typeof choice.order === 'number'
              ? choice.order
              : choiceIndex,
        }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return {
        ...field,
        order,
        choices,
      } as PolicyField;
    })
    .sort((a, b) => a.order - b.order);
}

function normalizeAddons(rawAddons: ServiceAddon[] | null | undefined): Addon[] {
  if (!Array.isArray(rawAddons)) return [];
  return rawAddons
    .filter((addon): addon is ServiceAddon => Boolean(addon && addon.id && addon.is_active !== false))
    .map((addon) => ({
      id: addon.id,
      name: addon.name ?? '',
      description: addon.description ?? null,
      priceCents: Math.round(((addon.price ?? 0) as number) * 100),
      isRequired: Boolean(addon.is_required),
    }));
}

function buildPolicyAnswerPayload(fields: PolicyField[], responses: PolicyResponses): BookingPolicyAnswer[] {
  const answers: BookingPolicyAnswer[] = [];
  for (const field of fields) {
    const value = responses[field.id];
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    const priceCents = calculatePolicyFieldPriceCents(field, value);
    answers.push({
      fieldId: field.id,
      fieldType: field.field_type,
      value,
      priceEurCents: priceCents > 0 ? priceCents : undefined,
    });
  }
  return answers;
}

function calculatePolicyFieldPriceCents(field: PolicyField, value: PolicyAnswerValue): number {
  if (field.field_type === 'multi_choice' && Array.isArray(value)) {
    return value.reduce((total, choiceId) => {
      const choice = field.choices.find((c) => c.id === choiceId);
      if (!choice) return total;
      const price = typeof choice.price === 'number' ? choice.price : Number(choice.price);
      if (Number.isFinite(price) && price > 0) {
        return total + Math.round(price * 100);
      }
      return total;
    }, 0);
  }
  return 0;
}

function calculatePolicyExtraPriceCents(fields: PolicyField[], responses: PolicyResponses): number {
  return fields.reduce((sum, field) => {
    const value = responses[field.id];
    const price = calculatePolicyFieldPriceCents(field, value);
    return sum + price;
  }, 0);
}

function calculateAddonExtraPriceCents(addons: Addon[], selections: AddonSelections): number {
  return addons.reduce((sum, addon) => {
    if (selections[addon.id] || addon.isRequired) {
      return sum + addon.priceCents;
    }
    return sum;
  }, 0);
}

function buildAddonPayload(addons: Addon[], selections: AddonSelections): BookingAddonSelection[] {
  return addons
    .filter((addon) => addon.isRequired || selections[addon.id])
    .map((addon) => ({
      addonId: addon.id,
      quantity: 1,
      priceEurCents: addon.priceCents,
    }));
}

function Calendar(props: {
  month: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  selectedDate: string;
  onSelectDate: (yyyyMmDd: string) => void;
  heatmap: Record<string, number>;
}) {
  const { month, onPrevMonth, onNextMonth, selectedDate, onSelectDate, heatmap } = props;
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const lastDay = new Date(year, m + 1, 0);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const cells: { dateStr: string; isOtherMonth: boolean }[] = [];
  // leading days from previous month
  for (let i = 0; i < startWeekday; i++) {
    const dateObj = new Date(year, m, 1 - (startWeekday - i));
    const dateStr = toISODate(dateObj);
    cells.push({ dateStr, isOtherMonth: true });
  }
  // current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, m, d);
    const dateStr = toISODate(dateObj);
    cells.push({ dateStr, isOtherMonth: false });
  }
  // trailing days to complete last week
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const nextDate = new Date(last.dateStr + 'T00:00:00');
    nextDate.setDate(nextDate.getDate() + 1);
    cells.push({ dateStr: toISODate(nextDate), isOtherMonth: true });
  }

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="border rounded p-3">
      <div className="flex justify-between items-center mb-3">
        <button className="px-2 py-1 border rounded" onClick={onPrevMonth}>Prev</button>
        <div className="font-medium">{monthLabel}</div>
        <button className="px-2 py-1 border rounded" onClick={onNextMonth}>Next</button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs mb-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="text-center text-gray-500">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, idx) => {
          const count = heatmap[cell.dateStr] ?? 0;
          const isSelected = selectedDate === cell.dateStr;
          const enabled = count > 0;
          return (
            <button
              key={idx}
              className={
                `aspect-square border rounded flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-black text-white'
                    : enabled
                      ? (cell.isOtherMonth ? 'text-gray-400 hover:bg-gray-50' : 'hover:bg-gray-50')
                      : 'opacity-40 cursor-not-allowed'
                }`
              }
              disabled={!enabled}
              onClick={() => enabled && onSelectDate(cell.dateStr!)}
            >
              <div className="text-sm">{new Date(cell.dateStr).getDate()}</div>
              <div className="text-[10px] text-gray-600">{count} slots</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimePicker({
  loading,
  slots,
  selected,
  onSelect,
}: {
  loading: boolean;
  slots: Slot[];
  selected: Slot | null;
  onSelect: (s: Slot) => void;
}) {
  const groups = groupSlots(slots);
  return (
    <div>
      <label className="block text-sm mb-2">Available Times</label>
      {loading && (
        <div className="text-sm text-gray-500 mb-2">Loading times…</div>
      )}
      {!loading && slots.length === 0 && (
        <div className="text-sm text-gray-500">No slots available for chosen date.</div>
      )}
      {!loading && slots.length > 0 && (
        <div className="space-y-4">
          {(['morning','afternoon','evening'] as const).map((k) => (
            groups[k].length > 0 && (
              <div key={k}>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{k}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {groups[k].map((s, idx) => (
                    <Button
                      key={`${s.shiftId}-${idx}`}
                      variant={selected === s ? 'default' : 'outline'}
                      className={selected === s ? '' : 'bg-white'}
                      onClick={() => onSelect(s)}
                    >
                      {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Button>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

function groupSlots(slots: Slot[]): { morning: Slot[]; afternoon: Slot[]; evening: Slot[] } {
  const res = { morning: [] as Slot[], afternoon: [] as Slot[], evening: [] as Slot[] };
  for (const s of slots) {
    const h = new Date(s.startTime).getHours();
    if (h < 12) res.morning.push(s);
    else if (h < 17) res.afternoon.push(s);
    else res.evening.push(s);
  }
  return res;
}

function CheckoutForm({
  currentEmail,
  contactDefaults,
  contactDefaultsVersion,
  emailChecked,
  password,
  isLoggedIn,
  onEmailChange,
  onPasswordChange,
  onLogin,
  onSubmit,
  finalizing,
  errorMsg,
}: {
  currentEmail: string;
  contactDefaults: Omit<BookingContactInput, 'clientEmail'>;
  contactDefaultsVersion: number;
  emailChecked: null | { exists: boolean };
  password: string;
  isLoggedIn: boolean;
  onEmailChange: (value: string) => void | Promise<void>;
  onPasswordChange: (value: string) => void;
  onLogin: (email: string) => void | Promise<void>;
  onSubmit: (values: BookingContactInput) => void | Promise<void>;
  finalizing: boolean;
  errorMsg: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    trigger,
    getValues,
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
    },
  });

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
      });
    }
  }, [contactDefaults, contactDefaultsVersion, getValues, reset]);

  const showLoginForm = emailChecked?.exists === true && !isLoggedIn;
  const showDetailsForm = emailChecked?.exists === false || isLoggedIn;

  const emailField = register('clientEmail');
  const firstNameField = register('firstName');
  const lastNameField = register('lastName');
  const phoneField = register('phone');
  const addressField = register('address');

  return (
    <form className="border rounded p-3 space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">E-mailadres</label>
          <input
            type="email"
            className="border rounded px-3 py-2 w-full"
            placeholder="jij@example.com"
            {...emailField}
            onChange={(e) => {
              emailField.onChange(e);
              void onEmailChange(e.target.value);
            }}
          />
          {errors.clientEmail && <div className="text-xs text-red-600 mt-1">{errors.clientEmail.message}</div>}
          {emailChecked?.exists === true && !isLoggedIn && (
            <div className="text-xs text-green-600 mt-1">Account gevonden. Log in om door te gaan.</div>
          )}
          {emailChecked?.exists === true && isLoggedIn && (
            <div className="text-xs text-green-600 mt-1">U bent ingelogd. Vul uw gegevens verder aan.</div>
          )}
          {emailChecked?.exists === false && (
            <div className="text-xs text-gray-600 mt-1">
              We maken een account voor u aan met dit e-mailadres (zonder wachtwoord).
            </div>
          )}
        </div>
        {showLoginForm && (
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Wachtwoord</label>
            <input
              type="password"
              className="border rounded px-3 py-2 w-full"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Voer uw wachtwoord in"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && password) {
                  const valid = await trigger('clientEmail');
                  if (valid) {
                    await onLogin(getValues('clientEmail'));
                  }
                }
              }}
            />
            <Button
              type="button"
              onClick={async () => {
                const valid = await trigger('clientEmail');
                if (valid) {
                  await onLogin(getValues('clientEmail'));
                }
              }}
              disabled={finalizing || !password}
              className="w-full mt-3"
            >
              {finalizing ? 'Bezig met inloggen…' : 'Inloggen en doorgaan'}
            </Button>
          </div>
        )}
        {showDetailsForm && (
          <>
            <div>
              <label className="block text-sm mb-1">Voornaam</label>
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="Uw voornaam"
                {...firstNameField}
              />
              {errors.firstName && <div className="text-xs text-red-600 mt-1">{errors.firstName.message}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Achternaam</label>
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="Uw achternaam"
                {...lastNameField}
              />
              {errors.lastName && <div className="text-xs text-red-600 mt-1">{errors.lastName.message}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Telefoon</label>
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="Optioneel"
                {...phoneField}
              />
              {errors.phone && <div className="text-xs text-red-600 mt-1">{errors.phone.message}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Adres</label>
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="Optioneel"
                {...addressField}
              />
              {errors.address && <div className="text-xs text-red-600 mt-1">{errors.address.message}</div>}
            </div>
          </>
        )}
      </div>
      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}
      {showDetailsForm && (
        <div className="flex justify-end">
          <Button type="submit" disabled={finalizing || !isValid}>
            {finalizing ? 'Bezig met verwerken…' : 'Boeking afronden'}
          </Button>
        </div>
      )}
    </form>
  );
}


