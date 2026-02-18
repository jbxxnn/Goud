'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Booking } from '@/lib/types/booking';
import { format } from 'date-fns';
import Link from 'next/link';
import { Calendar02Icon, CheckListIcon, UserIcon, Edit02Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ChecklistItem {
  id: string;
  booking_id: string;
  content: string;
  is_completed: boolean;
  comment?: string | null;
  booking?: DashboardBooking;
}

interface DashboardBooking extends Booking {
  users: any; // Override strictly typed Booking to allow array or object from Supabase
}

export default function AssistantDashboard() {
  const t = useTranslations('AssistantDashboard');
  const [upcomingBookings, setUpcomingBookings] = useState<DashboardBooking[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<ChecklistItem[]>([]);
  const [pastTasks, setPastTasks] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Comment editing state
  const [editingTask, setEditingTask] = useState<ChecklistItem | null>(null);
  const [commentText, setCommentText] = useState("");

  // Internal Note editing state
  const [editingInternalNote, setEditingInternalNote] = useState<DashboardBooking | null>(null);
  const [internalNoteText, setInternalNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const supabase = createClient();

  const openInternalNoteDialog = (booking: DashboardBooking) => {
    setEditingInternalNote(booking);
    setInternalNoteText(booking.internal_notes || "");
  };

  const handleSaveInternalNote = async () => {
    if (!editingInternalNote) return;

    try {
      setIsSavingNote(true);
      const { error } = await supabase
        .from('bookings')
        .update({ 
          internal_notes: internalNoteText.trim() || null
        })
        .eq('id', editingInternalNote.id);

      if (error) throw error;

      toast.success(t('toasts.noteSuccess'));
      
      // Update local state
      setUpcomingBookings(prev => prev.map(b => b.id === editingInternalNote.id ? { ...b, internal_notes: internalNoteText.trim() || null } : b));
      
      setEditingInternalNote(null);
    } catch (error) {
      console.error('Error saving internal note:', error);
      toast.error(t('toasts.noteError'));
    } finally {
      setIsSavingNote(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999); // End of today

      // 1. Fetch upcoming bookings (next 7 days for now, or just future)
      // Let's fetch next 50 upcoming bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          internal_notes,
          users(first_name, last_name, email, phone),
          services(name, duration),
          locations(name)
        `)
        .gte('start_time', now)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true })
        .limit(20);

      if (bookingsError) throw bookingsError;

      setUpcomingBookings(bookings as any || []);

      // 2. Fetch ALL pending checklist items for non-cancelled bookings
      // We need to join with bookings to check the date and status
      const { data: allTasks, error: tasksError } = await supabase
        .from('booking_checklist_items')
        .select(`
          *,
          booking:bookings!inner (
            id,
            start_time,
            status,
            users (first_name, last_name, email, phone),
            services (name, duration)
          )
        `)
        .eq('is_completed', false)
        .neq('bookings.status', 'cancelled')
        .order('created_at', { ascending: true });

      if (tasksError) throw tasksError;

      console.log('Fetched tasks for assistant dashboard:', allTasks, allTasks?.[0]);

      // Split into upcoming and past tasks
      const upcoming: ChecklistItem[] = [];
      const past: ChecklistItem[] = [];
      const nowTs = new Date().getTime();

      (allTasks as any)?.forEach((task: any) => {
        // Double check status because of potential !inner join quirks or if neq ignored
        if (task.booking?.status === 'cancelled') return;

        const bookingTime = new Date(task.booking?.start_time || '').getTime();
        
        // Ensure consistent structure for the task.booking object
        // The join returns it as 'booking', so we just use that.
        // We cast to any to avoid TS wars with strict types for now
        
        if (bookingTime >= nowTs) {
          upcoming.push(task);
        } else {
          past.push(task);
        }
      });

      setUpcomingTasks(upcoming);
      setPastTasks(past);      

    } catch (error) {
      console.error('Error fetching assistant dashboard data:', error);
      toast.error(t('toasts.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTaskComplete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('booking_checklist_items')
        .update({ 
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success(t('toasts.completeSuccess'));
      // Remove from local state
      setUpcomingTasks(prev => prev.filter(t => t.id !== taskId));
      setPastTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error(t('toasts.completeError'));
    }
  };

  const openCommentDialog = (task: ChecklistItem) => {
    setEditingTask(task);
    setCommentText(task.comment || "");
  };

  const handleSaveComment = async () => {
    if (!editingTask) return;

    try {
      const { error } = await supabase
        .from('booking_checklist_items')
        .update({ 
          comment: commentText,
          // Update updated_at if you have it, but for now just comment
        })
        .eq('id', editingTask.id);

      if (error) throw error;

      toast.success(t('toasts.commentSuccess'));
      
      // Update local state
      setUpcomingTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, comment: commentText } : t));
      setPastTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, comment: commentText } : t));
      
      setEditingTask(null);
    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error(t('toasts.commentError'));
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center">{t('loading')}</div>;
  }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT COLUMN: PENDING TASKS */}
        <div className="space-y-6 md:col-span-1">
          
          {/* PAST PENDING TASKS SECTION */}
          {(pastTasks.length > 0) && (
            <Card className="border-destructive/50 bg-destructive/5" style={{borderRadius: "10px"}}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <HugeiconsIcon icon={CheckListIcon} className="h-5 w-5" />
                  {t('sections.overdueTasks')} ({pastTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pastTasks.map(task => (
                    <div key={task.id} className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg border border-destructive/20" style={{borderRadius: "10px"}}>
                      <Checkbox 
                        id={`task-${task.id}`} 
                        onCheckedChange={() => handleTaskComplete(task.id)}
                        className="rounded-full"
                      />
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <label 
                            htmlFor={`task-${task.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mt-1"
                          >
                            {task.content}
                          </label>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-primary shrink-0"
                            onClick={() => openCommentDialog(task)}
                          >
                            <HugeiconsIcon icon={Edit02Icon} className="h-4 w-4" />
                            <span className="sr-only">{t('tasks.editComment')}</span>
                          </Button>
                        </div>
                        {task.comment && (
                          <div className="bg-destructive/10 text-destructive text-xs p-2 rounded-md italic">
                             &quot;{task.comment}&quot;
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t('tasks.for')}: <Link href={`/dashboard/bookings?id=${task.booking_id}`} className="hover:underline text-primary">
                            {Array.isArray(task.booking?.users) ? task.booking?.users[0]?.first_name : task.booking?.users?.first_name} {Array.isArray(task.booking?.users) ? task.booking?.users[0]?.last_name : task.booking?.users?.last_name}
                          </Link>  • {task.booking?.services?.name} • <span className="text-primary">{task.booking?.start_time ? format(new Date(task.booking.start_time), 'MMM d, HH:mm') : t('tasks.noDate')}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* UPCOMING TASKS SECTION */}
          <Card style={{borderRadius: "10px"}}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={CheckListIcon} className="h-5 w-5" />
                {t('sections.upcomingTasks')} ({upcomingTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('tasks.empty')}</p>
              ) : (
                <div className="space-y-4">
                  {upcomingTasks.map(task => (
                    <div key={task.id} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg" style={{borderRadius: "10px"}}>
                      <Checkbox 
                        id={`task-${task.id}`} 
                        onCheckedChange={() => handleTaskComplete(task.id)}
                        className="rounded-full"
                      />
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <label 
                            htmlFor={`task-${task.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mt-1"
                          >
                            {task.content}
                          </label>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-primary shrink-0"
                            onClick={() => openCommentDialog(task)}
                          >
                            <HugeiconsIcon icon={Edit02Icon} className="h-4 w-4" />
                            <span className="sr-only">{t('tasks.editComment')}</span>
                          </Button>
                        </div>
                        {task.comment && (
                          <div className="bg-primary/5 text-primary text-xs p-2 rounded-md italic border border-primary/10">
                             &quot;{task.comment}&quot;
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t('tasks.for')}: <Link href={`/dashboard/bookings?id=${task.booking_id}`} className="hover:underline text-primary">
                            {Array.isArray(task.booking?.users) ? task.booking?.users[0]?.first_name : task.booking?.users?.first_name} {Array.isArray(task.booking?.users) ? task.booking?.users[0]?.last_name : task.booking?.users?.last_name}
                          </Link> • {task.booking?.services?.name} • <span className="text-primary">{task.booking?.start_time ? format(new Date(task.booking.start_time), 'MMM d, HH:mm') : t('tasks.noDate')}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* UPCOMING APPOINTMENTS SECTION */}
        <Card style={{borderRadius: "10px"}} className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Calendar02Icon} className="h-5 w-5" />
              {t('sections.upcomingAppointments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingBookings.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('appointments.empty')}</p>
              ) : (
                upcomingBookings.map(booking => (
                  <div key={booking.id} className="flex flex-col p-3 border rounded-lg gap-2" style={{borderRadius: "10px"}}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <HugeiconsIcon icon={UserIcon} className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {Array.isArray(booking.users) ? booking.users[0]?.first_name : booking.users?.first_name} {Array.isArray(booking.users) ? booking.users[0]?.last_name : booking.users?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.services?.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(booking.start_time), 'HH:mm')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(booking.start_time), 'MMM d')}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => openInternalNoteDialog(booking)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          {booking.internal_notes ? 'Edit Note' : 'Add Note'}
                        </Button>
                      </div>
                    </div>
                    {booking.internal_notes && (
                      <div className="text-xs italic text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 flex items-start gap-2">
                         <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 shrink-0 mt-0.5" />
                         <span>{booking.internal_notes}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div className="pt-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/bookings">{t('appointments.viewAll')}</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-[425px]" style={{borderRadius: "10px"}}>
          <DialogHeader>
            <DialogTitle>{t('dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="comment">{t('dialog.label')}</Label>
              <Textarea
                id="comment"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('dialog.placeholder')}
                className="col-span-3"
                style={{borderRadius: "10px"}}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>{t('dialog.cancel')}</Button>
            <Button onClick={handleSaveComment}>{t('dialog.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingInternalNote} onOpenChange={(open) => !open && setEditingInternalNote(null)}>
        <DialogContent className="sm:max-w-[425px]" style={{borderRadius: "10px"}}>
          <DialogHeader>
            <DialogTitle>{t('noteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('noteDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="internal-note">{t('noteDialog.label')}</Label>
              <Textarea
                id="internal-note"
                value={internalNoteText}
                onChange={(e) => setInternalNoteText(e.target.value)}
                placeholder={t('noteDialog.placeholder')}
                className="col-span-3"
                style={{borderRadius: "10px"}}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInternalNote(null)} disabled={isSavingNote}>{t('dialog.cancel')}</Button>
            <Button onClick={handleSaveInternalNote} disabled={isSavingNote}>
              {isSavingNote ? t('dialog.saving') : t('dialog.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
