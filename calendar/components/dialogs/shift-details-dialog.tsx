"use client";

import { format, parseISO } from "date-fns";
import { Calendar, Clock, Text, User, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import ShiftModal from "@/components/shift-modal";
import { ShiftWithDetails } from "@/lib/types/shift";
import { toast } from "sonner";

import type { IEvent } from "@/calendar/interfaces";
import { useTranslations } from 'next-intl';

interface IProps {
  event: IEvent;
  children: React.ReactNode;
  onShiftDeleted?: () => void;
  onShiftUpdated?: () => void;
}

export function ShiftDetailsDialog({ event, children, onShiftDeleted, onShiftUpdated }: IProps) {
  const t = useTranslations('Shifts.dialog.details');
  const [shift, setShift] = useState<ShiftWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch shift details when dialog opens
  useEffect(() => {
    if (isDialogOpen && event.id) {
      fetchShiftDetails();
    }
  }, [isDialogOpen, event.id]);

  const fetchShiftDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shifts/${event.id}?with_details=true`);
      const data = await response.json();

      if (data.success && data.data) {
        setShift(data.data);
      } else {
        toast.error(t('loadError'));
      }
    } catch (error) {
      console.error('Error fetching shift:', error);
      toast.error(t('loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!shift?.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/shifts/${shift.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete shift');
      }

      toast.success(t('deleteSuccess'), {
        description: t('deleteSuccessDesc'),
      });

      setShowDeleteDialog(false);
      setIsDialogOpen(false);

      if (onShiftDeleted) {
        onShiftDeleted();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('deleteError');
      toast.error(t('deleteError'), {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    setIsDialogOpen(false); // Close details dialog first
    // Small delay to ensure dialog closes before opening edit modal
    setTimeout(() => {
      setIsEditOpen(true);
    }, 100);
  };

  const handleSave = () => {
    setIsEditOpen(false);
    if (onShiftUpdated) {
      onShiftUpdated();
    }
  };

  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>{event.title}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t('loading')}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <User className="mt-1 size-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t('staffMember')}</p>
                  <p className="text-sm text-muted-foreground">{event.user.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="mt-1 size-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t('startTime')}</p>
                  <p className="text-sm text-muted-foreground">{format(startDate, "MMM d, yyyy h:mm a")}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="mt-1 size-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t('endTime')}</p>
                  <p className="text-sm text-muted-foreground">{format(endDate, "MMM d, yyyy h:mm a")}</p>
                </div>
              </div>

              {shift && (
                <>
                  <div className="flex items-start gap-2">
                    <Text className="mt-1 size-4 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t('location')}</p>
                      <p className="text-sm text-muted-foreground">{shift.location_name}</p>
                    </div>
                  </div>

                  {shift.services.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Text className="mt-1 size-4 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{t('services')}</p>
                        <p className="text-sm text-muted-foreground">
                          {shift.services.map(s => s.service_name).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {shift.notes && (
                    <div className="flex items-start gap-2">
                      <Text className="mt-1 size-4 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{t('notes')}</p>
                        <p className="text-sm text-muted-foreground">{shift.notes}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={loading || !shift}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('delete')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleEdit}
              disabled={loading || !shift}
            >
              {t('edit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Shift Modal */}
      {shift && (
        <ShiftModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          shift={shift}
          onSave={handleSave}
          onDelete={() => {
            setIsEditOpen(false);
            if (onShiftDeleted) {
              onShiftDeleted();
            }
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title={t('confirmDeleteTitle')}
        description={t('confirmDeleteDesc')}
        itemName={shift ? t('itemDate', { date: format(parseISO(shift.start_time), "MMM d, yyyy") }) : undefined}
        confirmButtonText={isDeleting ? 'Deleting...' : t('delete')}
      />
    </>
  );
}

