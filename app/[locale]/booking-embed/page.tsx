import { Suspense } from 'react';
import { Calendar02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import BookingEmbedClient from './booking-embed-client';

function BookingEmbedFallback() {
  return (
    <div className="flex flex-col items-center pt-4 px-4">
      <div className="w-full max-w-lg rounded-md bg-white/90 shadow-2xl shadow-black/5 backdrop-blur-xl">
        <div className="space-y-6 px-6 py-12">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
              <div className="absolute inset-0 flex items-center justify-center">
                <HugeiconsIcon icon={Calendar02Icon} className="h-6 w-6 animate-pulse text-gray-400" />
              </div>
            </div>
            <p className="text-lg font-semibold text-gray-900">Loading booking flow...</p>
            <p className="mt-1 text-sm text-gray-500">Please wait while the scheduler loads.</p>
          </div>
          <div className="space-y-3">
            <div className="h-4 w-40 animate-pulse rounded-full bg-gray-200" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-gray-100" />
            <div className="h-24 w-full animate-pulse rounded-2xl bg-gray-50" />
            <div className="h-11 w-full animate-pulse rounded-full bg-gray-900/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingEmbedPage() {
  return (
    <Suspense fallback={<BookingEmbedFallback />}>
      <BookingEmbedClient />
    </Suspense>
  );
}
