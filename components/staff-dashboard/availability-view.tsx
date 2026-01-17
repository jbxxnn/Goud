'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar01Icon, Loading03Icon, Location01Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import { ShiftWithDetails, ShiftsWithDetailsResponse } from '@/lib/types/shift';
import { format, parseISO, addDays, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { expandRecurringShifts } from '@/lib/utils/expand-recurring-shifts';

import { TimeOffModal } from './time-off-modal';

interface AvailabilityViewProps {
    staffId: string;
}

interface TimeOffRequest {
    id: string;
    start_date: string;
    end_date: string;
    type: string;
    status: string;
}

export function AvailabilityView({ staffId }: AvailabilityViewProps) {
    const [shifts, setShifts] = useState<ShiftWithDetails[]>([]);
    const [requests, setRequests] = useState<TimeOffRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const today = new Date();
            const startOfToday = new Date(today.setHours(0, 0, 0, 0));
            const thirtyDaysLater = addDays(today, 30);

            // Fetch Shifts
            const params = new URLSearchParams({
                staff_id: staffId,
                start_date: startOfToday.toISOString(),
                end_date: thirtyDaysLater.toISOString(),
                with_details: 'true',
                limit: '100'
            });

            const [shiftsRes, requestsRes] = await Promise.all([
                fetch(`/api/shifts?${params}`),
                fetch(`/api/time-off?staffId=${staffId}`)
            ]);

            const shiftsResult: ShiftsWithDetailsResponse = await shiftsRes.json();
            const requestsResult = await requestsRes.json();

            if (shiftsResult.success) {
                const rawShifts = shiftsResult.data || [];
                const expanded = expandRecurringShifts(rawShifts, startOfToday, thirtyDaysLater);
                const sorted = expanded.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                setShifts(sorted);
            }

            if (requestsResult.success) {
                setRequests(requestsResult.data || []);
            }

        } catch (error) {
            console.error(error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [staffId]);

    useEffect(() => {
        if (staffId) {
            fetchData();
        }
    }, [fetchData, staffId]);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-6 w-6 text-muted-foreground" />
            </div>
        );
    }

    // Group by Date ... (existing logic)
    const grouped: { [key: string]: ShiftWithDetails[] } = {};
    shifts.forEach(shift => {
        const dateKey = format(parseISO(shift.start_time), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(shift);
    });

    return (
        <div className="space-y-6">
            {/* Header w/ Action */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">My Schedule</h2>
                <TimeOffModal staffId={staffId} onSuccess={fetchData} />
            </div>

            {/* Requests Status */}
            {requests.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Leave Requests</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {requests.slice(0, 3).map(req => (
                            <div key={req.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded border">
                                <div>
                                    <span className="font-medium capitalize">{req.type}</span>
                                    <span className="text-muted-foreground mx-2">•</span>
                                    <span>{format(parseISO(req.start_date), 'MMM d')} - {format(parseISO(req.end_date), 'MMM d')}</span>
                                </div>
                                <Badge variant={
                                    req.status === 'approved' ? 'default' :
                                        req.status === 'rejected' ? 'destructive' : 'secondary'
                                }>
                                    {req.status}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Shifts List */}
            {shifts.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        No shifts scheduled for the next 30 days.
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-none shadow-none bg-transparent">
                    <CardContent className="p-0 px-4 space-y-6">
                        {Object.keys(grouped).map(dateKey => {
                            const dayShifts = grouped[dateKey];
                            const dateObj = parseISO(dayShifts[0].start_time);

                            return (
                                <div key={dateKey} className="space-y-3">
                                    <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                        {format(dateObj, 'EEEE, MMMM d')}
                                    </h3>
                                    <div className="space-y-3">
                                        {dayShifts.map(shift => (
                                            <div key={`${shift.id}-${shift.start_time}`} className="flex items-center justify-between p-0 bg-card border rounded-lg shadow-md hover:shadow-sm transition-shadow max-w-2xl" style={{ borderRadius: '0.3rem' }}>
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-secondary/20 rounded-lg text-secondary-foreground font-semibold text-sm w-[100px] text-center flex flex-col items-center justify-center">
                                                        <span>{format(parseISO(shift.start_time), 'HH:mm')}</span>
                                                        <span className="text-xs opacity-70">to {format(parseISO(shift.end_time), 'HH:mm')}</span>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium flex items-center gap-2">
                                                            {shift.location_name}
                                                            {shift.is_recurring && <Badge variant="outline" className="text-[10px] h-5 px-1">Recurring</Badge>}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {shift.location_address || 'No address provided'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
