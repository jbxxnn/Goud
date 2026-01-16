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
import { Skeleton } from '@/components/ui/skeleton';
// import { HugeiconsIcon } from '@hugeicons/react';
// import { Cancel01Icon } from '@hugeicons/core-free-icons';

interface PolicyField {
  id: string;
  title: string;
  field_type: string;
  choices?: Array<{ id: string; title: string; price?: number }>;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onCancel?: (booking: Booking) => void;
  onDelete?: (booking: Booking) => void;
  onReschedule?: (booking: Booking) => void;
  onUpdate?: (booking: Booking) => void;
  onComplete?: (booking: Booking) => void;
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
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string, className?: string }> = {
    pending: { variant: 'secondary', label: 'Pending' },
    confirmed: { variant: 'default', label: 'Confirmed' },
    cancelled: { variant: 'destructive', label: 'Cancelled' },
    ongoing: { variant: 'secondary', label: 'Ongoing', className: 'bg-accent text-accent-foreground hover:bg-accent/80' },
    completed: { variant: 'default', label: 'Completed', className: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white' },
  };
  const config = variants[status] || { variant: 'secondary' as const, label: status };
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
};

const getPaymentBadge = (status: string) => {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string, className?: string }> = {
    unpaid: { variant: 'secondary', label: 'Unpaid' },
    paid: { variant: 'default', label: 'Paid', className: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white' },
    refunded: { variant: 'secondary', label: 'Refunded', className: 'bg-secondary-foreground text-secondary hover:bg-secondary-foreground/90' },
  };
  const config = variants[status] || { variant: 'secondary' as const, label: status };
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
};

