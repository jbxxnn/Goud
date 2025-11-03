'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatEuroCents } from '@/lib/currency/format';
import { Button } from '@/components/ui/button';
// Using custom inline calendar below for finer heatmap control

type Service = { id: string; name: string; price: number };
type Location = { id: string; name: string };
type Slot = { shiftId: string; staffId: string; startTime: string; endTime: string };

export default function BookingPage() {
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

  // Step 4 summary
  const selectedService = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [emailChecked, setEmailChecked] = useState<null | { exists: boolean }>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Load basic data for step 1 and 2
    const load = async () => {
      const [svcRes, locRes] = await Promise.all([
        fetch('/api/services').then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/locations-simple').then(r => r.json()).catch(() => ({ data: [] })),
      ]);
      const svcData = Array.isArray(svcRes?.data) ? svcRes.data : [];
      setServices(svcData.map((s: any) => ({
        id: s.id,
        name: s.name,
        // Services API returns price in euros; convert to cents for formatter
        price: typeof s.price === 'number' ? Math.round(s.price * 100) : 0,
      })));
      const locData = Array.isArray(locRes?.data) ? locRes.data : [];
      setLocations(locData.map((l: any) => ({ id: l.id, name: l.name })));
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
          const s: Slot[] = (d.slots ?? []).map((x: any) => ({
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

    const toISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const params = new URLSearchParams({
      serviceId,
      locationId,
      start: toISO(gridStart),
      end: toISO(gridEnd),
    });
    setLoadingHeatmap(true);
    fetch(`/api/availability/heatmap?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        const map: Record<string, number> = {};
        for (const day of d.days ?? []) map[day.date] = day.availableSlots;
        setHeatmap(map);
      })
      .catch(() => setHeatmap({}))
      .finally(() => setLoadingHeatmap(false));
  }, [serviceId, locationId, monthCursor]);

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
          <div className="flex justify-end">
            <button
              className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
              disabled={!serviceId}
              onClick={() => setStep(2)}
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
            <select className="border rounded px-3 py-2 w-full" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
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
              onClick={() => setStep(3)}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Step 3: Add-ons</h2>
          <p className="text-sm text-gray-600">Coming soon. Continue to review.</p>
          <div className="flex justify-between">
            <button className="px-4 py-2 border rounded" onClick={() => setStep(2)}>Back</button>
            <button className="px-4 py-2 bg-black text-white rounded" onClick={() => setStep(4)}>Continue</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Step 4: Review & Checkout</h2>
          <div className="border rounded p-3 space-y-1">
            <div className="flex justify-between">
              <span>Service</span>
              <span>{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{date}</span>
            </div>
            <div className="flex justify-between">
              <span>Time</span>
              <span>{selectedSlot ? new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatEuroCents(selectedService?.price ?? 0)}</span>
            </div>
          </div>
          <CheckoutForm
            email={email}
            firstName={firstName}
            lastName={lastName}
            phone={phone}
            address={address}
            emailChecked={emailChecked}
            onEmailChange={async (v) => {
              setEmail(v);
              setEmailChecked(null);
              setIsLoggedIn(false);
              setPassword('');
              if (v && v.includes('@')) {
                try {
                  const res = await fetch('/api/auth/email-exists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v }) });
                  const data = await res.json();
                  setEmailChecked({ exists: !!data.exists });
                  if (data.exists) {
                    const r = await fetch(`/api/users/by-email?email=${encodeURIComponent(v)}`);
                    const u = await r.json();
                    if (u?.user) {
                      setFirstName(u.user.first_name || '');
                      setLastName(u.user.last_name || '');
                      setPhone(u.user.phone || '');
                      setAddress(u.user.address || '');
                    }
                  }
                } catch {}
              }
            }}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onPhoneChange={setPhone}
            onAddressChange={setAddress}
            password={password}
            onPasswordChange={setPassword}
            isLoggedIn={isLoggedIn}
            onFinalize={async () => {
              setErrorMsg('');
              setFinalizing(true);
              try {
                // If email exists, require login first
                if (emailChecked?.exists === true && !isLoggedIn) {
                  if (!password) throw new Error('Please enter your password to continue');
                  const { createClient } = await import('@/lib/supabase/client');
                  const supabase = createClient();
                  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
                  if (loginErr) throw new Error(loginErr.message || 'Login failed');
                  // Verify session was created
                  if (loginData?.session) {
                    setIsLoggedIn(true);
                    setFinalizing(false);
                    return;
                  } else {
                    throw new Error('Login failed: No session created');
                  }
                }

                if (!selectedService || !selectedSlot || !locationId) throw new Error('Missing selection');
                const priceCents = selectedService.price ?? 0;
                const resp = await fetch('/api/bookings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    clientEmail: email,
                    firstName,
                    lastName,
                    phone,
                    address,
                    serviceId,
                    locationId,
                    staffId: selectedSlot.staffId,
                    shiftId: selectedSlot.shiftId,
                    startTime: selectedSlot.startTime,
                    endTime: selectedSlot.endTime,
                    priceEurCents: priceCents,
                  }),
                });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.error || 'Failed to create booking');

                // For existing users, verify session is still active
                if (emailChecked?.exists === true && isLoggedIn) {
                  const { createClient } = await import('@/lib/supabase/client');
                  const supabase = createClient();
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) {
                    console.warn('Session not found after booking - user may need to log in again');
                  }
                }

                // For new users, send magic link
                if (emailChecked?.exists === false) {
                  try {
                    const { createClient } = await import('@/lib/supabase/client');
                    const supabase = createClient();
                    await supabase.auth.signInWithOtp({
                      email,
                      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password` },
                    });
                  } catch {}
                }

                alert('Booking confirmed!' + (emailChecked?.exists === false ? ' We sent a magic link to your email to access your account.' : ''));
              } catch (e: any) {
                setErrorMsg(e?.message || 'Checkout failed');
              } finally {
                setFinalizing(false);
              }
            }}
            finalizing={finalizing}
            errorMsg={errorMsg}
          />
          <div className="flex justify-between">
            <button className="px-4 py-2 border rounded" onClick={() => setStep(3)}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
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
  email,
  firstName,
  lastName,
  phone,
  address,
  emailChecked,
  password,
  isLoggedIn,
  onEmailChange,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onAddressChange,
  onPasswordChange,
  onFinalize,
  finalizing,
  errorMsg,
}: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  emailChecked: null | { exists: boolean };
  password: string;
  isLoggedIn: boolean;
  onEmailChange: (v: string) => void;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onFinalize: () => void;
  finalizing: boolean;
  errorMsg: string;
}) {
  const showLoginForm = emailChecked?.exists === true && !isLoggedIn;
  const showDetailsForm = emailChecked?.exists === false || isLoggedIn;
  const canCheckout = email && firstName && lastName && (
    emailChecked?.exists === false || (emailChecked?.exists === true && isLoggedIn)
  );

  return (
    <div className="border rounded p-3 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            className="border rounded px-3 py-2 w-full"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@example.com"
          />
          {emailChecked?.exists === true && !isLoggedIn && (
            <div className="text-xs text-green-600 mt-1">Account found. Please enter your password to continue.</div>
          )}
          {emailChecked?.exists === true && isLoggedIn && (
            <div className="text-xs text-green-600 mt-1">You are logged in. Please complete your details below.</div>
          )}
          {emailChecked?.exists === false && (
            <div className="text-xs text-gray-600 mt-1">We’ll create an account for you with this email (passwordless).</div>
          )}
        </div>
        {showLoginForm && (
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              className="border rounded px-3 py-2 w-full"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Enter your password"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password) {
                  onFinalize();
                }
              }}
            />
            <Button 
              onClick={onFinalize} 
              disabled={finalizing || !password}
              className="w-full mt-3"
            >
              {finalizing ? 'Logging in…' : 'Login & Continue'}
            </Button>
          </div>
        )}
        {showDetailsForm && (
          <>
            <div>
              <label className="block text-sm mb-1">First name</label>
              <input className="border rounded px-3 py-2 w-full" value={firstName} onChange={(e) => onFirstNameChange(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Last name</label>
              <input className="border rounded px-3 py-2 w-full" value={lastName} onChange={(e) => onLastNameChange(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input className="border rounded px-3 py-2 w-full" value={phone} onChange={(e) => onPhoneChange(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Address</label>
              <input className="border rounded px-3 py-2 w-full" value={address} onChange={(e) => onAddressChange(e.target.value)} />
            </div>
          </>
        )}
      </div>
      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}
      {showDetailsForm && (
        <div className="flex justify-end">
          <Button onClick={onFinalize} disabled={finalizing || !canCheckout}>
            {finalizing ? 'Processing…' : 'Complete booking'}
          </Button>
        </div>
      )}
    </div>
  );
}


