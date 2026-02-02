'use client';

import { AppointmentsList } from '@/components/client-dashboard/appointments/appointments-list';
import PageContainer from '@/components/ui/page-transition';

interface ClientDashboardProps {
  clientId: string;
}

export default function ClientDashboard({ clientId }: ClientDashboardProps) {
  return (
    <PageContainer className="container max-w-7xl py-6">
      <AppointmentsList clientId={clientId} />
    </PageContainer>
  );
}