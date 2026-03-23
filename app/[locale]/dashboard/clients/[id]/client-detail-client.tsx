'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeftIcon,
  Loading03Icon,
  CallIcon,
  MailIcon,
  Calendar02Icon,
  FileEmpty02Icon,
  EditIcon,
  CheckmarkCircle03Icon,
  CalendarCheckInIcon,
  CoinsEuroIcon,
} from '@hugeicons/core-free-icons';
import { User, UpdateUserRequest, UserRole } from '@/lib/types/user';
import { Booking, BookingsResponse } from '@/lib/types/booking';
import { Midwife } from '@/lib/types/midwife';
import { formatEuroCents } from '@/lib/currency/format';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import BookingModal from '@/components/booking-modal';
import BookingRescheduleModal from '@/components/booking-reschedule-modal';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';

interface ClientDetailClientProps {
  clientId: string;
  initialClient: User;
  userRole?: string;
}

interface MidwifeResponse {
  success: boolean;
  data: Midwife[];
}

const ROLE_OPTIONS: UserRole[] = ['client', 'midwife', 'admin', 'assistant'];

export default function ClientDetailClient({
  clientId,
  initialClient,
  userRole
}: ClientDetailClientProps) {
  const router = useRouter();
  const [client, setClient] = useState<User>(initialClient);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBackLoading, setIsBackLoading] = useState(false);
  const [midwives, setMidwives] = useState<Midwife[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations('Clients.details');
  const tBookings = useTranslations('Bookings');
  const tCommon = useTranslations('Common');
  const tBookingStatus = useTranslations('BookingStatus');

  // Action states
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [bookingToAction, setBookingToAction] = useState<Booking | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<UpdateUserRequest>({
    defaultValues: {
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      phone: client.phone || '',
      address: client.address || '',
      postal_code: client.postal_code || '',
      house_number: client.house_number || '',
      street_name: client.street_name || '',
      city: client.city || '',
      birth_date: client.birth_date || '',
      midwife_id: client.midwife_id || '',
      role: client.role,
    },
  });

  // Default avatar
  const defaultAvatar = 'data:image/svg+xml;base64,' + btoa(
    '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#e5e7eb"/><circle cx="50" cy="35" r="15" fill="#9ca3af"/><path d="M20 85 Q20 70 50 70 Q80 70 80 85 L80 100 L20 100 Z" fill="#9ca3af"/></svg>'
  );

  // Fetch midwives for dropdown
  useEffect(() => {
    const fetchMidwives = async () => {
      try {
        const response = await fetch('/api/midwives?active_only=true&limit=1000');
        const data: MidwifeResponse = await response.json();
        if (data.success && data.data) {
          setMidwives(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch midwives:', err);
      }
    };
    fetchMidwives();
  }, []);

  // Fetch client bookings
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setBookingsLoading(true);
        // Fetch bookings where user is CREATOR or CLIENT (anyUserId)
        const res = await fetch(`/api/bookings?anyUserId=${clientId}&limit=100`);
        const data: BookingsResponse = await res.json();

        if (data.success && data.data) {
          setBookings(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
      } finally {
        setBookingsLoading(false);
        setLoading(false);
      }
    };

    fetchBookings();
  }, [clientId]);

  // Reset form when modal opens
  useEffect(() => {
    if (isEditModalOpen) {
      reset({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        phone: client.phone || '',
        address: client.address || '',
        postal_code: client.postal_code || '',
        house_number: client.house_number || '',
        street_name: client.street_name || '',
        city: client.city || '',
        birth_date: client.birth_date || '',
        midwife_id: client.midwife_id || '',
        role: client.role,
      });
    }
  }, [isEditModalOpen, client, reset]);

  // Handle form submission
  const onSubmit = async (data: UpdateUserRequest) => {
    try {
      setIsSaving(true);
      // Convert empty strings to null for optional fields
      const cleanedData: UpdateUserRequest = {
        ...data,
        phone: data.phone || undefined,
        address: data.address || undefined,
        postal_code: data.postal_code || undefined,
        house_number: data.house_number || undefined,
        street_name: data.street_name || undefined,
        city: data.city || undefined,
        birth_date: data.birth_date || undefined,
        midwife_id: data.midwife_id || undefined,
        role: data.role || undefined,
      };
      const response = await fetch(`/api/users/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update client');
      }

      // Update local client state
      setClient(result.data);
      setIsEditModalOpen(false);
      toast.success(t('toasts.updateSuccess'), {
        description: t('toasts.updateSuccessDesc'),
      });

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      toast.error(t('toasts.updateError'), {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Action Handlers
  const handleCancel = useCallback(async (booking: Booking) => {
    setBookingToAction(booking);
    setIsDeleteMode(false);
    setIsDeleteConfirmationOpen(true);
  }, []);

  const confirmCancel = async () => {
    if (!bookingToAction) return;
    setIsActionLoading(true);

    try {
      const response = await fetch(`/api/bookings/${bookingToAction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      // Update local state
      setBookings(prev => prev.map(b => b.id === bookingToAction.id ? { ...b, status: 'cancelled' } : b));
      setIsDeleteConfirmationOpen(false);
      setBookingToAction(null);
      toast.success(tBookings('toasts.cancelSuccess'));
    } catch (err) {
      toast.error(tBookings('toasts.cancelError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleNoShow = useCallback(async (booking: Booking) => {
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'no_show' }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as no show');
      }

      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'no_show' } : b));
      toast.success(tBookings('toasts.noShowSuccess'));
    } catch (err) {
      toast.error('Error marking as no show');
      throw err;
    }
  }, [tBookings]);

  const handleDelete = useCallback((booking: Booking) => {
    setBookingToAction(booking);
    setIsDeleteMode(true);
    setIsDeleteConfirmationOpen(true);
  }, []);

  const confirmDelete = async () => {
    if (!bookingToAction) return;
    setIsActionLoading(true);

    try {
      const response = await fetch(`/api/bookings/${bookingToAction.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete booking');
      }

      setBookings(prev => prev.filter(b => b.id !== bookingToAction.id));
      setIsDeleteConfirmationOpen(false);
      setBookingToAction(null);
      toast.success(tBookings('toasts.deleteSuccess'));
    } catch (err) {
      toast.error(tBookings('toasts.deleteError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReschedule = useCallback(async (
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
        throw new Error('Failed to reschedule booking');
      }

      const result = await response.json();
      if (result.success) {
        setBookings(prev => prev.map(b => b.id === bookingId ? result.data : b));
        toast.success(tBookings('toasts.rescheduleSuccess'));
      }
    } catch (err) {
      toast.error(tBookings('toasts.rescheduleError'));
      throw err;
    }
  }, [tBookings]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive', label: string }> = {
      pending: { variant: 'secondary', label: tBookingStatus('pending') },
      confirmed: { variant: 'default', label: tBookingStatus('confirmed') },
      cancelled: { variant: 'destructive', label: tBookingStatus('cancelled') },
    };
    const config = variants[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const clientName = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email || 'Onbekend';
  const clientIdShort = client.id.slice(0, 8).toUpperCase();

  // Separate upcoming and past bookings
  const now = new Date();
  const upcomingBookings = bookings.filter(b => new Date(b.start_time) >= now && b.status !== 'cancelled');
  const pastBookings = bookings.filter(b => new Date(b.start_time) < now || b.status === 'cancelled');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  // Calculate analytics
  const totalBookings = bookings.length;
  const totalUpcoming = upcomingBookings.length;
  const totalRevenue = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.price_eur_cents || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsBackLoading(true);
              router.push('/dashboard/clients');
            }}
            className="h-8 w-8"
            disabled={isBackLoading}
          >
            {isBackLoading ? (
              <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin" />
            ) : (
              <HugeiconsIcon icon={ArrowLeftIcon} className="h-4 w-4" />
            )}
          </Button>
          <div>
            <h1 className="text-md font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground text-xs">{t('backToList')}</p>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      {userRole === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-none shadow-none" style={{ borderRadius: '0.2rem' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('metrics.totalBookings')}</p>
                  <p className="text-2xl font-bold">{totalBookings}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <HugeiconsIcon icon={Calendar02Icon} className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-none shadow-none" style={{ borderRadius: '0.2rem' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('metrics.upcoming')}</p>
                  <p className="text-2xl font-bold">{totalUpcoming}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <HugeiconsIcon icon={CalendarCheckInIcon} className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-none shadow-none" style={{ borderRadius: '0.2rem' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('metrics.confirmed')}</p>
                  <p className="text-2xl font-bold">{confirmedBookings.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <HugeiconsIcon icon={CheckmarkCircle03Icon} className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-none shadow-none" style={{ borderRadius: '0.2rem' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('metrics.totalRevenue')}</p>
                  <p className="text-2xl font-bold">{formatEuroCents(totalRevenue)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <HugeiconsIcon icon={CoinsEuroIcon} className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6 bg-card rounded-lg p-6">
          {/* Client Profile Card */}
          <Card className="bg-card border-none shadow-none">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-0.5">
                    <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-zinc-900">
                      <Image
                        src={defaultAvatar}
                        alt={clientName}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold">{clientName}</h2>
                    <Badge variant="default">{t('active')}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Client ID: {clientIdShort}</p>
                  <div className="flex items-center gap-3">
                    {client.phone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${client.phone}`}>
                          <HugeiconsIcon icon={CallIcon} className="h-4 w-4 mr-2" />
                          {t('call')}
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <a href={`mailto:${client.email}`}>
                        <HugeiconsIcon icon={MailIcon} className="h-4 w-4 mr-2" />
                        {t('email')}
                      </a>
                    </Button>
                    <Button variant="default" size="sm" onClick={() => setIsEditModalOpen(true)}>
                      <HugeiconsIcon icon={EditIcon} className="h-4 w-4 mr-2" />
                      {t('editDetails')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info Card */}
          <Card className="bg-muted border-none shadow-none" style={{ borderRadius: '0.2rem' }}>
            <CardContent className="p-6">
              <h3 className="text-sm font-bold mb-4">{t('contact.title')}</h3>
              <div className="space-y-4">
                {client.phone && (
                  <div className="flex items-start gap-3">
                    <HugeiconsIcon icon={CallIcon} className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('contact.phone')}</p>
                      <p className="text-xs font-medium">{client.phone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <HugeiconsIcon icon={MailIcon} className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('contact.email')}</p>
                    <p className="text-xs text-foreground font-medium">{client.email}</p>
                  </div>
                </div>
                {(client.street_name || client.house_number || client.postal_code || client.city) && (
                  <div className="flex items-start gap-3">
                    <HugeiconsIcon icon={FileEmpty02Icon} className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('contact.address')}</p>
                      <p className="text-xs text-foreground font-medium">
                        {[client.street_name, client.house_number].filter(Boolean).join(' ')}
                        {client.postal_code || client.city ? ', ' : ''}
                        {[client.postal_code, client.city].filter(Boolean).join(' ')}
                      </p>
                    </div>
                  </div>
                )}
                {client.address && !client.street_name && (
                  <div className="flex items-start gap-3">
                    <HugeiconsIcon icon={FileEmpty02Icon} className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('contact.oldAddress')}</p>
                      <p className="text-xs text-foreground font-medium">{client.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Info Card */}
          <Card className="bg-muted border-none shadow-none" style={{ borderRadius: '0.2rem' }}>
            <CardContent className="p-6">
              <h3 className="text-sm font-bold mb-4">{t('additionalInfo.title')}</h3>
              <div className="grid grid-cols-2 gap-4">
                {client.birth_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('additionalInfo.birthDate')}</p>
                    <p className="text-xs text-foreground font-medium">
                      {new Date(client.birth_date).toLocaleDateString('nl-NL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
                {client.midwife_id && (() => {
                  const midwife = midwives.find(m => m.id === client.midwife_id);
                  return midwife ? (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('additionalInfo.midwife')}</p>
                      <p className="text-xs text-foreground font-medium">
                        {[midwife.first_name, midwife.last_name].filter(Boolean).join(' ')}
                        {midwife.practice_name ? ` (${midwife.practice_name})` : ''}
                      </p>
                    </div>
                  ) : null;
                })()}
              </div>
            </CardContent>
          </Card>

          {/* General Info Card */}
          <Card className="bg-muted border-none shadow-none" style={{ borderRadius: '0.2rem' }}>
            <CardContent className="p-6">
              <h3 className="text-sm font-bold mb-4">{t('generalInfo.title')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t('generalInfo.memberSince')}</p>
                  <p className="text-xs text-foreground font-medium">
                    {new Date(client.created_at).toLocaleDateString('nl-NL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {client.last_login && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('generalInfo.lastLogin')}</p>
                    <p className="font-medium">
                      {new Date(client.last_login).toLocaleDateString('nl-NL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Bookings */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('appointments.title')}</h3>

              {bookingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Upcoming Appointments */}
                  {upcomingBookings.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{t('appointments.upcoming')}</h4>
                      <div className="space-y-3">
                        {upcomingBookings.slice(0, 10).map((booking) => (
                          <div
                            key={booking.id}
                            onClick={() => {
                              setSelectedBooking(booking);
                              setIsBookingModalOpen(true);
                            }}
                            className="block px-3 bg-muted/50 rounded-lg border-l-4 border-primary hover:bg-muted/80 hover:shadow-sm transition-all cursor-pointer group"
                          >
                            <div className="flex items-start justify-between mb-2 pt-2">
                              <div className="flex-1">
                                <p className="font-semibold text-sm group-hover:text-primary transition-colors">{booking.services?.name || t('appointments.unknownService')}</p>
                              </div>
                              {getStatusBadge(booking.status)}
                            </div>
                            <p className="text-xs text-primary flex items-center gap-1 mt-2 pb-2">
                              <HugeiconsIcon icon={Calendar02Icon} className="h-3 w-3" />
                              {formatDateTime(booking.start_time)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Booking History */}
                  {pastBookings.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{t('appointments.history')}</h4>
                      <div className="space-y-3">
                        {pastBookings.slice(0, 5).map((booking) => (
                          <div
                            key={booking.id}
                            onClick={() => {
                              setSelectedBooking(booking);
                              setIsBookingModalOpen(true);
                            }}
                            className="block p-3 bg-muted/30 rounded-lg border-l-4 border-muted hover:bg-muted/50 transition-all cursor-pointer group"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-sm group-hover:text-primary transition-colors">{booking.services?.name || t('appointments.unknownService')}</p>
                              </div>
                              {getStatusBadge(booking.status)}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                              <HugeiconsIcon icon={Calendar02Icon} className="h-3 w-3" />
                              {formatDateTime(booking.start_time)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {upcomingBookings.length === 0 && pastBookings.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('appointments.noAppointments')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <SheetContent className="w-[600px] sm:w-[700px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{t('editModal.title')}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name" className="text-sm font-semibold mb-2">{t('editModal.firstName')}</Label>
                  <Input
                    id="first_name"
                    {...register('first_name')}
                    placeholder={t('editModal.firstName')}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name" className="text-sm font-semibold mb-2">{t('editModal.lastName')}</Label>
                  <Input
                    id="last_name"
                    {...register('last_name')}
                    placeholder={t('editModal.lastName')}
                  />
                </div>
              </div>

              {/* Contact Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-sm font-semibold mb-2">{t('editModal.phone')}</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="+31 6 12345678"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-semibold mb-2">{t('editModal.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={client.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('editModal.emailReadOnly')}</p>
                </div>
              </div>

              {/* Role Field */}
              <div>
                <Label htmlFor="role" className="text-sm font-semibold mb-2">{t('editModal.role')}</Label>
                <Select
                  value={watch('role') || client.role}
                  onValueChange={(value) => setValue('role', value as UserRole, { shouldValidate: true })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder={t('editModal.roleSelect')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('editModal.roleHint')}{' '}
                  <a href="/dashboard/staff" className="text-primary underline">
                    /dashboard/staff
                  </a>
                  .
                </p>
              </div>

              {/* Address Fields */}
              <div>
                <Label className="text-sm font-semibold mb-2">{t('editModal.address')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Input
                      {...register('street_name')}
                      placeholder={t('editModal.street')}
                    />
                  </div>
                  <div>
                    <Input
                      {...register('house_number')}
                      placeholder={t('editModal.houseNumber')}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postal_code" className="text-sm font-semibold mb-2">{t('editModal.postalCode')}</Label>
                  <Input
                    id="postal_code"
                    {...register('postal_code')}
                    placeholder="1234AB"
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-sm font-semibold mb-2">{t('editModal.city')}</Label>
                  <Input
                    id="city"
                    {...register('city')}
                    placeholder={t('editModal.city')}
                  />
                </div>
              </div>

              {/* Legacy Address Field */}
              <div>
                <Label htmlFor="address" className="text-sm font-semibold mb-2">{t('editModal.legacyAddress')}</Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder={t('editModal.legacyAddressPlaceholder')}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('editModal.legacyAddressHint')}</p>
              </div>

              {/* Additional Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birth_date" className="text-sm font-semibold mb-2">{t('editModal.birthDate')}</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    {...register('birth_date')}
                  />
                </div>
                <div>
                  <Label htmlFor="midwife_id" className="text-sm font-semibold mb-2">
                    {(watch('role') === 'midwife' || client.role === 'midwife') ? t('editModal.practice') : t('editModal.midwife')}
                  </Label>
                  <Select
                    value={watch('midwife_id') || '__none__'}
                    onValueChange={(value) => {
                      // Convert special value to empty string for form submission
                      setValue('midwife_id', value === '__none__' ? '' : value, { shouldValidate: true });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('editModal.midwifeSelect')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t('editModal.noMidwife')}</SelectItem>
                      {midwives.map((m) => {
                        const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Naamloos';
                        const practice = m.practice_name;
                        return (
                          <SelectItem key={m.id} value={m.id}>
                            {practice ? `${name} (${practice})` : name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                >
                  {tCommon('cancel')}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 mr-2 animate-spin" />
                      {t('editModal.saving')}
                    </>
                  ) : (
                    tCommon('save')
                  )}
                </Button>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        booking={selectedBooking}
        userRole={userRole}
        onUpdate={(updatedBooking) => {
          setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
          setSelectedBooking(updatedBooking);
        }}
        onCancel={handleCancel}
        onNoShow={handleNoShow}
        onDelete={handleDelete}
        onReschedule={(booking) => {
          setIsBookingModalOpen(false);
          setBookingToAction(booking);
          setIsRescheduleModalOpen(true);
        }}
      />

      {/* Reschedule Modal */}
      <BookingRescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setBookingToAction(null);
        }}
        booking={bookingToAction}
        onReschedule={handleReschedule}
      />

      {/* Cancel/Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteConfirmationOpen}
        onClose={() => {
          if (!isActionLoading) {
            setIsDeleteConfirmationOpen(false);
            setBookingToAction(null);
            setIsDeleteMode(false);
          }
        }}
        onConfirm={isDeleteMode ? confirmDelete : confirmCancel}
        title={isDeleteMode ? tBookings('dialog.deleteTitle') : tBookings('dialog.cancelTitle')}
        description={isDeleteMode
          ? tBookings('dialog.deleteDescription')
          : tBookings('dialog.cancelDescription')}
        itemName={bookingToAction ? `Booking for ${bookingToAction.users?.email || 'Unknown'}` : undefined}
        confirmButtonText={isDeleteMode ? tBookings('dialog.deleteConfirm') : tBookings('dialog.cancelConfirm')}
        confirmButtonVariant={isDeleteMode ? 'destructive' : 'default'}
        isLoading={isActionLoading}
      />
    </div>
  );
}

