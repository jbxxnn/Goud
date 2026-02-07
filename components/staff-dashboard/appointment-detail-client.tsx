'use client';

import { useState } from 'react';
import { Booking } from '@/lib/types/booking';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    Calendar02Icon,
    Clock01Icon,
    Location01Icon,
    UserIcon,
    File01Icon,
    Tick01Icon,
    AlertCircleIcon,
    ImageUploadIcon,
    ArrowLeft01Icon,
    Link01Icon
} from '@hugeicons/core-free-icons';
import { format, differenceInWeeks, differenceInDays, addDays, subDays } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { MediaSection } from './media-section';
import PageContainer, { PageItem } from '@/components/ui/page-transition';
import { useQueryClient } from '@tanstack/react-query';
import { RepeatPrescriber } from '@/components/repeat-prescriber';

interface AppointmentDetailClientProps {
    booking: any;
    currentUser: any;
    previousBookings?: any[];
}

export function AppointmentDetailClient({ booking, currentUser, previousBookings = [] }: AppointmentDetailClientProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [notes, setNotes] = useState(booking.internal_notes || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);

    // Gestational Age Calculation
    const calculateGA = () => {
        if (!booking.due_date) return null;
        const dueDate = new Date(booking.due_date);
        const today = new Date();

        // Due date is 40 weeks (280 days) from LMP roughly.
        // Days Remaining = DueDate - Today
        // Days Elapsed = 280 - Days Remaining

        const daysRemaining = differenceInDays(dueDate, today);
        const daysElapsed = 280 - daysRemaining;

        if (daysElapsed < 0) return { weeks: 0, days: 0 }; // Future conception?

        const weeks = Math.floor(daysElapsed / 7);
        const days = daysElapsed % 7;

        return { weeks, days };
    };

    const ga = calculateGA();

    const handleSaveNotes = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/bookings/${booking.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ internal_notes: notes })
            });

            if (!res.ok) throw new Error('Failed to save notes');

            toast.success('Internal notes saved');
            // Invalidate bookings list so the dashboard is fresh
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        } catch (error) {
            toast.error('Error saving notes');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <PageContainer className="container py-6 max-w-5xl mx-auto space-y-6">
            <PageItem>
                <Button variant="ghost" className="mb-2" onClick={() => router.back()}>
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Button>
            </PageItem>

            {/* Header Section */}
            <PageItem>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            {booking.users?.first_name} {booking.users?.last_name}
                            <Badge variant={
                                booking.status === 'confirmed' ? 'default' :
                                    booking.status === 'completed' ? 'default' : 'secondary'
                            }>
                                {booking.status}
                            </Badge>
                            {booking.parent_booking_id && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] px-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                    onClick={() => router.push(`/dashboard/appointments/${booking.parent_booking_id}`)}
                                >
                                    <HugeiconsIcon icon={Link01Icon} size={12} className="mr-1" />
                                    Linked to Parent Screening
                                </Button>
                            )}
                        </h1>
                        <div className="text-muted-foreground flex items-center gap-4 mt-1 text-sm">
                            <span className="flex items-center gap-1">
                                <HugeiconsIcon icon={Calendar02Icon} size={14} />
                                {format(new Date(booking.start_time), 'PPP')}
                            </span>
                            <span className="flex items-center gap-1">
                                <HugeiconsIcon icon={Clock01Icon} size={14} />
                                {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                            </span>
                            <span className="flex items-center gap-1">
                                <HugeiconsIcon icon={Location01Icon} size={14} />
                                <a href={`https://google.com/maps/search/?api=1&query=${booking.locations?.address}`} target="_blank">
                                    {booking.locations?.name}
                                </a>
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {(booking.status === 'confirmed' || booking.status === 'completed') && (
                            <RepeatPrescriber bookingId={booking.id} serviceId={booking.service_id} />
                        )}
                        {booking.status === 'confirmed' && (
                            <Button
                                disabled={isCompleting}
                                onClick={async () => {
                                    try {
                                        setIsCompleting(true);
                                        const res = await fetch(`/api/bookings/${booking.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ status: 'completed' })
                                        });
                                        if (!res.ok) throw new Error('Failed to complete');
                                        toast.success('Appointment marked as completed');
                                        queryClient.invalidateQueries({ queryKey: ['bookings'] });
                                        router.refresh();
                                    } catch (e) {
                                        toast.error('Failed to complete appointment');
                                        setIsCompleting(false);
                                    }
                                }}
                            >
                                {isCompleting ? 'Completing...' : 'Complete Appointment'}
                            </Button>
                        )}
                    </div>
                </div>
            </PageItem>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column: Patient Info */}
                <div className="space-y-6">
                    <PageItem>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Patient Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Email</div>
                                    <div>{booking.users?.email}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Phone</div>
                                    <div>{booking.users?.phone || 'N/A'}</div>
                                </div>
                                <Separator />
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Due Date</div>
                                    <div className="font-semibold">{booking.due_date ? format(new Date(booking.due_date), 'PPP') : 'Not set'}</div>
                                </div>
                                {ga && (
                                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                                        <div className="text-sm font-medium text-primary">Gestational Age</div>
                                        <div className="text-2xl font-bold text-primary">
                                            {ga.weeks}<span className="text-sm font-normal text-muted-foreground ml-1">w</span> {ga.days}<span className="text-sm font-normal text-muted-foreground ml-1">d</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <MediaSection bookingId={booking.id} />

                        {/* Previous History */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Previous Appointments</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {previousBookings && previousBookings.length > 0 ? (
                                    <div className="space-y-3">
                                        {previousBookings.map((prev: any) => (
                                            <div key={prev.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/appointments/${prev.id}`)}>
                                                <div className="space-y-1">
                                                    <div className="font-medium text-sm">{prev.services?.name}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                        <span>{format(new Date(prev.start_time), 'PPP')}</span>
                                                        <span>•</span>
                                                        <span>{prev.locations?.name}</span>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-xs">{prev.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">No previous history found.</p>
                                )}
                            </CardContent>
                        </Card>
                    </PageItem>
                </div>

                {/* Right Column: Medical View */}
                <div className="md:col-span-2 space-y-6">

                    {/* Service & Notes */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{booking.services?.name}</CardTitle>
                            <CardDescription>
                                {booking.booking_addons && booking.booking_addons.length > 0 ? (
                                    <span>Addons: {booking.booking_addons.map((a: any) => a.service_addons?.name).join(', ')}</span>
                                ) : 'Standard appointment'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Internal Notes */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <HugeiconsIcon icon={File01Icon} size={16} />
                                        Medical / Internal Notes
                                    </label>
                                    <Button size="sm" variant="ghost" onClick={handleSaveNotes} disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save Notes'}
                                    </Button>
                                </div>
                                <Textarea
                                    className="min-h-[150px] bg-yellow-50/50 border-yellow-200 focus-visible:ring-yellow-400"
                                    placeholder="Enter medical observations, measurements, or private notes here..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <HugeiconsIcon icon={AlertCircleIcon} size={12} />
                                    These notes are only visible to staff.
                                </p>
                            </div>

                        </CardContent>
                    </Card>

                    {/* Checklist (Mocked) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Protocol Checklist</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {['Verify Patient Identity', 'Consent Form Signed', 'Gestational Age Confirmed', 'Fetal Heart Rate Checked', 'Images Saved'].map((item, i) => (
                                <div key={i} className="flex items-center space-x-2">
                                    <Checkbox id={`check-${i}`} />
                                    <label
                                        htmlFor={`check-${i}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {item}
                                    </label>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </PageContainer>
    );
}
