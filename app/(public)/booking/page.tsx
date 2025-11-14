'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatEuroCents } from '@/lib/currency/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin } from 'lucide-react';
import { bookingContactSchema, BookingContactInput, BookingPolicyAnswer, BookingAddonSelection } from '@/lib/validation/booking';
import { ServiceAddon, ServicePolicyField, ServicePolicyFieldChoice } from '@/lib/types/service';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight01Icon, Loading03Icon } from '@hugeicons/core-free-icons';
import { Separator } from '@/components/ui/separator';
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

type BookingState = {
  step: 1 | 2 | 3 | 4;
  serviceId: string;
  locationId: string;
  date: string;
  selectedSlot: Slot | null;
  policyResponses: PolicyResponses;
  selectedAddons: AddonSelections;
  clientEmail: string;
  contactDefaults: Omit<BookingContactInput, 'clientEmail'>;
  emailChecked: null | { exists: boolean };
  isLoggedIn: boolean;
  monthCursor: string; // ISO date string
  timestamp: number; // to detect stale data
};

const BOOKING_STATE_KEY = 'goudecho_booking_state';
const STATE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper functions to save/load state
function saveBookingState(state: Partial<BookingState>): void {
  if (typeof window === 'undefined') return;
  try {
    // Ensure all values are serializable and add timestamp
    const serializable: Partial<BookingState> = {
      ...state,
      timestamp: Date.now(),
    };
    
    // Sanitize selectedSlot if present
    if (serializable.selectedSlot !== undefined && serializable.selectedSlot !== null) {
      serializable.selectedSlot = {
        shiftId: String(serializable.selectedSlot.shiftId || ''),
        staffId: String(serializable.selectedSlot.staffId || ''),
        startTime: String(serializable.selectedSlot.startTime || ''),
        endTime: String(serializable.selectedSlot.endTime || ''),
      };
    }
    
    const jsonString = JSON.stringify(serializable);
    localStorage.setItem(BOOKING_STATE_KEY, jsonString);
  } catch (e) {
    console.warn('Failed to save booking state:', e);
    // If saving fails, try to clear potentially corrupted data
    try {
      clearBookingState();
    } catch (clearError) {
      console.warn('Failed to clear booking state after save error:', clearError);
    }
  }
}

function loadBookingState(): Partial<BookingState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(BOOKING_STATE_KEY);
    if (!stored || stored.trim() === '') return null;
    
    // Try to parse the JSON
    let state: BookingState;
    try {
      state = JSON.parse(stored) as BookingState;
    } catch (parseError) {
      // If parsing fails, clear the corrupted data
      console.warn('Failed to parse booking state from localStorage, clearing:', parseError);
      clearBookingState();
      return null;
    }
    
    // Validate that we have a valid state object
    if (!state || typeof state !== 'object') {
      clearBookingState();
      return null;
    }
    
    // Check if state is expired
    if (typeof state.timestamp !== 'number' || Date.now() - state.timestamp > STATE_EXPIRY_MS) {
      clearBookingState();
      return null;
    }
    
    // Validate and sanitize the state
    const sanitized: Partial<BookingState> = {};
    if (typeof state.step === 'number' && state.step >= 1 && state.step <= 4) {
      sanitized.step = state.step as 1 | 2 | 3 | 4;
    }
    if (typeof state.serviceId === 'string') sanitized.serviceId = state.serviceId;
    if (typeof state.locationId === 'string') sanitized.locationId = state.locationId;
    if (typeof state.date === 'string') sanitized.date = state.date;
    if (state.selectedSlot && typeof state.selectedSlot === 'object') {
      sanitized.selectedSlot = {
        shiftId: String(state.selectedSlot.shiftId || ''),
        staffId: String(state.selectedSlot.staffId || ''),
        startTime: String(state.selectedSlot.startTime || ''),
        endTime: String(state.selectedSlot.endTime || ''),
      };
    }
    if (state.policyResponses && typeof state.policyResponses === 'object') {
      sanitized.policyResponses = state.policyResponses;
    }
    if (state.selectedAddons && typeof state.selectedAddons === 'object') {
      sanitized.selectedAddons = state.selectedAddons;
    }
    if (typeof state.clientEmail === 'string') sanitized.clientEmail = state.clientEmail;
    if (state.contactDefaults && typeof state.contactDefaults === 'object') {
      sanitized.contactDefaults = state.contactDefaults;
    }
    if (state.emailChecked === null || (state.emailChecked && typeof state.emailChecked === 'object' && typeof state.emailChecked.exists === 'boolean')) {
      sanitized.emailChecked = state.emailChecked;
    }
    if (typeof state.isLoggedIn === 'boolean') sanitized.isLoggedIn = state.isLoggedIn;
    if (typeof state.monthCursor === 'string') sanitized.monthCursor = state.monthCursor;
    
    return sanitized;
  } catch (e) {
    console.warn('Failed to load booking state:', e);
    // Clear potentially corrupted data
    clearBookingState();
    return null;
  }
}

