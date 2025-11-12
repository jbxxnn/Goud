'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Booking } from '@/lib/types/booking';
import { formatEuroCents } from '@/lib/currency/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Calendar, MapPin, User, Clock, Euro, Mail, Download } from 'lucide-react';

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

const formatDuration = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes} minuten`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} uur ${remainingMinutes} minuten` : `${hours} uur`;
};

export default function BookingConfirmationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Boekingsgegevens laden...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Fout</h1>
          <p className="text-gray-600 mb-6">{error || 'Kon boekingsgegevens niet laden'}</p>
          <Button onClick={() => router.push('/booking')}>
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Boeking Bevestigd!</h1>
          <p className="text-gray-600">
            Uw afspraak is succesvol geboekt. Hieronder vindt u alle details.
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">Boekingsdetails</h2>
          
          <div className="space-y-4">
            {/* Service */}
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-1">Service</div>
                <div className="font-medium">{service?.name || 'N/A'}</div>
                {service?.duration && (
                  <div className="text-sm text-gray-500 mt-1">
                    Duur: {formatDuration(service.duration)}
                  </div>
                )}
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-1">Datum & Tijd</div>
                <div className="font-medium">{formatDate(booking.start_time)}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </div>
              </div>
            </div>

            {/* Location */}
            {location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-1">Locatie</div>
                  <div className="font-medium">{location.name}</div>
                </div>
              </div>
            )}

            {/* Staff */}
            {staff && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-1">Medewerker</div>
                  <div className="font-medium">
                    {[staff.first_name, staff.last_name].filter(Boolean).join(' ') || 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {/* Status Badge */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-sm text-gray-500">Status:</span>
              <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                {booking.status === 'confirmed' ? 'Bevestigd' : booking.status === 'pending' ? 'In afwachting' : 'Geannuleerd'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Euro className="w-5 h-5" />
            Prijsopgave
          </h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Basis Service</span>
              <span className="font-medium">{formatEuroCents(basePrice)}</span>
            </div>
            
            {policyTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Servicebeleid</span>
                <span className="font-medium">{formatEuroCents(policyTotal)}</span>
              </div>
            )}
            
            {addonsTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Add-ons</span>
                <span className="font-medium">{formatEuroCents(addonsTotal)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-semibold text-base border-t pt-2 mt-2">
              <span>Totaal</span>
              <span>{formatEuroCents(booking.price_eur_cents)}</span>
            </div>
          </div>
        </div>

        {/* Add-ons Details */}
        {booking.addons && booking.addons.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Gekozen Add-ons</h2>
            <div className="space-y-3">
              {booking.addons.map((addon) => (
                <div key={addon.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-md">
                  <div className="flex-1">
                    <div className="font-medium">{addon.name}</div>
                    {addon.description && (
                      <div className="text-sm text-gray-600 mt-1">{addon.description}</div>
                    )}
                    {addon.quantity > 1 && (
                      <div className="text-sm text-gray-500 mt-1">Aantal: {addon.quantity}</div>
                    )}
                  </div>
                  <div className="font-medium ml-4">{formatEuroCents(addon.price_eur_cents * addon.quantity)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Policy Responses */}
        {booking.policy_answers && Array.isArray(booking.policy_answers) && booking.policy_answers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Servicebeleid Antwoorden</h2>
            <div className="space-y-2">
              {booking.policy_answers.map((answer: { fieldId?: string; value?: unknown; priceEurCents?: number }, index: number) => (
                <div key={answer.fieldId || index} className="p-3 bg-gray-50 rounded-md text-sm">
                  <div className="font-medium mb-1">Veld ID: {answer.fieldId || 'N/A'}</div>
                  <div className="text-gray-600">
                    Antwoord: {Array.isArray(answer.value) ? answer.value.join(', ') : String(answer.value || 'N/A')}
                  </div>
                  {answer.priceEurCents && answer.priceEurCents > 0 && (
                    <div className="text-gray-600 mt-1">
                      Extra kosten: {formatEuroCents(answer.priceEurCents)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client Information */}
        {user && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Uw Gegevens
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Naam:</span>{' '}
                <span className="font-medium">
                  {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">E-mail:</span>{' '}
                <span className="font-medium">{user.email}</span>
              </div>
              {user.phone && (
                <div>
                  <span className="text-gray-500">Telefoon:</span>{' '}
                  <span className="font-medium">{user.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Volgende Stappen</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>U ontvangt een bevestigingsmail op {user?.email || 'uw e-mailadres'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Voeg de afspraak toe aan uw agenda met de onderstaande knoppen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Als u vragen heeft, neem dan contact met ons op</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => window.open(generateCalendarLink(), '_blank')}
            variant="outline"
            className="flex-1"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Toevoegen aan Google Calendar
          </Button>
          <Button
            onClick={downloadICal}
            variant="outline"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Download iCal Bestand
          </Button>
          <Button
            onClick={() => router.push('/booking')}
            className="flex-1"
          >
            Nieuwe Boeking
          </Button>
        </div>

        {/* Booking ID */}
        <div className="text-center mt-8 text-sm text-gray-500">
          Boekingsnummer: <span className="font-mono">{booking.id}</span>
        </div>
      </div>
    </div>
  );
}

