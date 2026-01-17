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

interface LeaveRequestsClientProps {
    requests: any[];
}

export function LeaveRequestsClient({ requests: initialRequests }: LeaveRequestsClientProps) {
    const router = useRouter();
    const [requests, setRequests] = useState(initialRequests);
    const [processing, setProcessing] = useState<string | null>(null);

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        setProcessing(id);
        try {
            const res = await fetch('/api/time-off', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });

            if (!res.ok) throw new Error('Failed to update status');

            setRequests(prev => prev.map(req =>
                req.id === id ? { ...req, status } : req
            ));
            toast.success(`Request ${status}`);
            router.refresh();
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="container py-6 max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Leave Requests</h1>
                <p className="text-muted-foreground">Manage time off and sick leave requests for staff.</p>
            </div>

            <div className="space-y-4">
                {requests.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No requests found.
                        </CardContent>
                    </Card>
                ) : (
                    requests.map(req => (
                        <Card key={req.id}>
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
                                            disabled={!!processing}
                                        >
                                            <HugeiconsIcon icon={Cancel01Icon} className="mr-2 h-4 w-4" />
                                            Reject
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                            onClick={() => handleAction(req.id, 'approved')}
                                            disabled={!!processing}
                                        >
                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="mr-2 h-4 w-4" />
                                            Approve
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