function clearBookingState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BOOKING_STATE_KEY);
  } catch (e) {
    console.warn('Failed to clear booking state:', e);
  }
}

export default function BookingPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  
  // Global error handler to catch and log pattern matching errors
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Override console.error to catch pattern errors
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      if (errorMessage.includes('pattern') || errorMessage.includes('SyntaxError')) {
        console.group('🔍 Pattern Error Detected');
        console.error('Error:', ...args);
        console.trace('Stack trace:');
        console.groupEnd();
      }
      originalError.apply(console, args);
    };
    
    // Catch unhandled errors
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('pattern') || event.message?.includes('SyntaxError')) {
        console.group('🔍 Unhandled Pattern Error');
        console.error('Message:', event.message);
        console.error('File:', event.filename);
        console.error('Line:', event.lineno);
        console.error('Column:', event.colno);
        console.error('Error object:', event.error);
        console.trace('Stack trace:');
        console.groupEnd();
      }
    };
    
    // Catch unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = typeof reason === 'string' ? reason : reason?.message || String(reason);
      if (message?.includes('pattern') || message?.includes('SyntaxError')) {
        console.group('🔍 Unhandled Promise Rejection (Pattern Error)');
        console.error('Reason:', reason);
        console.trace('Stack trace:');
        console.groupEnd();
      }
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  
  // Initialize with default values to prevent hydration mismatch
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
  
  // Calculate if details form should be shown
  const showDetailsForm = emailChecked?.exists === false || isLoggedIn;
  
  // Check if user is already logged in when page loads
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          // User is logged in - autofill email and mark as logged in
          const userEmail = session.user.email;
          setClientEmail(userEmail);
          setIsLoggedIn(true);
          setEmailChecked({ exists: true });
          
          // Fetch and autofill user details (only if not already autofilled)
          try {
            const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(userEmail)}`);
            const payload = await response.json();
            const user = payload?.user;
            if (user) {
              setContactDefaults((prev) => {
                // Only update if we don't already have data
                if (prev.firstName || prev.lastName) {
                  return prev;
                }
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
              setContactDefaultsVersion((prev) => prev + 1);
              setHasAutofilled(true);
            }
          } catch (error) {
            console.error('Error fetching user details on page load:', error);
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
      }
    };
    checkExistingSession();
  }, []); // Only run once on mount

  // Load state from localStorage after mount (client-side only)
  useEffect(() => {
    setIsMounted(true);
    const savedState = loadBookingState();
    if (savedState) {
      // Set flag to prevent saving during restore
      isRestoringRef.current = true;
      
      // Set previousServiceIdRef BEFORE setting serviceId to prevent clearing policy responses
      if (savedState.serviceId) {
        previousServiceIdRef.current = savedState.serviceId;
      }
      
      // Store saved addons in ref to restore after services load
      if (savedState.selectedAddons) {
        savedAddonsRef.current = savedState.selectedAddons;
      }
      
      // Restore state in order - set serviceId first, then policy responses
      if (savedState.step) setStep(savedState.step);
      if (savedState.serviceId) setServiceId(savedState.serviceId);
      if (savedState.locationId) setLocationId(savedState.locationId);
      if (savedState.date) setDate(savedState.date);
      if (savedState.monthCursor) {
        setMonthCursor(new Date(savedState.monthCursor));
      }
      if (savedState.selectedSlot) setSelectedSlot(savedState.selectedSlot);
      // Restore policy responses after serviceId is set (so they don't get cleared)
      if (savedState.policyResponses && Object.keys(savedState.policyResponses).length > 0) {
        // Use setTimeout to ensure this runs after the serviceId useEffect
        setTimeout(() => {
          setPolicyResponses(savedState.policyResponses!);
        }, 0);
      }
      // Don't restore addons here - will restore after services load
      if (savedState.clientEmail) setClientEmail(savedState.clientEmail);
      if (savedState.contactDefaults) setContactDefaults(savedState.contactDefaults);
      if (savedState.emailChecked !== undefined) setEmailChecked(savedState.emailChecked);
      if (savedState.isLoggedIn !== undefined) setIsLoggedIn(savedState.isLoggedIn);
      
      // If user is logged in but we don't have contact defaults, fetch and autofill
      if (savedState.isLoggedIn && savedState.clientEmail && (!savedState.contactDefaults || (!savedState.contactDefaults.firstName && !savedState.contactDefaults.lastName))) {
        setTimeout(async () => {
          try {
            const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(savedState.clientEmail!)}`);
            const payload = await response.json();
            const user = payload?.user;
            if (user) {
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
              setContactDefaultsVersion((prev) => prev + 1);
              setHasAutofilled(true);
            }
          } catch (error) {
            console.error('Error fetching user details on restore:', error);
          }
        }, 100);
      }
      
      // Clear restore flag after a delay to allow all state updates to complete
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    }
  }, []);

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
    // Only clear policy responses if serviceId actually changed (not on initial mount/restore)
    if (previousServiceIdRef.current !== undefined && previousServiceIdRef.current !== serviceId) {
    setPolicyResponses({});
    setPolicyErrors({});
    }
    previousServiceIdRef.current = serviceId;
  }, [serviceId]);

  // Safety check: if we're on step 3 but service has no addons, skip to step 4
  useEffect(() => {
    if (step === 3 && !hasAddons) {
      setStep(4);
    }
  }, [step, hasAddons]);

  // Autofill user details when reaching step 4 if logged in and details not already filled
  useEffect(() => {
    if (step === 4 && !hasAutofilled) {
      const checkAndAutofill = async () => {
        // Check if user has active session
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
              // Update state if we found a session
              if (!isLoggedIn) {
                setIsLoggedIn(true);
                setClientEmail(emailToUse);
                setEmailChecked({ exists: true });
              }
            }
          } catch (error) {
            console.error('Error checking session:', error);
          }
        }
        
        if (shouldAutofill && emailToUse) {
          try {
            const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(emailToUse)}`);
            const payload = await response.json();
            const user = payload?.user;
            if (user) {
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
              setContactDefaultsVersion((prev) => prev + 1);
              setHasAutofilled(true);
            }
          } catch (error) {
            console.error('Error fetching user details on step 4:', error);
          }
        }
      };
      checkAndAutofill();
    }
  }, [step, isLoggedIn, clientEmail, hasAutofilled]);

  useEffect(() => {
    if (!selectedService) {
      setSelectedAddons({});
      return;
    }
    
    // If we have saved addons from localStorage, restore them first
    if (savedAddonsRef.current) {
      const savedAddons = savedAddonsRef.current;
      const next: AddonSelections = {};
      selectedService.addons.forEach((addon) => {
        if (addon.isRequired) {
          next[addon.id] = true;
        } else {
          // Restore saved selection if it exists, otherwise use current
          next[addon.id] = Boolean(savedAddons[addon.id]);
        }
      });
      setSelectedAddons(next);
      // Clear the ref so we don't restore again
      savedAddonsRef.current = null;
      return;
    }
    
    // Normal behavior: preserve existing selections
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

  // Save booking state to localStorage - use debounce to prevent infinite loops
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // Debounced save effect - only runs when primitive values change
  useEffect(() => {
    // Skip until mounted and state is loaded
    if (!isMounted) {
      return;
    }

    // Skip if we're currently restoring state from localStorage
    if (isRestoringRef.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce the save operation - closure will capture current values
    saveTimeoutRef.current = setTimeout(() => {
      // Double-check we're not restoring
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
    }, 500); // 500ms debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isMounted, step, serviceId, locationId, date, selectedSlot, policyResponses, selectedAddons, clientEmail, contactDefaults, emailChecked, isLoggedIn, monthCursor]);

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
        postalCode: undefined,
        houseNumber: undefined,
        streetName: undefined,
        city: undefined,
        birthDate: undefined,
        midwifeId: undefined,
        dueDate: undefined,
        notes: undefined,
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
              postalCode: user.postal_code || undefined,
              houseNumber: user.house_number || undefined,
              streetName: user.street_name || undefined,
              city: user.city || undefined,
              birthDate: user.birth_date || undefined,
              midwifeId: user.midwife_id || undefined,
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
      
      // Fetch and autofill user details after successful login
      try {
        const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(emailForLogin)}`);
        const payload = await response.json();
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
        }
      } catch (error) {
        console.error('Error fetching user details after login:', error);
      }
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
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Boeking is niet gelukt');
      }

      // Ensure session is refreshed after booking for logged-in users
      if (emailChecked?.exists === true && isLoggedIn) {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        // Refresh the session to ensure it's up to date
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          console.warn('Session not found after booking - user may need to log in again');
        } else {
          // Session exists and should persist across redirect
          console.log('User session confirmed after booking');
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

      // Clear booking state after successful booking
      clearBookingState();

      // Redirect to confirmation page
      router.push(`/booking/confirmation?bookingId=${data.booking.id}`);
    } catch (e: unknown) {
      setErrorMsg((e as Error)?.message || 'Boeking is niet gelukt');
    } finally {
      setFinalizing(false);
    }
  };

  const handleStartOver = async () => {
    if (confirm('Weet u zeker dat u opnieuw wilt beginnen? Alle ingevulde gegevens worden gewist.')) {
      // Check if user has an active session before resetting login state
      let hasActiveSession = false;
      let sessionEmail = '';
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        hasActiveSession = !!session;
        if (session?.user?.email) {
          sessionEmail = session.user.email;
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
      
      clearBookingState();
      setStep(1);
      setServiceId('');
      setLocationId('');
      setDate('');
      setSelectedSlot(null);
      setPolicyResponses({});
      setPolicyErrors({});
      setSelectedAddons({});
      
      // If user has active session, preserve login state and email
      if (hasActiveSession && sessionEmail) {
        setClientEmail(sessionEmail);
        setEmailChecked({ exists: true });
        setIsLoggedIn(true);
        // Fetch and autofill user details
        try {
          const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(sessionEmail)}`);
          const payload = await response.json();
          const user = payload?.user;
          if (user) {
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
            setContactDefaultsVersion((prev) => prev + 1);
            setHasAutofilled(true);
          } else {
            setContactDefaults({
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
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
          setContactDefaults({
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
        }
      } else {
        setClientEmail('');
        setEmailChecked(null);
        setIsLoggedIn(false);
        setContactDefaults({
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
      }
      setPassword('');
      setErrorMsg('');
      // Reset month cursor to current month
      const d = new Date();
      d.setDate(1);
      d.setHours(0,0,0,0);
      setMonthCursor(d);
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
                <span className="text-xs font-medium">
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
              <span className="text-xs font-medium">
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
                  <label key={choice.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={selected.includes(choice.id)}
                      onChange={() => toggleMultiChoiceOption(field.id, choice.id)}
                    />
                    <span className="flex-1">{choice.title}</span>
                    {price > 0 && (
                      <span className="text-xs text-gray-600">
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
            <label className="block text-xs font-bold">
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
        // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:mm)
        const rawValue = typeof policyResponses[field.id] === 'string' ? (policyResponses[field.id] as string) : '';
        let value = '';
        if (rawValue) {
          try {
            // If it's already in datetime-local format, use it as-is
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawValue)) {
              value = rawValue;
              console.log('🔍 datetime-local: Using value as-is', { fieldId: field.id, value });
            } else {
              // If it's an ISO string, convert to datetime-local format
              const date = new Date(rawValue);
              if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                value = `${year}-${month}-${day}T${hours}:${minutes}`;
                console.log('🔍 datetime-local: Converted ISO to datetime-local', { fieldId: field.id, rawValue, value });
              } else {
                console.warn('🔍 datetime-local: Invalid date', { fieldId: field.id, rawValue });
              }
            }
          } catch (error) {
            // If conversion fails, use empty string
            console.error('🔍 datetime-local: Conversion error', { fieldId: field.id, rawValue, error });
            value = '';
          }
        }
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-xs font-bold">
              {field.title}
              {field.is_required && <span className="text-red-600 ml-1">*</span>}
            </label>
            {description}
            <input
              type="datetime-local"
              className="border rounded px-3 py-2 w-full"
              value={value}
              onInvalid={(e) => {
                const target = e.target as HTMLInputElement;
                console.error('🔍 datetime-local input invalid:', {
                  fieldId: field.id,
                  value: target.value,
                  rawValue,
                  validity: target.validity,
                  validationMessage: target.validationMessage,
                });
              }}
              onChange={(e) => {
                const newValue = e.target.value;
                if (newValue && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(newValue)) {
                  console.warn('🔍 datetime-local: Invalid format on change', { fieldId: field.id, value: newValue });
                }
                updatePolicyResponse(field.id, newValue);
              }}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        );
      }
      case 'file_upload': {
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-xs font-bold">
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
            <label className="block text-xs font-bold">
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

  const totalSteps = hasAddons ? 4 : 3;
  const currentStepNumber = getDisplayStepNumber(step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl" style={{ borderRadius: '0.2rem' }}>
        <CardHeader className="relative pb-6">
          <div className="flex items-start justify-between">
            <h1 className="text-lg font-bold text-gray-900">Book Your Appointment</h1>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartOver}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Start Over
              </Button>
            <div className="text-right">
              <div className="text-xs text-gray-500 font-medium">STEP {currentStepNumber}/{totalSteps}</div>
              </div>
            </div>
          </div>
          
          {/* Modern Progress Bar */}
          <div className="flex gap-2 mt-6 max-w-[200px]">
            {Array.from({ length: totalSteps }).map((_, idx) => {
              const stepNum = idx + 1;
              const isActive = currentStepNumber >= stepNum;
              return (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    isActive ? 'bg-[#8B4513]' : 'bg-gray-200'
                  }`}
                />
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Select service</h2>
                <p className="text-xs text-gray-600">Choose a service to continue.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="service-select" className="text-sm font-bold text-gray-700">
                    Services
                  </Label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger id="service-select" className="w-full h-11">
                      <SelectValue placeholder="Select services">
                        {serviceId ? services.find(s => s.id === serviceId)?.name : 'Select services'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{s.name}</span>
                            <span className="ml-4 text-gray-500">{formatEuroCents(s.price ?? 0)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedService?.policyFields.length ? (
                <div className="space-y-4 p-4 bg-muted" style={{ borderRadius: '0.2rem' }}>
                  <h3 className="text-xs font-bold tracking-wide text-gray-600">Servicebeleid</h3>
                  <div className="space-y-4">
                    {selectedService.policyFields.map((field) => renderPolicyField(field))}
                  </div>
                </div>
              ) : null}
              
              {selectedService && (
                <div className="flex items-center justify-between px-4 py-3 bg-border" style={{ borderRadius: '0.2rem' }}>
                  <span className="text-sm font-bold text-gray-700">Actuele totaalprijs</span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatEuroCents(grandTotalCents)}
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleStep1Continue}
                  disabled={!serviceId}
                  className="h-11 px-8 bg-secondary-foreground hover:bg-secondary-foreground/90 text-white rounded-md font-medium"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Location, Date & Time</h2>
                <p className="text-xs text-gray-600">Choose your location, date and time slot.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-select-step2" className="text-sm font-bold text-gray-700">
                  Location
                </Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger id="location-select-step2" className="w-full h-11">
                    <SelectValue placeholder="Choose location">
                      {locationId ? locations.find(l => l.id === locationId)?.name : 'Choose location'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{l.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-11 px-6 border-gray-300"
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    setStep(hasAddons ? 3 : 4);
                  }}
                  disabled={!selectedSlot}
                  className="h-11 px-8 bg-secondary-foreground hover:bg-secondary-foreground/90 text-white rounded-md font-medium"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && hasAddons && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Select add-ons</h2>
                <p className="text-xs text-gray-600">Choose any additional services you&apos;d like to include.</p>
              </div>
              {!selectedService ? (
                <p className="text-xs text-gray-600">Selecteer eerst een service om beschikbare add-ons te zien.</p>
              ) : (
                <div className="space-y-3">
                  {selectedService.addons.map((addon) => {
                    const checked = addon.isRequired || Boolean(selectedAddons[addon.id]);
                    return (
                      <label key={addon.id} className="flex items-start gap-3 p-4 bg-muted hover:bg-border transition-colors cursor-pointer" style={{ borderRadius: '0.2rem' }}>
                        <input
                          type="checkbox"
                      className="mt-0.5"
                      disabled={addon.isRequired}
                      checked={checked}
                      onChange={() => toggleAddonSelection(addon.id)}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-bold">{addon.name}</span>
                        <span className="text-xs text-gray-700">{formatEuroCents(addon.priceCents)}</span>
                      </div>
                      {addon.description && <p className="text-xs text-gray-600">{addon.description}</p>}
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
                <div className="flex items-center justify-between px-4 py-3 bg-border" style={{ borderRadius: '0.2rem' }}>
                  <span className="text-sm font-medium text-gray-700">Actuele totaalprijs</span>
                  <span className="text-sm font-bold text-gray-900">{formatEuroCents(grandTotalCents)}</span>
                </div> 
              )}
              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="h-11 px-6 border-gray-300"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="h-11 px-8 bg-secondary-foreground hover:bg-secondary-foreground/90 text-white rounded-md font-medium"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Review & checkout</h2>
                <p className="text-xs text-gray-600">Review your booking details and complete your appointment.</p>
              </div>
              <div className="p-4 space-y-3 bg-background" style={{ borderRadius: '0.2rem' }}>
            <div className="flex justify-between">
              <span className="text-xs font-bold">Service</span>
              <span className="text-xs text-gray-700">
                {selectedService?.name} {formatEuroCents(selectedService?.price ?? 0)}
                {/* <span className="block text-xs text-gray-700">Basisprijs: {formatEuroCents(selectedService?.price ?? 0)}</span> */}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-bold">Date</span>
              <span className="text-xs text-gray-700">{date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-bold">Time</span>
              <span className="text-xs text-gray-700">{selectedSlot ? new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
            </div>
            {selectedAddOnItems.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold">Gekozen add-ons</p>
                <div className="space-y-1 pt-1">
                  {selectedAddOnItems.map((addon) => (
                    <div key={addon.id} className="flex justify-between text-sm">
                      <span className="text-xs text-gray-700">{addon.name}</span>
                      <span className="text-xs text-gray-700">{formatEuroCents(addon.priceCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {policyExtraPriceCents > 0 && (
              <div className="flex justify-between">
                <span className="text-xs">Servicebeleid</span>
                <span className="text-xs text-gray-700">{formatEuroCents(policyExtraPriceCents)}</span>
              </div>
            )}
            {addonExtraPriceCents > 0 && (
              <div className="flex justify-between">
                <span className="text-xs font-bold">Add-ons</span>
                <span className="text-xs font-bold text-gray-700">{formatEuroCents(addonExtraPriceCents)}</span>
              </div>
            )}
                <div className="flex justify-between font-semibold border-t pt-3 mt-3">
                  <span className="text-base">Total</span>
                  <span className="text-lg">{formatEuroCents(grandTotalCents)}</span>
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
            onValidationChange={setIsFormValid}
          />
              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(hasAddons ? 3 : 2);
                  }}
                  className="h-11 px-6 border-gray-300"
                >
                  Back
                </Button>
                {showDetailsForm && (
                  <Button
                    type="submit"
                    form="checkout-form"
                    disabled={finalizing || !isFormValid}
                    className="h-11 px-8 bg-secondary-foreground hover:bg-secondary-foreground/90 text-white rounded-md font-medium"
                  >
                    {finalizing ? 'Bezig met verwerken…' : 'Boeking afronden'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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


function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m2 = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m2}-${dd}`;
}

function parseISODate(iso: string): Date {
  try {
    if (!iso || typeof iso !== 'string') {
      console.warn('parseISODate: Invalid input', { iso, type: typeof iso });
      return new Date();
    }
    // Validate ISO date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      console.warn('parseISODate: Invalid date format', { iso });
      return new Date();
    }
    const date = new Date(`${iso}T00:00:00`);
    if (isNaN(date.getTime())) {
      console.warn('parseISODate: Invalid date result', { iso, result: date });
      return new Date();
    }
    return date;
  } catch (error) {
    console.error('parseISODate: Error parsing date', { iso, error });
    return new Date();
  }
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
    const [lastYear, lastMonth, lastDay] = last.dateStr.split('-').map(Number);
    const nextDate = new Date(lastYear, lastMonth - 1, lastDay + 1);
    cells.push({ dateStr: toISODate(nextDate), isOtherMonth: true });
  }

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
 
  return (
    <div className="">
      <div className="flex justify-between items-center mb-3 p-4">
        <div className="text-sm font-bold">{monthLabel}</div>
        <div className="flex items-center gap-2">
        <button className="p-1 border rounded-full hover:bg-accent" onClick={onPrevMonth}><HugeiconsIcon icon={ArrowLeft01Icon} size={16} /></button>
        <button className="p-1 border rounded-full hover:bg-accent" onClick={onNextMonth}><HugeiconsIcon icon={ArrowRight01Icon} size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-md mb-3">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <div key={d} className="text-center text-secondary-foreground font-normal">{d}</div>
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
                `aspect-square flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-secondary-foreground text-white rounded-full'
                    : enabled
                      ? (cell.isOtherMonth ? 'text-gray-400 hover:bg-accent hover:rounded-full text-primary font-bold' : 'hover:bg-accent hover:rounded-full text-primary font-bold')
                      : 'opacity-40 cursor-not-allowed'
                }`
              }
              disabled={!enabled}
              onClick={() => enabled && onSelectDate(cell.dateStr!)}
            >
              <div className="text-md">{parseInt(cell.dateStr.split('-')[2], 10)}</div>
              {enabled && count > 0 && (
                <div className="w-1 h-1 rounded-full bg-current mt-0.5" />
              )}
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
      <label className="block text-sm font-bold">Available Times</label>
      {loading && (
        <HugeiconsIcon icon={Loading03Icon} size={24} className="animate-spin text-muted-foreground h-6 w-6" />
      )}
      {!loading && slots.length === 0 && (
        <div className="text-xs text-gray-500">No slots available for chosen date.</div>
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
  onValidationChange,
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
  onValidationChange?: (isValid: boolean) => void;
}) {
  const [midwives, setMidwives] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; practice_name: string | null }>>([]);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    trigger,
    getValues,
    watch,
    setValue,
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
      dueDate: contactDefaults.dueDate ?? '',
      birthDate: contactDefaults.birthDate ?? '',
      midwifeId: contactDefaults.midwifeId ?? '',
      houseNumber: contactDefaults.houseNumber ?? '',
      postalCode: contactDefaults.postalCode ?? '',
      streetName: contactDefaults.streetName ?? '',
      city: contactDefaults.city ?? '',
      notes: contactDefaults.notes ?? '',
    },
  });

  // Fetch midwives for dropdown
  useEffect(() => {
    const fetchMidwives = async () => {
      try {
        const response = await fetch('/api/midwives?active_only=true&limit=1000');
        const data = await response.json();
        if (data.success) {
          setMidwives(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching midwives:', error);
      }
    };
    fetchMidwives();
  }, []);

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
        dueDate: contactDefaults.dueDate ?? '',
        birthDate: contactDefaults.birthDate ?? '',
        midwifeId: contactDefaults.midwifeId ?? '',
        houseNumber: contactDefaults.houseNumber ?? '',
        postalCode: contactDefaults.postalCode ?? '',
        streetName: contactDefaults.streetName ?? '',
        city: contactDefaults.city ?? '',
        notes: contactDefaults.notes ?? '',
      });
    }
  }, [contactDefaults, contactDefaultsVersion, getValues, reset]);

  // Notify parent of validation state changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isValid);
    }
  }, [isValid, onValidationChange]);

  const showLoginForm = emailChecked?.exists === true && !isLoggedIn;
  const showDetailsForm = emailChecked?.exists === false || isLoggedIn;

  const emailField = register('clientEmail');
  const firstNameField = register('firstName');
  const lastNameField = register('lastName');
  const phoneField = register('phone');
  const addressField = register('address');
  const dueDateField = register('dueDate');
  const birthDateField = register('birthDate');
  const houseNumberField = register('houseNumber');
  const postalCodeField = register('postalCode');
  const streetNameField = register('streetName');
  const cityField = register('city');
  const notesField = register('notes');

  return (
    <form id="checkout-form" className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid md:grid-cols-2 gap-3">


        <div className="md:col-span-2">
          <label className="block text-sm mb-1">E-mailadres</label>
          <input
            type="email"
            className="border rounded px-3 py-2 w-full placeholder:text-xs text-xs"
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
              className="border rounded px-3 py-2 w-full placeholder:text-xs text-xs"
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
        <Separator className="w-full col-span-2 my-4" />
        {showDetailsForm && (
          <>
            <div>
              <label className="block text-sm mb-1">Voornaam</label>
              <input
                className="border rounded px-3 py-2 w-full placeholder:text-xs text-xs"
                placeholder="Uw voornaam"
                {...firstNameField}
              />
              {errors.firstName && <div className="text-xs text-red-600 mt-1">{errors.firstName.message}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Achternaam</label>
              <input
                className="border rounded px-3 py-2 w-full placeholder:text-xs text-xs"
                placeholder="Uw achternaam"
                {...lastNameField}
              />
              {errors.lastName && <div className="text-xs text-red-600 mt-1">{errors.lastName.message}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Telefoon</label>
              <input
                className="border rounded px-3 py-2 w-full placeholder:text-xs text-xs"
                placeholder="Optioneel"
                {...phoneField}
              />
              {errors.phone && <div className="text-xs text-red-600 mt-1">{errors.phone.message}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Adres</label>
              <Input
                placeholder="Optioneel"
                className="placeholder:text-xs text-xs"
                {...addressField}
              />
              {errors.address && <div className="text-xs text-red-600 mt-1">{errors.address.message}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Uitgerekende datum</label>
              <Input
                type="date"
                className="placeholder:text-xs text-xs"
                {...dueDateField}
                onInvalid={(e) => {
                  const target = e.target as HTMLInputElement;
                  console.error('🔍 Date input invalid (dueDate):', {
                    value: target.value,
                    validity: target.validity,
                    validationMessage: target.validationMessage,
                  });
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    console.warn('🔍 Invalid date format (dueDate):', value);
                  }
                  dueDateField.onChange(e);
                }}
              />
              {errors.dueDate && <div className="text-xs text-red-600 mt-1">{errors.dueDate.message}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Geboortedatum</label>
              <Input
                type="date"
                className="placeholder:text-xs text-xs"
                {...birthDateField}
                onInvalid={(e) => {
                  const target = e.target as HTMLInputElement;
                  console.error('🔍 Date input invalid (birthDate):', {
                    value: target.value,
                    validity: target.validity,
                    validationMessage: target.validationMessage,
                  });
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    console.warn('🔍 Invalid date format (birthDate):', value);
                  }
                  birthDateField.onChange(e);
                }}
              />
              {errors.birthDate && <div className="text-xs text-red-600 mt-1">{errors.birthDate.message}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Je eigen verloskundige</label>
              <Select 
                value={watch('midwifeId') || ''} 
                onValueChange={(value) => {
                  // Set the value directly - if empty string, zod will transform it to undefined
                  setValue('midwifeId', value || '', { shouldValidate: true });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer verloskundige (optioneel)" />
                </SelectTrigger>
                <SelectContent>
                  {midwives.map((m) => {
                    const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Naamloos';
                    const practice = m.practice_name;
                    return (
                      <SelectItem key={m.id} value={m.id}>
                        {practice ? `${name} (${practice})` : name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.midwifeId && <div className="text-xs text-red-600 mt-1">{errors.midwifeId.message}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Straatnaam</label>
              <Input
                placeholder="Optioneel"
                className="placeholder:text-xs text-xs"
                {...streetNameField}
              />
              {errors.streetName && <div className="text-xs text-red-600 mt-1">{errors.streetName.message}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Huisnummer</label>
              <Input
                placeholder="Optioneel"
                className="placeholder:text-xs text-xs"
                {...houseNumberField}
              />
              {errors.houseNumber && <div className="text-xs text-red-600 mt-1">{errors.houseNumber.message}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Postcode</label>
              <Input
                placeholder="Optioneel"
                className="placeholder:text-xs text-xs"
                {...postalCodeField}
              />
              {errors.postalCode && <div className="text-xs text-red-600 mt-1">{errors.postalCode.message}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Woonplaats</label>
              <Input
                placeholder="Optioneel"
                className="placeholder:text-xs text-xs"
                {...cityField}
              />
              {errors.city && <div className="text-xs text-red-600 mt-1">{errors.city.message}</div>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Notities</label>
              <Textarea
                placeholder="Optioneel"
                rows={3}
                className="placeholder:text-xs text-xs"
                {...notesField}
              />
              {errors.notes && <div className="text-xs text-red-600 mt-1">{errors.notes.message}</div>}
            </div>
          </>
        )}
      </div>
      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}
    </form>
  );
}


