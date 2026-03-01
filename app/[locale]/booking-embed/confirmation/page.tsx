import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useFormatter } from 'next-intl';
import { Booking } from '@/lib/types/booking';
import { formatEuroCents } from '@/lib/currency/format';
import { Badge } from '@/components/ui/badge';
import { Calendar02Icon, CheckmarkCircle03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

interface PolicyField {
  id: string;
  title: string;
  field_type: string;
  choices?: Array<{ id: string; title: string; price?: number }>;
}

function BookingConfirmationContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('Booking.confirmation');
  const format = useFormatter();
  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setError(t('errorNoId'));
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        const data = await response.json();

        if (!response.ok || !data.booking) {
          throw new Error(data.error || t('errorLoad'));
        }

        setBooking(data.booking);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorLoad'));
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  if (loading) return null;

  if (error || !booking) {
    return (
      <div className="flex items-center justify-center p-8 text-center bg-white min-h-[300px]">
        <div>
          <h1 className="text-xl font-bold text-red-600 mb-2">{t('errorTitle')}</h1>
          <p className="text-gray-600">{error || t('errorLoad')}</p>
        </div>
      </div>
    );
  }

  const service = booking.services;
  const location = booking.locations;
  const headerDate = format.dateTime(new Date(booking.start_time), { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Amsterdam' });
  const headerTime = `${format.dateTime(new Date(booking.start_time), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })} - ${format.dateTime(new Date(booking.end_time), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })}`;
  const dayName = format.dateTime(new Date(booking.start_time), { weekday: 'long', timeZone: 'Europe/Amsterdam' });

  return (
    <div className="max-w-lg mx-auto p-4 animate-in fade-in duration-500 bg-white">
      <div className="flex flex-col rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="bg-primary p-6 text-center text-white">
          <div className="inline-flex items-center justify-center rounded-full bg-white/20 mb-4 p-2">
            <HugeiconsIcon icon={CheckmarkCircle03Icon} className="w-8 h-8 text-white" />
          </div>
          <div className="text-sm font-medium opacity-90 mb-1">{t('title')}</div>
          <h1 className="text-xl font-bold capitalize">{dayName} {headerDate}</h1>
          <div className="text-lg opacity-90">{headerTime}</div>
        </div>

        <div className="p-6 bg-white space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('service')}</div>
              <div className="text-sm font-semibold text-gray-900">
                {service?.name || t('na')}
                {booking.is_twin && <Badge className="ml-2 scale-75 origin-left">Tweeling</Badge>}
              </div>
            </div>
            {location && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('location')}</div>
                <div className="text-sm font-semibold text-gray-900">{location.name}</div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-900">{t('total')}</span>
              <span className="text-xl font-bold text-primary">{formatEuroCents(booking.price_eur_cents)}</span>
            </div>
          </div>

          <div className="pt-2 text-center">
             <p className="text-xs text-gray-400">{t('bookingNumber')}: {booking.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingEmbedConfirmationPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        window.parent.postMessage({ type: 'resize', height: height + 50 }, '*');
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
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
      <div ref={containerRef} className="bg-white min-h-auto">
        <BookingConfirmationContent />
      </div>
    </Suspense>
  );
}
