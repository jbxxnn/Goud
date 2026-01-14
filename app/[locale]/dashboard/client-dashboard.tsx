'use client';

import BookingsClient from './bookings/bookings-client';

interface ClientDashboardProps {
  clientId: string;
}

export default function ClientDashboard({ clientId }: ClientDashboardProps) {
  return (
    <BookingsClient 
      initialBookings={[]}
      initialPagination={{
        page: 1,
        totalPages: 1
      }}
      clientId={clientId}
    />
  );
}