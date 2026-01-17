'use client';

import { useState } from 'react';
import { Booking } from '@/lib/types/booking';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    CheckmarkCircle01Icon,
    ImageUploadIcon,
    Loading03Icon
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

interface ScanCompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking | null;
    onComplete: () => void;
}

export function ScanCompletionModal({ isOpen, onClose, booking, onComplete }: ScanCompletionModalProps) {
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!booking) return null;

    const handleComplete = async () => {
        try {
            setIsSubmitting(true);

            // 1. Update booking status to 'completed'
            // 2. Save notes (if any)
            const response = await fetch(`/api/bookings/${booking.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'completed',
                    internal_notes: notes // Assuming we have this field, or just 'notes'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to complete scan');
            }

            toast.success('Scan marked as completed');
            onComplete();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update status');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUploadMedia = () => {
        // Todo: Implement media upload logic or open separate modal
        toast.info('Media upload interface would open here');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Complete Scan</DialogTitle>
                    <DialogDescription>
                        Finalize the appointment for {booking.users?.first_name} {booking.users?.last_name}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Service</Label>
                        <div className="font-medium">{booking.services?.name}</div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Internal Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Add any medical notes or observations for the record..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="resize-none"
                            rows={4}
                        />
                    </div>

                    <div className="bg-muted/30 p-4 rounded-lg border border-dashed flex items-center justify-between">
                        <div className="text-sm">
                            <span className="font-medium">Media Upload</span>
                            <p className="text-muted-foreground text-xs">Upload images and videos before completing.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleUploadMedia}>
                            <HugeiconsIcon icon={ImageUploadIcon} className="mr-2 h-4 w-4" />
                            Upload
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleComplete} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {isSubmitting ? (
                            <>
                                <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />
                                Completing...
                            </>
                        ) : (
                            <>
                                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="mr-2 h-4 w-4" />
                                Mark as Completed
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
