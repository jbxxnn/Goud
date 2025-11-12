'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Booking } from '@/lib/types/booking';
import { Badge } from '@/components/ui/badge';
import { formatEuroCents } from '@/lib/currency/format';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
// import { HugeiconsIcon } from '@hugeicons/react';
// import { Cancel01Icon } from '@hugeicons/core-free-icons';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onCancel?: (booking: Booking) => void;
  onDelete?: (booking: Booking) => void;
  onReschedule?: (booking: Booking) => void;
  onUpdate?: (booking: Booking) => void;
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

export default function BookingModal({ isOpen, onClose, booking, onCancel, onDelete, onReschedule, onUpdate }: BookingModalProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  useEffect(() => {
    if (booking) {
      setNotesValue(booking.notes || '');
    }
  }, [booking]);

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
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Price Breakdown</h3>
            <div className="space-y-2 text-sm">
              {/* Calculate base service price */}
              {(() => {
                const addonsTotal = (booking.addons || []).reduce((sum, addon) => sum + (addon.price_eur_cents * addon.quantity), 0);
                const policyTotal = (() => {
                  if (!booking.policy_answers || !Array.isArray(booking.policy_answers)) return 0;
                  return booking.policy_answers.reduce((sum: number, answer: { priceEurCents?: number }) => {
                    return sum + (answer.priceEurCents || 0);
                  }, 0);
                })();
                const basePrice = booking.price_eur_cents - addonsTotal - policyTotal;
                
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Service</span>
                      <span className="font-medium">{formatEuroCents(basePrice)}</span>
                    </div>
                    
                    {/* Policy Extras */}
                    {policyTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Policy</span>
                        <span className="font-medium">{formatEuroCents(policyTotal)}</span>
                      </div>
                    )}
                    
                    {/* Add-ons */}
                    {addonsTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Add-ons</span>
                        <span className="font-medium">{formatEuroCents(addonsTotal)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                      <span>Total</span>
                      <span>{formatEuroCents(booking.price_eur_cents)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Add-ons Details */}
          {booking.addons && booking.addons.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Selected Add-ons</h3>
              <div className="space-y-2">
                {booking.addons.map((addon) => (
                  <div key={addon.id} className="flex justify-between items-start p-3 bg-muted rounded-md text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{addon.name}</div>
                      {addon.description && (
                        <div className="text-muted-foreground text-xs mt-1">{addon.description}</div>
                      )}
                      {addon.quantity > 1 && (
                        <div className="text-muted-foreground text-xs mt-1">Quantity: {addon.quantity}</div>
                      )}
                    </div>
                    <div className="font-medium ml-4">{formatEuroCents(addon.price_eur_cents * addon.quantity)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policy Answers */}
          {booking.policy_answers && Array.isArray(booking.policy_answers) && booking.policy_answers.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Policy Responses</h3>
              <div className="space-y-2">
                {booking.policy_answers.map((answer: { fieldId?: string; value?: unknown; priceEurCents?: number }, index: number) => (
                  <div key={answer.fieldId || index} className="p-3 bg-muted rounded-md text-sm">
                    <div className="font-medium mb-1">Field ID: {answer.fieldId || 'N/A'}</div>
                    <div className="text-muted-foreground">
                      Value: {Array.isArray(answer.value) ? answer.value.join(', ') : String(answer.value || 'N/A')}
                    </div>
                    {answer.priceEurCents && answer.priceEurCents > 0 && (
                      <div className="text-muted-foreground mt-1">
                        Additional Cost: {formatEuroCents(answer.priceEurCents)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Notes</h3>
              {!isEditingNotes && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingNotes(true)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  {booking.notes ? 'Edit' : 'Add Notes'}
                </Button>
              )}
            </div>
            
            {isEditingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Add internal notes about this booking..."
                  rows={4}
                  className="resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingNotes(false);
                      setNotesValue(booking.notes || '');
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      try {
                        setIsSavingNotes(true);
                        const response = await fetch(`/api/bookings/${booking.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ notes: notesValue.trim() || null }),
                        });

                        const data = await response.json();
                        if (!response.ok) {
                          throw new Error(data.error || 'Failed to update notes');
                        }

                        toast.success('Notes updated successfully');
                        setIsEditingNotes(false);
                        if (onUpdate && data.booking) {
                          onUpdate(data.booking);
                        }
                      } catch (error) {
                        toast.error('Failed to update notes', {
                          description: error instanceof Error ? error.message : 'Unknown error',
                        });
                      } finally {
                        setIsSavingNotes(false);
                      }
                    }}
                    disabled={isSavingNotes}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSavingNotes ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              booking.notes ? (
                <div className="text-sm p-3 bg-muted rounded-md whitespace-pre-wrap">
                  {booking.notes}
                </div>
              ) : (
                <div className="text-sm p-3 bg-muted rounded-md text-muted-foreground italic">
                  No notes added yet
                </div>
              )
            )}
          </div>

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

