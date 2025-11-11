'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Booking } from '@/lib/types/booking';
import { Badge } from '@/components/ui/badge';
import { formatEuroCents } from '@/lib/currency/format';
import { Button } from '@/components/ui/button';
// import { HugeiconsIcon } from '@hugeicons/react';
// import { Cancel01Icon } from '@hugeicons/core-free-icons';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onCancel?: (booking: Booking) => void;
  onDelete?: (booking: Booking) => void;
  onReschedule?: (booking: Booking) => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-NL', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('nl-NL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} hour ${remainingMinutes} minutes` : `${hours} hour`;
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive', label: string }> = {
    pending: { variant: 'secondary', label: 'Pending' },
    confirmed: { variant: 'default', label: 'Confirmed' },
    cancelled: { variant: 'destructive', label: 'Cancelled' },
  };
  const config = variants[status] || { variant: 'secondary' as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const getPaymentBadge = (status: string) => {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive', label: string }> = {
    unpaid: { variant: 'secondary', label: 'Unpaid' },
    paid: { variant: 'default', label: 'Paid' },
    refunded: { variant: 'destructive', label: 'Refunded' },
  };
  const config = variants[status] || { variant: 'secondary' as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default function BookingModal({ isOpen, onClose, booking, onCancel, onDelete, onReschedule }: BookingModalProps) {
  if (!booking) return null;

  const user = booking.users;
  const service = booking.services;
  const location = booking.locations;
  const staff = booking.staff;
  const clientName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown' : 'N/A';
  const staffName = staff ? [staff.first_name, staff.last_name].filter(Boolean).join(' ') || 'Unknown' : 'Unassigned';
  const serviceDuration = service?.duration ? formatDuration(service.duration) : 'N/A';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Booking Details</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Status & Payment */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              {getStatusBadge(booking.status)}
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Payment</div>
              {getPaymentBadge(booking.payment_status)}
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Client Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Name</div>
                <div className="font-medium">{clientName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Email</div>
                <div className="font-medium">{user?.email || 'N/A'}</div>
              </div>
              {user?.phone && (
                <div>
                  <div className="text-muted-foreground">Phone</div>
                  <div className="font-medium">{user.phone}</div>
                </div>
              )}
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Appointment Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Date</div>
                <div className="font-medium">{formatDate(booking.start_time)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Time</div>
                <div className="font-medium">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Service</div>
                <div className="font-medium">{service?.name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Duration</div>
                <div className="font-medium">{serviceDuration}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Location</div>
                <div className="font-medium">{location?.name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Staff</div>
                <div className="font-medium">{staffName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Price</div>
                <div className="font-medium">{formatEuroCents(booking.price_eur_cents)}</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Notes</h3>
              <div className="text-sm p-3 bg-muted rounded-md">
                {booking.notes}
              </div>
            </div>
          )}

          {/* Booking Metadata */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-semibold text-lg">Booking Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Booking ID</div>
                <div className="font-medium font-mono text-xs">{booking.id}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Created</div>
                <div className="font-medium">{new Date(booking.created_at).toLocaleString('nl-NL')}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Updated</div>
                <div className="font-medium">{new Date(booking.updated_at).toLocaleString('nl-NL')}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons at Bottom */}
        {(booking.status !== 'cancelled' && (onReschedule || onCancel)) || (booking.status === 'cancelled' && onDelete) ? (
          <div className="px-6 py-4 border-t flex justify-end gap-3">
            {booking.status !== 'cancelled' && (
              <>
                {onCancel && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onClose();
                      onCancel(booking);
                    }}
                    className="bg-secondary-foreground hover:bg-secondary-foreground/70"
                  >
                    {/* <HugeiconsIcon icon={Cancel01Icon} className="mr-2 h-4 w-4" /> */}
                    Cancel Appointment
                  </Button>
                )}
                {onReschedule && (
                  <Button
                    variant="default"
                    onClick={() => {
                      onClose();
                      onReschedule(booking);
                    }}
                  >
                    Reschedule
                  </Button>
                )}
              </>
            )}
            {booking.status === 'cancelled' && onDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  onClose();
                  onDelete(booking);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {/* <HugeiconsIcon icon={Cancel01Icon} className="mr-2 h-4 w-4" /> */}
                Delete Booking
              </Button>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

