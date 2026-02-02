'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageContainer, { PageItem } from '@/components/ui/page-transition';
import { Loading03Icon } from '@hugeicons/core-free-icons';

interface LeaveRequestsClientProps {
    requests: any[];
}

export function LeaveRequestsClient({ requests: initialRequests = [] }: LeaveRequestsClientProps) {
    const queryClient = useQueryClient();
    const router = useRouter();

    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['leave-requests'],
        queryFn: async () => {
            // In a real app we'd fetch from API, but for now we might be relying on props or need an endpoint
            // Assuming there is an endpoint or we just return initialRequests if no endpoint exists yet.
            // But based on typical pattern here, let's assume we fetch fresh data.
            // If no endpoint exists for listing my requests, we might stick to props or create one.
            // However, looking at handleAction, there is /api/time-off.

            const res = await fetch('/api/time-off');
            if (!res.ok) throw new Error('Failed to fetch requests');
            const data = await res.json();
            return data.data || [];
        },
        initialData: initialRequests,
    });

    const { mutate: updateStatus, isPending: isUpdating } = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: 'approved' | 'rejected' }) => {
            const res = await fetch('/api/time-off', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            if (!res.ok) throw new Error('Failed to update status');
            return res.json();
        },
        onSuccess: (_, variables) => {
            toast.success(`Request ${variables.status}`);
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
            router.refresh();
        },
        onError: () => {
            toast.error('Failed to update status');
        }
    });

    const handleAction = (id: string, status: 'approved' | 'rejected') => {
        updateStatus({ id, status });
    };

    return (
        <PageContainer className="container py-6 max-w-5xl space-y-6">
            <PageItem>
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">Leave Requests</h1>
                    <p className="text-muted-foreground">Manage time off and sick leave requests for staff.</p>
                </div>
            </PageItem>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <HugeiconsIcon icon={Loading03Icon} className="animate-spin w-8 h-8 text-primary" />
                    </div>
                ) : requests.length === 0 ? (
                    <PageItem>
                        <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                                No requests found.
                            </CardContent>
                        </Card>
                    </PageItem>
                ) : (
                    requests.map((req: any) => (
                        <PageItem key={req.id}>
                            <Card>
                                <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="font-semibold text-lg flex items-center gap-2">
                                            {req.users?.first_name} {req.users?.last_name}
                                            <Badge variant={
                                                req.status === 'approved' ? 'default' :
                                                    req.status === 'rejected' ? 'destructive' : 'secondary'
                                            } className="capitalize">
                                                {req.status}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground capitalize flex items-center gap-2">
                                            <Badge variant="outline">{req.type}</Badge>
                                            <span>•</span>
                                            <span>{format(parseISO(req.start_date), 'PPP')} - {format(parseISO(req.end_date), 'PPP')}</span>
                                        </div>
                                        {req.reason && (
                                            <div className="text-sm mt-2 p-2 bg-muted/30 rounded border">
                                                "{req.reason}"
                                            </div>
                                        )}
                                    </div>

                                    {req.status === 'pending' && (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-destructive border-destructive hover:bg-destructive/10"
                                                onClick={() => handleAction(req.id, 'rejected')}
                                                disabled={isUpdating}
                                            >
                                                <HugeiconsIcon icon={Cancel01Icon} className="mr-2 h-4 w-4" />
                                                Reject
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700"
                                                onClick={() => handleAction(req.id, 'approved')}
                                                disabled={isUpdating}
                                            >
                                                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="mr-2 h-4 w-4" />
                                                Approve
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </PageItem>
                    ))
                )}
            </div>
        </PageContainer>
    );
}
