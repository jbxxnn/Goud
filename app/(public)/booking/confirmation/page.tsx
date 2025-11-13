'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Booking } from '@/lib/types/booking';
import { formatEuroCents } from '@/lib/currency/format';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle03Icon, Calendar02Icon, DashboardSquare02Icon } from '@hugeicons/core-free-icons';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-NL', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('nl-NL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};


interface PolicyField {
  id: string;
  title: string;
  field_type: string;
  choices?: Array<{ id: string; title: string; price?: number }>;
}

function BookingConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [policyFields, setPolicyFields] = useState<Record<string, PolicyField>>({});

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
      } catch (err) {
        console.error('Error checking auth:', err);
        setIsLoggedIn(false);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    if (!bookingId) {
      setError('Geen boekings-ID gevonden');
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        const data = await response.json();
        
        if (!response.ok || !data.booking) {
          throw new Error(data.error || 'Kon boekingsgegevens niet laden');
        }
        
        setBooking(data.booking);
        
        // Fetch policy fields for the service
        if (data.booking.service_id) {
          try {
            const policyResponse = await fetch(`/api/services/${data.booking.service_id}`);
            const policyData = await policyResponse.json();
            
            // The API returns { success: true, data: {...} } or { service: {...} }
            const service = policyData.data || policyData.service;
            if (service?.policy_fields && Array.isArray(service.policy_fields)) {
              const fieldsMap: Record<string, PolicyField> = {};
              service.policy_fields.forEach((field: PolicyField & { 
                service_policy_field_choices?: Array<{ id: string; title: string; price?: number }>;
                choices?: Array<{ id: string; title: string; price?: number }>;
              }) => {
                if (field.id && field.title) {
                  // Get choices from either field.choices or field.service_policy_field_choices
                  const choices = field.choices || field.service_policy_field_choices || [];
                  fieldsMap[field.id] = {
                    id: field.id,
                    title: field.title,
                    field_type: field.field_type,
                    choices: choices,
                  };
                }
              });
              setPolicyFields(fieldsMap);
            }
          } catch {
            // Silently handle error - policy fields are optional
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kon boekingsgegevens niet laden');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const generateCalendarLink = () => {
    if (!booking) return '';
    
    const start = new Date(booking.start_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(booking.end_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const serviceName = booking.services?.name || 'Afspraak';
    const location = booking.locations?.name || '';
    const description = `Service: ${serviceName}${location ? `\\nLocatie: ${location}` : ''}`;
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: serviceName,
      dates: `${start}/${end}`,
      details: description,
      location: location,
    });
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const downloadICal = () => {
    if (!booking) return;
    
    const start = new Date(booking.start_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(booking.end_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const serviceName = booking.services?.name || 'Afspraak';
    const location = booking.locations?.name || '';
    const description = `Service: ${serviceName}${location ? `\\nLocatie: ${location}` : ''}`;
    
    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Goudecho//Booking System//NL',
      'BEGIN:VEVENT',
      `UID:${booking.id}@goudecho.nl`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${serviceName}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `booking-${booking.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-gray-900 mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <HugeiconsIcon icon={Calendar02Icon} className="w-6 h-6 text-gray-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 px-4">
        <div className="text-center max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Fout</h1>
          <p className="text-gray-600 mb-8 text-lg leading-relaxed">{error || 'Kon boekingsgegevens niet laden'}</p>
          <Button 
            onClick={() => router.push('/booking')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-6 text-base shadow-lg"
          >
            Terug naar boekingen
          </Button>
        </div>
      </div>
    );
  }

  const user = booking.users;
  const service = booking.services;
  const location = booking.locations;
  const staff = booking.staff;
  
  const addonsTotal = (booking.addons || []).reduce((sum, addon) => sum + (addon.price_eur_cents * addon.quantity), 0);
  const policyTotal = (() => {
    if (!booking.policy_answers || !Array.isArray(booking.policy_answers)) return 0;
    return booking.policy_answers.reduce((sum: number, answer: { priceEurCents?: number }) => {
      return sum + (answer.priceEurCents || 0);
    }, 0);
  })();
  const basePrice = booking.price_eur_cents - addonsTotal - policyTotal;

  // Format date for header display
  const headerDate = formatDate(booking.start_time);
  const headerTime = `${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`;
  const dayName = new Date(booking.start_time).toLocaleDateString('nl-NL', { weekday: 'long' });

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 mb-6">
            <HugeiconsIcon icon={CheckmarkCircle03Icon} className="w-10 h-10 text-primary" />
          </div>
          <div className="text-sm font-medium text-gray-500 mb-2">Boeking Bevestigd</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            {dayName} {headerDate}
          </h1>
          <div className="text-lg text-gray-600 font-medium">{headerTime}</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => window.open(generateCalendarLink(), '_blank')}
              variant="outline"
              className="border-none bg-transparent hover:bg-transparent h-auto text-primary"
            >
              Toevoegen aan agenda
            </Button>
            <Button
              onClick={downloadICal}
              variant="outline"
              className="border-none bg-transparent hover:bg-transparent h-auto text-primary"
            >
              Download iCal
            </Button>
          </div>
        {/* Main Card */}
        <div className="bg-white max-w-lg w-full mx-auto rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
          {/* Booking Details Section */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-20 justify-center">
              {/* Service */}
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-500 mb-1">Service</div>
                  <div className="text-base font-semibold text-gray-900">{service?.name || 'N/A'}</div>
                  {/* {service?.duration && (
                    <div className="text-sm text-gray-500 mt-1">
                      {formatDuration(service.duration)}
                    </div>
                  )} */}
                </div>
              </div>

              {/* Location */}
              {location && (
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-500 mb-1">Locatie</div>
                    <div className="text-base font-semibold text-gray-900">{location.name}</div>
                  </div>
                </div>
              )}

              {/* Staff */}
              {staff && (
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-500 mb-1">Medewerker</div>
                    <div className="text-base font-semibold text-gray-900">
                      {[staff.first_name, staff.last_name].filter(Boolean).join(' ') || 'N/A'}
                    </div>
                  </div>
                </div>
              )}
            </div>
           
          </div>

          {/* Price Breakdown */}
          <div className="p-6 bg-gray-50/50 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Prijsopgave</h3>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Basis Service</span>
                <span className="font-semibold text-gray-900">{formatEuroCents(basePrice)}</span>
              </div>
              
              {policyTotal > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Servicebeleid</span>
                  <span className="font-semibold text-gray-900">{formatEuroCents(policyTotal)}</span>
                </div>
              )}
              
              {addonsTotal > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Add-ons</span>
                  <span className="font-semibold text-gray-900">{formatEuroCents(addonsTotal)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-200">
                <span className="text-base font-semibold text-gray-900">Totaal</span>
                <span className="text-xl font-bold text-primary">{formatEuroCents(booking.price_eur_cents)}</span>
              </div>
            </div>
          </div>

          {/* Add-ons Details */}
          {booking.addons && booking.addons.length > 0 && (
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Gekozen Add-ons</h3>
              <div className="space-y-3">
                {booking.addons.map((addon) => (
                  <div key={addon.id} className="flex justify-between items-start py-2">
                    <div className="flex-1 pr-4">
                      <div className="text-sm font-semibold text-gray-900">{addon.name}</div>
                      {addon.description && (
                        <div className="text-xs text-gray-500 mt-0.5">{addon.description}</div>
                      )}
                      {addon.quantity > 1 && (
                        <div className="text-xs text-gray-500 mt-1">Aantal: {addon.quantity}</div>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">{formatEuroCents(addon.price_eur_cents * addon.quantity)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policy Responses */}
          {booking.policy_answers && (
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Servicebeleid Antwoorden</h3>
              <div className="space-y-3">
                {(() => {
                  // Handle both array and object formats
                  let answers: Array<{ fieldId?: string; field_id?: string; value?: unknown; priceEurCents?: number }> = [];
                  
                  if (Array.isArray(booking.policy_answers)) {
                    answers = booking.policy_answers;
                  } else if (typeof booking.policy_answers === 'object' && booking.policy_answers !== null) {
                    // Convert object format { fieldId: { value, priceEurCents } } to array
                    answers = Object.entries(booking.policy_answers).map(([fieldId, data]: [string, unknown]) => {
                      const dataObj = data as { value?: unknown; priceEurCents?: number; price_eur_cents?: number } | unknown;
                      let priceEurCents: number | undefined = undefined;
                      if (typeof dataObj === 'object' && dataObj !== null) {
                        if ('priceEurCents' in dataObj && typeof dataObj.priceEurCents === 'number') {
                          priceEurCents = dataObj.priceEurCents;
                        } else if ('price_eur_cents' in dataObj && typeof dataObj.price_eur_cents === 'number') {
                          priceEurCents = dataObj.price_eur_cents;
                        }
                      }
                      return {
                        fieldId,
                        value: (typeof dataObj === 'object' && dataObj !== null && 'value' in dataObj) ? dataObj.value : dataObj,
                        priceEurCents,
                      };
                    });
                  }
                  
                  if (answers.length === 0) return null;
                  
                  return answers.map((answer: { fieldId?: string; field_id?: string; value?: unknown; priceEurCents?: number }, index: number) => {
                    // Handle both fieldId and field_id formats
                    const fieldId = answer.fieldId || answer.field_id;
                    const field = fieldId ? policyFields[fieldId] : null;
                    const questionText = field?.title || fieldId || 'Onbekend veld';
                    
                    // Format the answer value
                    let answerText = 'N/A';
                    const rawValue = answer.value;
                    
                    if (rawValue !== undefined && rawValue !== null) {
                      if (Array.isArray(rawValue)) {
                        // Handle array of values (for multi_choice fields)
                        if (field?.field_type === 'multi_choice' && field.choices && rawValue.length > 0) {
                          // Map UUIDs to choice titles
                          const choiceTitles = rawValue.map((val: unknown) => {
                            const valStr = String(val);
                            // Check if it's a UUID
                            if (valStr.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                              const choice = field.choices!.find((c: { id: string }) => c.id === valStr);
                              return choice?.title || valStr;
                            }
                            return valStr;
                          });
                          answerText = choiceTitles.join(', ');
                        } else {
                          // Not a multi_choice or no choices, just join the array
                          answerText = rawValue.map((v: unknown) => String(v)).join(', ');
                        }
                      } else if (typeof rawValue === 'boolean') {
                        answerText = rawValue ? 'Ja' : 'Nee';
                      } else if (typeof rawValue === 'string' && rawValue.length > 0) {
                        // Check if it's a UUID (36 chars with dashes)
                        if (rawValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                          // It's a UUID - might be a choice ID, try to find the choice title
                          if (field?.field_type === 'multi_choice' && field.choices) {
                            const choice = field.choices.find((c: { id: string }) => c.id === rawValue);
                            answerText = choice?.title || rawValue;
                          } else {
                            answerText = rawValue;
                          }
                        } else {
                          answerText = rawValue;
                        }
                      } else if (typeof rawValue === 'number') {
                        answerText = String(rawValue);
                      } else {
                        answerText = String(rawValue);
                      }
                    }
                    
                    return (
                      <div key={fieldId || index} className="py-2">
                        <div className="text-xs font-medium text-gray-500 mb-1">{questionText}</div>
                        <div className="text-sm text-gray-900 font-medium">{answerText}</div>
                        {answer.priceEurCents && answer.priceEurCents > 0 && (
                          <div className="text-xs text-gray-600 mt-1">
                            Extra kosten: {formatEuroCents(answer.priceEurCents)}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Client Information */}
          {user && (
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Uw Gegevens</h3>
              </div>
              <div className="flex items-center gap-4 justify-between">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Naam</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">E-mail</div>
                  <div className="text-sm font-semibold text-gray-900 break-all">{user.email}</div>
                </div>
                {user.phone && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Telefoon</div>
                    <div className="text-sm font-semibold text-gray-900">{user.phone}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="p-6 bg-gray-50/50 flex items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
             <Button
              onClick={() => router.push('/booking')}
              variant={isLoggedIn ? "outline" : "default"}
              className={`flex-1 h-11 font-semibold ${
                isLoggedIn 
                  ? 'border-gray-300 hover:bg-gray-50' 
                  : 'bg-primary hover:bg-primary/90 text-white'
              }`}
            >
              Nieuwe Boeking
            </Button>
            {isLoggedIn && (
              <Button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold h-11"
              >
                <HugeiconsIcon icon={DashboardSquare02Icon} className="w-4 h-4 mr-2" />
                Naar Dashboard
              </Button>
            )}
          </div>
          </div>
        </div>

        {/* Booking ID */}
        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
            <span className="text-xs font-medium text-gray-500">Boekingsnummer:</span>
            <span className="font-mono font-semibold text-gray-900 text-sm">{booking.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-gray-900 mx-auto mb-6"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <HugeiconsIcon icon={Calendar02Icon} className="w-6 h-6 text-gray-400 animate-pulse" />
              </div>
            </div>
            <p className="text-gray-700 font-medium text-lg">Laden...</p>
          </div>
        </div>
      }
    >
      <BookingConfirmationContent />
    </Suspense>
  );
}

