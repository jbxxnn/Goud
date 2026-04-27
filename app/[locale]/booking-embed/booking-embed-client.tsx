'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookingProvider } from '@/components/booking/booking-context';
import { BookingFlow } from '@/components/booking/booking-flow';

export default function BookingEmbedClient() {
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('serviceId') || undefined;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        window.parent.postMessage({ type: 'resize', height: height + 100 }, '*');
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col items-center pt-4">
      <BookingProvider initialServiceId={serviceId} lockService={!!serviceId}>
        <BookingFlow />
      </BookingProvider>
    </div>
  );
}
