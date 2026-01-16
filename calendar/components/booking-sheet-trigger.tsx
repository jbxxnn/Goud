"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import type { IEvent } from "@/calendar/interfaces";
import { Booking } from "@/lib/types/booking";
import BookingModal from "@/components/booking-modal";
import BookingRescheduleModal from "@/components/booking-reschedule-modal";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Slot } from "@radix-ui/react-slot";

interface IProps {
    event: IEvent;
    children: React.ReactNode;
    onBookingDeleted?: () => void;
    onBookingUpdated?: () => void;
}

export function BookingSheetTrigger({ event, children, onBookingDeleted, onBookingUpdated }: IProps) {
    const t = useTranslations('Bookings');
    const tDialog = useTranslations('dialog'); // We need to check correct namespace or use props. BookingsClient uses 'Bookings' namespace then t('dialog.xxx')

    // State for the sheet
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(false);

    // State for delete/cancel confirmation
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); // Used for loading state
    const [isDeleteMode, setIsDeleteMode] = useState(true); // true for delete, false for cancel

    // State for reschedule
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);

    const fetchBookingDetails = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/bookings/${event.id}`);
            const data = await response.json();

            if (data.booking) {
                setBooking(data.booking);
            } else if (data.data) {
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

    const handleOpen = () => {
        setIsSheetOpen(true);
        fetchBookingDetails();
    };

    const handleConfirmAction = async () => {
        if (!booking) return;
        setIsDeleting(true);
        try {
            if (isDeleteMode) {
                // DELETE
                const response = await fetch(`/api/bookings/${booking.id}`, {
                    method: 'DELETE',
                });

                if (!response.ok) throw new Error('Failed to delete');

                toast.success(t('toasts.deleteSuccess'));
                setShowDeleteDialog(false);
                setIsSheetOpen(false);
                if (onBookingDeleted) onBookingDeleted();
            } else {
                // CANCEL
                const response = await fetch(`/api/bookings/${booking.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'cancelled' }),
                });

                if (!response.ok) throw new Error('Failed to cancel');

                toast.success(t('toasts.cancelSuccess'));
                setShowDeleteDialog(false);
                // We keep sheet open, close it, or refresh?
                // BookingsClient refreshes list.
                // Here we close sheet.
                setIsSheetOpen(false);
                if (onBookingUpdated) onBookingUpdated();
            }
        } catch (error) {
            toast.error(isDeleteMode ? t('toasts.deleteError') : t('toasts.cancelError'));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleReschedule = async (
        bookingId: string,
        newStartTime: string,
        newEndTime: string,
        locationId: string,
        staffId: string,
        shiftId: string
    ) => {
        try {
            const response = await fetch(`/api/bookings/${bookingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    start_time: newStartTime,
                    end_time: newEndTime,
                    location_id: locationId,
                    staff_id: staffId,
                    shift_id: shiftId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to reschedule booking');
            }

            // onBookingUpdated usually triggers a refresh of events
            if (onBookingUpdated) onBookingUpdated();

            // We should also refresh the booking details if the sheet remains open
            // But typically modal closes.
            // If RescheduleModal was open, it closes itself on success (if using BookingRescheduleModal component correctly? No, it calls onReschedule then logic handles it.)
            // Check BookingRescheduleModal: it calls onReschedule then toast success then onClose.
            // So we don't need to do anything else here other than refresh events and maybe close the sheet?
            // If the sheet stays open, it shows OLD date. That's bad.
            // So we should verify if BookingRescheduleModal works well with Sheet open.
            // If we reschedule, the event date changes.
            // We should probably close the main sheet too, or re-fetch.
            setIsSheetOpen(false);

        } catch (err) {
            // Error already handled inside BookingRescheduleModal? No, it catches it there?
            // Wait, BookingRescheduleModal implementation (checked previously) catches error inside handleReschedule wrapper?
            // Yes: 
            // try { await onReschedule(...) ... } catch(err) { toast.error(...) }
            // So we just need to throw if it fails, or not even try/catch here if we rely on response.ok throw
            throw err;
        }
    };

    const handleComplete = async (booking: Booking) => {
        try {
            const response = await fetch(`/api/bookings/${booking.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' }),
            });

            if (!response.ok) throw new Error('Failed to complete booking');

            toast.success('Booking completed');
            setIsSheetOpen(false);
            if (onBookingUpdated) onBookingUpdated();
        } catch (error) {
            toast.error('Failed to update booking');
        }
    };

    return (
        <>
            {/* 
              Using Slot to merge props onto the child element (the event card).
              This mimics how DialogTrigger asChild works.
            */}
            <Slot onClick={handleOpen}>
                {children}
            </Slot>

            {/* The Sheet (BookingModal) */}
            {/* The Sheet (BookingModal) */}
            <BookingModal
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                booking={booking}
                onUpdate={(updated) => {
                    setBooking(updated);
                    if (onBookingUpdated) onBookingUpdated();
                }}
                onDelete={(bookingToDelete) => {
                    // Check if cancelled. If so, hard delete.
                    // But logic for 'cancelled' check is inside BookingModal?
                    // BookingModal logic:
                    // if (booking.status === 'cancelled') -> Call onDelete
                    // if (booking.status !== 'cancelled') -> Call onCancel
                    // But wait, BookingModal prop onCancel is for cancelling logic.
                    // BookingModal prop onDelete is for hard delete logic.
                    setIsDeleteMode(true);
                    setShowDeleteDialog(true);
                }}
                onCancel={() => {
                    // Soft delete / cancel
                    setIsDeleteMode(false);
                    setShowDeleteDialog(true);
                }}
                onReschedule={() => {
                    setReschedulingBooking(booking);
                    setIsRescheduleModalOpen(true);
                }}
                onComplete={handleComplete}
            />

            <BookingRescheduleModal
                isOpen={isRescheduleModalOpen}
                onClose={() => {
                    setIsRescheduleModalOpen(false);
                    setReschedulingBooking(null);
                }}
                booking={reschedulingBooking}
                onReschedule={handleReschedule}
            />

            <DeleteConfirmationDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleConfirmAction}
                title={isDeleteMode ? t('dialog.deleteTitle') : t('dialog.cancelTitle')}
                description={isDeleteMode ? t('dialog.deleteDescription') : t('dialog.cancelDescription')}
                confirmButtonText={isDeleteMode ? t('dialog.deleteConfirm') : t('dialog.cancelConfirm')}
                confirmButtonVariant={isDeleteMode ? "destructive" : "default"}
            />
        </>
    );
}
