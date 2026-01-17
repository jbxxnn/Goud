'use client';

import { AppointmentsList } from '@/components/client-dashboard/appointments/appointments-list';

interface ClientDashboardProps {
  clientId: string;
}

export default function ClientDashboard({ clientId }: ClientDashboardProps) {
  return (
    <div className="container max-w-7xl py-6">
      <AppointmentsList clientId={clientId} />
    </div>
  );
}