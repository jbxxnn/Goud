'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Booking } from '@/lib/types/booking';
import { Badge } from '@/components/ui/badge';
import { formatEuroCents } from '@/lib/currency/format';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Save, X, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
// import { HugeiconsIcon } from '@hugeicons/react';
// import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { RepeatPrescriber } from './repeat-prescriber';
import { differenceInMinutes } from 'date-fns';
import { useTranslations, useLocale } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';

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
  onNoShow?: (booking: Booking) => void | Promise<void>;
  userRole?: string;
}

const formatDate = (dateString: string, locale: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (dateString: string, locale: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString(locale === 'nl' ? 'nl-NL' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDuration = (minutes: number, t: (key: string, values?: any) => string) => {
  if (minutes < 60) {
    return t('durationFormats.minutes', { minutes });
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 1) {
    return remainingMinutes > 0 
      ? t('durationFormats.hourMinutes', { hour: 1, minutes: remainingMinutes }) 
      : t('durationFormats.hour', { hour: 1 });
  }
  return remainingMinutes > 0 
    ? t('durationFormats.hourMinutes', { hour: hours, minutes: remainingMinutes }) 
    : t('durationFormats.hours', { hours });
};

const getStatusBadge = (status: string, t: (key: string) => string) => {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'noShow' | 'outline', label: string, className?: string }> = {
    pending: { variant: 'secondary', label: t('pending') },
    confirmed: { variant: 'default', label: t('confirmed') },
    cancelled: { variant: 'destructive', label: t('cancelled') },
    ongoing: { variant: 'secondary', label: t('ongoing'), className: 'bg-accent text-accent-foreground hover:bg-accent/80' },
    completed: { variant: 'default', label: t('completed'), className: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white' },
    no_show: { variant: 'noShow', label: t('no_show') },
  };
  const config = variants[status] || { variant: 'secondary' as const, label: status };
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
};

const getPaymentBadge = (status: string, t: (key: string) => string) => {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string, className?: string }> = {
    unpaid: { variant: 'secondary', label: t('paymentStatus.unpaid') },
    paid: { variant: 'default', label: t('paymentStatus.paid'), className: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white' },
    refunded: { variant: 'secondary', label: t('paymentStatus.refunded'), className: 'bg-secondary-foreground text-secondary hover:bg-secondary-foreground/90' },
  };
  const config = variants[status] || { variant: 'secondary' as const, label: status };
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
};

export default function BookingModal({ isOpen, onClose, booking, onCancel, onDelete, onReschedule, onUpdate, onComplete, onNoShow, userRole }: BookingModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  if (isOpen) {
    console.log('BookingModal rendered with booking:', booking);
  }
  const t = useTranslations('BookingModal');
  const queryClient = useQueryClient();
  const tStatus = useTranslations('BookingStatus');
  const locale = useLocale();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isEditingInternalNotes, setIsEditingInternalNotes] = useState(false);
  const [internalNotesValue, setInternalNotesValue] = useState('');
  const [isSavingInternalNotes, setIsSavingInternalNotes] = useState(false);
  const [isMarkingNoShow, setIsMarkingNoShow] = useState(false);
  const [policyFields, setPolicyFields] = useState<Record<string, PolicyField>>({});

  useEffect(() => {
    if (booking) {
      setNotesValue(booking.notes || '');
      setInternalNotesValue(booking.internal_notes || '');

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
  const clientName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || t('placeholders.unknown') : t('placeholders.na');
  const staffName = staff ? [staff.first_name, staff.last_name].filter(Boolean).join(' ') || t('placeholders.unknown') : t('placeholders.unassigned');
  const serviceDuration = service?.duration ? formatDuration(service.duration, t) : t('placeholders.na');

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{t('title')}</SheetTitle>
        </SheetHeader>

        {!booking ? (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Status & Payment Skeleton */}
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('status')}</div>
                <Skeleton className="h-5 w-20" style={{ borderRadius: "0.5rem" }} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('payment')}</div>
                <Skeleton className="h-5 w-16" style={{ borderRadius: "0.5rem" }} />
              </div>
            </div>

            {/* Client Information Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 mb-4" style={{ borderRadius: '0.5rem' }} /> {/* Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('name')}</div>
                  <Skeleton className="h-5 w-32" style={{ borderRadius: "0.5rem" }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('email')}</div>
                  <Skeleton className="h-5 w-48" style={{ borderRadius: "0.5rem" }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('phone')}</div>
                  <Skeleton className="h-5 w-32" style={{ borderRadius: "0.5rem" }} />
                </div>
              </div>
            </div>

            {/* Appointment Details Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 mb-4" style={{ borderRadius: '0.5rem' }} /> {/* Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('date')}</div>
                  <Skeleton className="h-5 w-24" style={{ borderRadius: '0.5rem' }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('time')}</div>
                  <Skeleton className="h-5 w-32" style={{ borderRadius: '0.5rem' }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('service')}</div>
                  <Skeleton className="h-5 w-32" style={{ borderRadius: '0.5rem' }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('duration')}</div>
                  <Skeleton className="h-5 w-24" style={{ borderRadius: '0.5rem' }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('location')}</div>
                  <Skeleton className="h-5 w-40" style={{ borderRadius: '0.5rem' }} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('staff')}</div>
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
                  <div className="text-sm text-muted-foreground mb-1">{t('status')}</div>
                  {getStatusBadge(booking.status, tStatus)}
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('payment')}</div>
                  {getPaymentBadge(booking.payment_status, t)}
                </div>
              </div>

              {/* Client Information */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{t('clientInfo')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">{t('name')}</div>
                    <div className="font-medium">{clientName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t('email')}</div>
                    <div className="font-medium">{user?.email || t('placeholders.na')}</div>
                  </div>
                  {user?.phone && (
                    <div>
                      <div className="text-muted-foreground">{t('phone')}</div>
                      <div className="font-medium">{user.phone}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Appointment Details */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{t('appointmentDetails')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">{t('date')}</div>
                    <div className="font-medium">{formatDate(booking.start_time, locale)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t('time')}</div>
                    <div className="font-medium">{formatTime(booking.start_time, locale)} - {formatTime(booking.end_time, locale)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t('service')}</div>
                    <div className="font-medium">{service?.name || t('placeholders.na')} {booking.parent_booking_id && (
                      <Badge variant="secondary" className="bg-primary text-primary-foreground border-primary hover:bg-primary/20 h-4 text-xs px-1 uppercase font-bold tracking-wider">
                        {differenceInMinutes(new Date(booking.end_time), new Date(booking.start_time))}
                      </Badge>
                    )}
                     {booking.is_twin && (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-purple-100 text-purple-700 hover:bg-purple-100/80 border-purple-200 text-[10px] px-1.5 py-0 h-5"
                                                >
                                                    Tweeling
                                                </Badge>
                                            )}</div>

                  </div>
                  <div>
                    <div className="text-muted-foreground">{t('duration')}</div>
                    <div className="font-medium">{serviceDuration}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t('location')}</div>
                    <div className="font-medium">{location?.name || t('placeholders.na')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t('staff')}</div>
                    <div className="font-medium">{staffName}</div>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{t('priceBreakdown')}</h3>
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
                          <span className="text-muted-foreground">{t('baseService')}</span>
                          <span className="font-medium">{formatEuroCents(basePrice)}</span>
                        </div>

                        {/* Policy Extras */}
                        {policyTotal > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('servicePolicy')}</span>
                            <span className="font-medium">{formatEuroCents(policyTotal)}</span>
                          </div>
                        )}

                        {/* Add-ons */}
                        {addonsTotal > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('addons')}</span>
                            <span className="font-medium">{formatEuroCents(addonsTotal)}</span>
                          </div>
                        )}

                        <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                          <span>{t('total')}</span>
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
                  <h3 className="font-semibold text-lg">{t('selectedAddons')}</h3>
                  <div className="space-y-2">
                    {booking.addons.map((addon) => (
                      <div key={addon.id} className="flex justify-between items-start p-3 bg-muted rounded-md text-sm">
                        <div className="flex-1">
                          <div className="font-medium">{addon.name}</div>
                          {addon.description && (
                            <div className="text-muted-foreground text-xs mt-1">{addon.description}</div>
                          )}
                          {addon.quantity > 1 && (
                            <div className="text-muted-foreground text-xs mt-1">{t('quantity', { quantity: addon.quantity })}</div>
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
                    <h3 className="font-semibold text-lg">{t('policyResponses')}</h3>
                    <div className="space-y-2">
                      {answers.map((answer: { fieldId?: string; field_id?: string; value?: unknown; priceEurCents?: number }, index: number) => {
                        // Handle both fieldId and field_id formats
                        const fieldId = answer.fieldId || answer.field_id;
                        const field = fieldId ? policyFields[fieldId] : null;
                        const questionText = field?.title || fieldId || 'Unknown Field';

                        // Format the answer value
                        let answerText = t('placeholders.na');
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
                            answerText = rawValue ? t('boolean.yes') : t('boolean.no');
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
                                {t('additionalCost', { price: formatEuroCents(answer.priceEurCents) })}
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
                  <h3 className="font-semibold text-lg">{t('notes')}</h3>
                  {!isEditingNotes && ['confirmed', 'ongoing'].includes(booking.status) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingNotes(true)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      {booking.notes ? t('edit') : t('addNotes')}
                    </Button>
                  )}
                </div>

                {isEditingNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder={t('notesPlaceholder')}
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
                        {t('cancel')}
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
                              throw new Error(data.error || t('toasts.notesUpdateError'));
                            }

                            toast.success(t('toasts.notesUpdateSuccess'));
                            setIsEditingNotes(false);
                            if (onUpdate && data.booking) {
                              onUpdate(data.booking);
                            }
                          } catch (error) {
                            toast.error(t('toasts.notesUpdateError'), {
                              description: error instanceof Error ? error.message : t('placeholders.unknown'),
                            });
                          } finally {
                            setIsSavingNotes(false);
                          }
                        }}
                        disabled={isSavingNotes}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSavingNotes ? t('saving') : t('save')}
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
                      {t('noNotes')}
                    </div>
                  )
                )}
              </div>

              {/* Staff Notes (Assistant <-> Staff) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{t('staffNotes')}</h3>
                  {!isEditingInternalNotes && userRole !== 'client' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingInternalNotes(true)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      {booking.internal_notes ? t('edit') : t('addNote')}
                    </Button>
                  )}
                </div>

                {isEditingInternalNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={internalNotesValue}
                      onChange={(e) => setInternalNotesValue(e.target.value)}
                      placeholder={userRole === 'assistant' ? t('staffNotesPlaceholderAssistant') : t('staffNotesPlaceholderStaff')}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingInternalNotes(false);
                          setInternalNotesValue(booking.internal_notes || '');
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        {t('cancel')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          try {
                            setIsSavingInternalNotes(true);
                            const response = await fetch(`/api/bookings/${booking.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ internal_notes: internalNotesValue.trim() || null }),
                            });

                            const data = await response.json();
                            if (!response.ok) {
                              throw new Error(data.error || t('toasts.staffNotesUpdateError'));
                            }

                            toast.success(t('toasts.staffNotesUpdateSuccess'));
                            setIsEditingInternalNotes(false);
                            if (onUpdate && data.booking) {
                              onUpdate(data.booking);
                            }
                          } catch (error) {
                            toast.error(t('toasts.staffNotesUpdateError'), {
                              description: error instanceof Error ? error.message : t('placeholders.unknown'),
                            });
                          } finally {
                            setIsSavingInternalNotes(false);
                          }
                        }}
                        disabled={isSavingInternalNotes}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSavingInternalNotes ? t('saving') : t('save')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  booking.internal_notes ? (
                    <div className="text-sm p-3 bg-blue-50/50 text-blue-900 rounded-md whitespace-pre-wrap border border-blue-100">
                      {booking.internal_notes}
                    </div>
                  ) : (
                    <div className="text-sm p-3 bg-muted rounded-md text-muted-foreground italic">
                      {t('noStaffNotes')}
                    </div>
                  )
                )}
              </div>

              {/* Booking Metadata */}
              <div className="space-y-2 pt-4 border-t">
                <h3 className="font-semibold text-lg">{t('bookingInfo')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">{t('bookingId')}</div>
                    <div className="font-medium font-mono text-xs">{booking.id}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t('created')}</div>
                    <div className="font-medium">{formatDate(booking.created_at, locale)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t('lastUpdated')}</div>
                    <div className="font-medium">{formatDate(booking.updated_at, locale)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons at Bottom */}
            {((onReschedule && ['pending', 'confirmed'].includes(booking.status)) ||
              (onCancel && !['cancelled', 'completed'].includes(booking.status)) ||
              (onComplete && booking.status === 'ongoing') ||
              (onDelete && ['cancelled', 'completed'].includes(booking.status)) ||
              (booking.status !== 'cancelled' && booking.service_id)) ? (
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
                    {t('btnCancel')}
                  </Button>
                )}
                {onNoShow && ['confirmed', 'completed', 'ongoing'].includes(booking.status) && (
                  <Button
                    variant="outline"
                    className="border-orange-500 text-orange-500 hover:bg-orange-50 min-w-[124px]"
                    disabled={isMarkingNoShow}
                    onClick={async () => {
                      try {
                        setIsMarkingNoShow(true);
                        await onNoShow(booking);
                        onClose();
                      } catch (err) {
                        // Only reset on error so user can try again
                        setIsMarkingNoShow(false);
                      }
                    }}
                  >
                    {isMarkingNoShow ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        {t('btnMarking')}
                      </>
                    ) : (
                      t('btnNoShow')
                    )}
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
                    {t('btnReschedule')}
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
                    {t('btnComplete')}
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
                    {t('btnDelete')}
                  </Button>
                )}
                {booking.service_id && booking.status === 'completed' && userRole !== 'assistant' && (
                  <RepeatPrescriber bookingId={booking.id} serviceId={booking.service_id} />
                )}
              </div>
            ) : null}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

