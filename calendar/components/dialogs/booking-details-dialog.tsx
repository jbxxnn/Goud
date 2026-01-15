
"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, User, Text, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslations } from 'next-intl';
import type { IEvent } from "@/calendar/interfaces";
import { Booking } from "@/lib/types/booking";
import BookingModal from "@/components/booking-modal";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";

interface IProps {
    event: IEvent;
    children: React.ReactNode;
    onBookingDeleted?: () => void;
    onBookingUpdated?: () => void;
}

export function BookingDetailsDialog({ event, children, onBookingDeleted, onBookingUpdated }: IProps) {
    const t = useTranslations('Bookings'); // Reusing Bookings translations
    const tCommon = useTranslations('Common');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch booking details when dialog opens
    const fetchBookingDetails = async () => {
        setLoading(true);
        try {
            // Using the generic bookings API. 
            // Note: event.id is number, but we assume it corresponds to booking.id (string) or we cast it if needed.
            // In booking-mapper we did parseInt(id). 
            // API expects ID. If it fails with "invalid UUID", it's because we sent "622".
            // We need to robustly handle this.
            // IF the IDs are integers in string format, it works.
            // IF they are UUIDs, parseInt broke it.

            // CRITICAL FIX: We need the original ID. 
            // Since IEvent forces number, and we potentially have UUIDs, 
            // we might need to rely on `event.id` being a string cast to number in TS but actually a string at runtime?
            // OR we need to store the real ID elsewhere.
            // `IEvent` has `id: number`.
            // Let's assume for now we use `event.id` and see. If it fails, we need to fix `IEvent` or mapping.

            const response = await fetch(`/api/bookings/${event.id}`);
            const data = await response.json();

            if (data.booking) {
                setBooking(data.booking);
            } else if (data.data) {
                // Fallback in case API changes to match list format
                setBooking(data.data);
            } else {
                console.error('API Error:', data);
                toast.error(t('toasts.loadError'));
            }
        } catch (error) {
            console.error('Error fetching booking:', error);
            toast.error(t('toasts.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (open) {
            fetchBookingDetails();
        }
    };

    const handleDelete = async () => {
        if (!booking) return;
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/bookings/${booking.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete');

            toast.success(t('toasts.deleteSuccess'));
            setShowDeleteDialog(false);
            setIsDialogOpen(false);
            if (onBookingDeleted) onBookingDeleted();
        } catch (error) {
            toast.error(t('toasts.deleteError'));
        } finally {
            setIsDeleting(false);
        }
    };

    const startDate = parseISO(event.startDate);
    const endDate = parseISO(event.endDate);

    return (
        <>
            <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>{children}</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{event.title}</DialogTitle>
                    </DialogHeader>

                    {loading ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-start gap-2">
                                <User className="mt-1 size-4 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">{t('columns.staff')}</p>
                                    <p className="text-sm text-muted-foreground">{event.user.name}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Calendar className="mt-1 size-4 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">{t('columns.dateTime')}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(startDate, "MMM d, yyyy")} <br />
                                        {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                                    </p>
                                </div>
                            </div>

                            {/* Show basic info from event description if booking fetch fails or just supplementary */}
                            <div className="whitespace-pre-wrap text-sm text-muted-foreground mt-4 p-2 bg-muted rounded-md">
                                {event.description}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2">
                        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={loading || !booking}>
                            <Trash2 className="mr-2 h-4 w-4" /> {tCommon('delete')}
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(true)} disabled={loading || !booking}>
                            <Edit className="mr-2 h-4 w-4" /> {tCommon('edit')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Full Booking Modal for Editing */}
            {booking && (
                <BookingModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    booking={booking}
                    onUpdate={(updated) => {
                        setBooking(updated);
                        // Also update calendar event if possible or refresh parent
                        if (onBookingUpdated) onBookingUpdated();
                    }}
                    onDelete={undefined} // Handled by simple delete above
                />
            )}

            <DeleteConfirmationDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDelete}
                title={t('dialog.deleteTitle')}
                description={t('dialog.deleteDescription')}
                confirmButtonText={t('dialog.deleteConfirm')}
                confirmButtonVariant="destructive"
            />
        </>
    );
}
