'use client';

import { AppointmentsList } from '@/components/client-dashboard/appointments/appointments-list';
import PageContainer from '@/components/ui/page-transition';

interface MidwifeDashboardProps {
    clientId: string;
}

export default function MidwifeDashboard({ clientId }: MidwifeDashboardProps) {
    return (
        <PageContainer className="container max-w-7xl py-6">
            <AppointmentsList clientId={clientId} filterBy="client_id" />
        </PageContainer>
    );
}
