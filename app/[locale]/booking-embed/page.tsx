'use client';

import { useSearchParams } from 'next/navigation';
import { BookingProvider } from "@/components/booking/booking-context";
import { BookingFlow } from "@/components/booking/booking-flow";

export default function BookingEmbedPage() {
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('serviceId') || undefined;

  return (
    <div className="min-h-[50vh] flex flex-col items-center p-5">
      <BookingProvider initialServiceId={serviceId} lockService={!!serviceId}>
        <BookingFlow />
      </BookingProvider>
    </div>
  );
}