export default function BookingModal({ isOpen, onClose, booking, onCancel, onDelete, onReschedule, onUpdate, onComplete }: BookingModalProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [policyFields, setPolicyFields] = useState<Record<string, PolicyField>>({});

  useEffect(() => {
    if (booking) {
      setNotesValue(booking.notes || '');

      // Fetch policy fields for the service
      if (booking.service_id) {
        fetch(`/api/services/${booking.service_id}`)
          .then(res => res.json())
          .then(data => {
            const service = data.data || data.service;
            if (service?.policy_fields && Array.isArray(service.policy_fields)) {
              const fieldsMap: Record<string, PolicyField> = {};
              service.policy_fields.forEach((field: PolicyField & {
                service_policy_field_choices?: Array<{ id: string; title: string; price?: number }>;
                choices?: Array<{ id: string; title: string; price?: number }>;
              }) => {
                if (field.id && field.title) {
                  const choices = field.choices || field.service_policy_field_choices || [];
                  fieldsMap[field.id] = {
                    id: field.id,
                    title: field.title,
                    field_type: field.field_type,
                    choices: choices,
                  };
                }
              });
              setPolicyFields(fieldsMap);
            }
          })
          .catch(() => {
            // Silently handle error - policy fields are optional
          });
      }
    }
  }, [booking]);

  // if (!booking) return null; // Removed to allow loading state

  const user = booking?.users;
  const service = booking?.services;
  const location = booking?.locations;
  const staff = booking?.staff;
  const clientName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown' : 'N/A';
  const staffName = staff ? [staff.first_name, staff.last_name].filter(Boolean).join(' ') || 'Unknown' : 'Unassigned';
  const serviceDuration = service?.duration ? formatDuration(service.duration) : 'N/A';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Booking Details</SheetTitle>
        </SheetHeader>

        {!booking ? (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Status & Payment Skeleton */}
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <Skeleton className="h-5 w-20" style={{ borderRadius: "0.5rem" }} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Payment</div>
                <Skeleton className="h-5 w-16" style={{ borderRadius: "0.5rem" }} />
              </div>
            </div>

            {/* Client Information Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 mb-4" style={{ borderRadius: '0.5rem' }} /> {/* Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Name</div>
                  <Skeleton className="h-5 w-32" style={{ borderRadius: "0.5rem" }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Email</div>
                  <Skeleton className="h-5 w-48" style={{ borderRadius: "0.5rem" }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Phone</div>
                  <Skeleton className="h-5 w-32" style={{ borderRadius: "0.5rem" }} />
                </div>
              </div>
            </div>

            {/* Appointment Details Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 mb-4" style={{ borderRadius: '0.5rem' }} /> {/* Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Date</div>
                  <Skeleton className="h-5 w-24" style={{ borderRadius: '0.5rem' }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Time</div>
                  <Skeleton className="h-5 w-32" style={{ borderRadius: '0.5rem' }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Service</div>
                  <Skeleton className="h-5 w-32" style={{ borderRadius: '0.5rem' }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Duration</div>
                  <Skeleton className="h-5 w-24" style={{ borderRadius: '0.5rem' }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Location</div>
                  <Skeleton className="h-5 w-40" style={{ borderRadius: '0.5rem' }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Staff</div>
                  <Skeleton className="h-5 w-32" style={{ borderRadius: '0.5rem' }} />
                </div>
              </div>
            </div>

            {/* Price Breakdown Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 mb-4" style={{ borderRadius: '0.5rem' }} /> {/* Header */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" style={{ borderRadius: '0.5rem' }} />
                  <Skeleton className="h-4 w-16" style={{ borderRadius: '0.5rem' }} />
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t">
                  <Skeleton className="h-5 w-16" style={{ borderRadius: '0.5rem' }} />
                  <Skeleton className="h-5 w-20" style={{ borderRadius: '0.5rem' }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
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
              {booking.policy_answers && (() => {
                // Handle both array and object formats
                let answers: Array<{ fieldId?: string; field_id?: string; value?: unknown; priceEurCents?: number }> = [];

                if (Array.isArray(booking.policy_answers)) {
                  answers = booking.policy_answers;
                } else if (typeof booking.policy_answers === 'object' && booking.policy_answers !== null) {
                  // Convert object format { fieldId: { value, priceEurCents } } to array
                  answers = Object.entries(booking.policy_answers).map(([fieldId, data]: [string, unknown]) => {
                    const dataObj = data as { value?: unknown; priceEurCents?: number; price_eur_cents?: number } | unknown;
                    let priceEurCents: number | undefined = undefined;
                    if (typeof dataObj === 'object' && dataObj !== null) {
                      if ('priceEurCents' in dataObj && typeof dataObj.priceEurCents === 'number') {
                        priceEurCents = dataObj.priceEurCents;
                      } else if ('price_eur_cents' in dataObj && typeof dataObj.price_eur_cents === 'number') {
                        priceEurCents = dataObj.price_eur_cents;
                      }
                    }
                    return {
                      fieldId,
                      value: (typeof dataObj === 'object' && dataObj !== null && 'value' in dataObj) ? dataObj.value : dataObj,
                      priceEurCents,
                    };
                  });
                }

                if (answers.length === 0) return null;

                return (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Policy Responses</h3>
                    <div className="space-y-2">
                      {answers.map((answer: { fieldId?: string; field_id?: string; value?: unknown; priceEurCents?: number }, index: number) => {
                        // Handle both fieldId and field_id formats
                        const fieldId = answer.fieldId || answer.field_id;
                        const field = fieldId ? policyFields[fieldId] : null;
                        const questionText = field?.title || fieldId || 'Unknown Field';

                        // Format the answer value
                        let answerText = 'N/A';
                        const rawValue = answer.value;

                        if (rawValue !== undefined && rawValue !== null) {
                          if (Array.isArray(rawValue)) {
                            // Handle array of values (for multi_choice fields)
                            if (field?.field_type === 'multi_choice' && field.choices && rawValue.length > 0) {
                              // Map UUIDs to choice titles
                              const choiceTitles = rawValue.map((val: unknown) => {
                                const valStr = String(val);
                                // Check if it's a UUID
                                if (valStr.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                                  const choice = field.choices!.find((c: { id: string }) => c.id === valStr);
                                  return choice?.title || valStr;
                                }
                                return valStr;
                              });
                              answerText = choiceTitles.join(', ');
                            } else {
                              // Not a multi_choice or no choices, just join the array
                              answerText = rawValue.map((v: unknown) => String(v)).join(', ');
                            }
                          } else if (typeof rawValue === 'boolean') {
                            answerText = rawValue ? 'Yes' : 'No';
                          } else if (typeof rawValue === 'string' && rawValue.length > 0) {
                            // Check if it's a UUID (36 chars with dashes)
                            if (rawValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                              // It's a UUID - might be a choice ID, try to find the choice title
                              if (field?.field_type === 'multi_choice' && field.choices) {
                                const choice = field.choices.find((c: { id: string }) => c.id === rawValue);
                                answerText = choice?.title || rawValue;
                              } else {
                                answerText = rawValue;
                              }
                            } else {
                              answerText = rawValue;
                            }
                          } else if (typeof rawValue === 'number') {
                            answerText = String(rawValue);
                          } else {
                            answerText = String(rawValue);
                          }
                        }

                        return (
                          <div key={fieldId || index} className="p-3 bg-muted rounded-md text-sm">
                            <div className="font-medium mb-1">{questionText}</div>
                            <div className="text-muted-foreground">{answerText}</div>
                            {answer.priceEurCents && answer.priceEurCents > 0 && (
                              <div className="text-muted-foreground mt-1">
                                Additional Cost: {formatEuroCents(answer.priceEurCents)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Notes</h3>
                  {!isEditingNotes && ['confirmed', 'ongoing'].includes(booking.status) && (
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
            {((onReschedule && ['pending', 'confirmed'].includes(booking.status)) ||
              (onCancel && !['cancelled', 'completed'].includes(booking.status)) ||
              (onComplete && booking.status === 'ongoing') ||
              (onDelete && ['cancelled', 'completed'].includes(booking.status))) ? (
              <div className="px-6 py-4 border-t flex justify-end gap-3">
                {onCancel && !['cancelled', 'completed'].includes(booking.status) && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onClose();
                      onCancel(booking);
                    }}
                    className="bg-secondary-foreground hover:bg-secondary-foreground/70"
                  >
                    Cancel Appointment
                  </Button>
                )}
                {onReschedule && ['pending', 'confirmed'].includes(booking.status) && (
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
                {onComplete && booking.status === 'ongoing' && (
                  <Button
                    variant="default"
                    onClick={() => {
                      onClose();
                      onComplete(booking);
                    }}
                  >
                    Complete Appointment
                  </Button>
                )}
                {onDelete && ['cancelled', 'completed'].includes(booking.status) && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onClose();
                      onDelete(booking);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Booking
                  </Button>
                )}
              </div>
            ) : null}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

