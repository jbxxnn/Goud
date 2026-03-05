'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Booking } from '@/lib/types/booking';
import { parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { nl, enUS } from 'date-fns/locale';
import Link from 'next/link';
import { InformationCircleIcon,
  Loading03Icon,
  UserIcon,
  CheckListIcon,
  Edit02Icon,
  Calendar02Icon,
  Task01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
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
import { Skeleton } from '@/components/ui/skeleton';
import { CreateTaskDialog } from '@/components/dashboard/create-task-dialog';

function AssistantDashboardSkeleton() {
  return (
    <div className="container py-8 space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6 md:col-span-1">
          {/* Overdue/Past Tasks Skeleton */}
          <Card className="border-destructive/20 bg-destructive/5" style={{ borderRadius: "10px" }}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg border border-destructive/10" style={{ borderRadius: "10px" }}>
                  <Skeleton className="h-4 w-4 rounded-full shrink-0 mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-6 w-6 rounded-md" />
                    </div>
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming Tasks Skeleton */}
          <Card style={{ borderRadius: "10px" }}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg" style={{ borderRadius: "10px" }}>
                  <Skeleton className="h-4 w-4 rounded-full shrink-0 mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-6 w-6 rounded-md" />
                    </div>
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* No Show Appointments Skeleton */}
        <Card style={{ borderRadius: "10px" }} className="md:col-span-1">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col p-3 border rounded-lg gap-3" style={{ borderRadius: "10px" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-20 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
            <Skeleton className="h-10 w-full mt-2" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ChecklistItem {
  id: string;
  booking_id?: string | null;
  content: string;
  is_completed: boolean;
  comment?: string | null;
  booking?: DashboardBooking | null;
  isGeneral?: boolean;
  created_at?: string;
  due_date?: string | null;
  creator?: { first_name: string; last_name: string } | null;
}

interface DashboardBooking extends Booking {
  users: any; // Override strictly typed Booking to allow array or object from Supabase
  noShowCount?: number;
}

export default function AssistantDashboard() {
  const t = useTranslations('AssistantDashboard');
  const locale = useLocale();
  const [upcomingBookings, setUpcomingBookings] = useState<DashboardBooking[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<ChecklistItem[]>([]);
  const [pastTasks, setPastTasks] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Comment editing state
  const [editingTask, setEditingTask] = useState<ChecklistItem | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);

  // Internal Note editing state
  const [editingInternalNote, setEditingInternalNote] = useState<DashboardBooking | null>(null);
  const [internalNoteText, setInternalNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // No-show resolution state
  const [resolvingBooking, setResolvingBooking] = useState<DashboardBooking | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  
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
      
      // 1. Fetch no-show bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          internal_notes,
          users!created_by(first_name, last_name, email, phone),
          services(name, duration),
          locations(name),
          staff(first_name, last_name)
        `)
        .eq('status', 'no_show')
        .is('no_show_resolved_at', null)
        .order('start_time', { ascending: false })
        .limit(20);

      if (bookingsError) {
        console.error('Bookings Fetch Error:', bookingsError);
        throw bookingsError;
      }

      // 1.5 Fetch no-show counts for these clients
      const userIds = Array.from(new Set([
        ...(bookings?.map(b => b.client_id) || []),
        ...(bookings?.map(b => b.created_by) || [])
      ])).filter(Boolean) as string[];

      let bookingsWithCounts = bookings as any[] || [];
      
      if (userIds.length > 0) {
        const { data: countsData } = await supabase
          .from('bookings')
          .select('client_id, created_by, id')
          .eq('status', 'no_show')
          .or(`client_id.in.(${userIds.join(',')}),created_by.in.(${userIds.join(',')})`);
        
        const countMap = (countsData || []).reduce((acc: Record<string, number>, curr) => {
          // Count for each user ID involved
          if (curr.client_id) acc[curr.client_id] = (acc[curr.client_id] || 0) + 1;
          if (curr.created_by && curr.created_by !== curr.client_id) {
            acc[curr.created_by] = (acc[curr.created_by] || 0) + 1;
          }
          return acc;
        }, {});

        bookingsWithCounts = bookingsWithCounts.map(b => {
          const mainId = b.created_by || b.client_id;
          return {
            ...b,
            noShowCount: mainId ? (countMap[mainId] || 0) : 0
          };
        });
      }

      setUpcomingBookings(bookingsWithCounts);

      // 2. Fetch ALL pending checklist items for non-cancelled bookings
      const { data: bookingTasks, error: tasksError } = await supabase
        .from('booking_checklist_items')
        .select(`
          *,
          booking:bookings!inner (
            id,
            start_time,
            status,
            users!created_by (first_name, last_name, email, phone),
            services (name, duration),
            staff (first_name, last_name)
          )
        `)
        .eq('is_completed', false)
        .neq('booking.status', 'cancelled')
        .order('created_at', { ascending: true });

      if (tasksError) {
        console.error('Booking Tasks Fetch Error:', tasksError);
        throw tasksError;
      }

      // 3. Fetch general tasks
      const { data: generalTasks, error: generalTasksError } = await supabase
        .from('assistant_tasks')
        .select('*, creator:users!created_by(first_name, last_name)')
        .eq('is_completed', false)
        .order('created_at', { ascending: true });

      if (generalTasksError) {
        console.error('General Tasks Fetch Error:', generalTasksError);
        throw generalTasksError;
      }

      // Combine and split into upcoming and past tasks
      const upcoming: ChecklistItem[] = [];
      const past: ChecklistItem[] = [];
      const nowTs = new Date().getTime();

      // Process booking tasks
      (bookingTasks as any)?.forEach((task: any) => {
        if (task.booking?.status === 'cancelled') return;
        const bookingTime = new Date(task.booking?.start_time || '').getTime();
        
        if (bookingTime >= nowTs) {
          upcoming.push(task);
        } else {
          past.push(task);
        }
      });

      // Process general tasks
      (generalTasks as any)?.forEach((task: any) => {
        const item: ChecklistItem = {
          ...task,
          isGeneral: true
        };

        // If it has a due date in the future, it's upcoming
        // Otherwise (past due date or no due date), it's "overdue/past" (meaning it needs attention now)
        if (task.due_date && new Date(task.due_date).getTime() > nowTs) {
          upcoming.push(item);
        } else {
          past.push(item);
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

  const handleTaskComplete = async (task: ChecklistItem, skipToast = false) => {
    try {
      const table = task.isGeneral ? 'assistant_tasks' : 'booking_checklist_items';
      const { error } = await supabase
        .from(table)
        .update({ 
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;

      if (!skipToast) {
        toast.success(t('toasts.completeSuccess'));
      }
      // Remove from local state
      setUpcomingTasks(prev => prev.filter(t => t.id !== task.id));
      setPastTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error(t('toasts.completeError'));
    }
  };

  const openCommentDialog = (task: ChecklistItem) => {
    setEditingTask(task);
    setCommentText(task.comment || "");
    setIsTaskCompleted(false);
  };

  const handleSaveComment = async () => {
    if (!editingTask) return;

    try {
      // If marked as completed, we handle that first
      if (isTaskCompleted) {
        await handleTaskComplete(editingTask, true);
      }

      const table = editingTask.isGeneral ? 'assistant_tasks' : 'booking_checklist_items';
      const { error } = await supabase
        .from(table)
        .update({ 
          comment: commentText,
        })
        .eq('id', editingTask.id);

      if (error) throw error;

      if (isTaskCompleted) {
        toast.success(t('toasts.completeSuccess'));
      } else {
        toast.success(t('toasts.commentSuccess'));
      }
      
      // Update local state (if not removed by completion)
      if (!isTaskCompleted) {
        setUpcomingTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, comment: commentText } : t));
        setPastTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, comment: commentText } : t));
      }
      
      setEditingTask(null);
    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error(t('toasts.commentError'));
    }
  };

  const openResolutionDialog = (booking: DashboardBooking) => {
    setResolvingBooking(booking);
    setResolutionNote(booking.internal_notes || "");
  };

  const handleResolveNoShow = async () => {
    if (!resolvingBooking) return;

    try {
      setIsResolving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          internal_notes: resolutionNote.trim() || null,
          no_show_resolved_at: new Date().toISOString(),
          no_show_resolved_by: user?.id
        })
        .eq('id', resolvingBooking.id);

      if (error) throw error;

      toast.success(t('toasts.resolveSuccess', { fallback: 'No-show resolved successfully' }));
      
      // Remove from local state live
      setUpcomingBookings(prev => prev.filter(b => b.id !== resolvingBooking.id));
      
      setResolvingBooking(null);
    } catch (error) {
      console.error('Error resolving no-show:', error);
      toast.error(t('toasts.resolveError', { fallback: 'Failed to resolve no-show' }));
    } finally {
      setIsResolving(false);
    }
  };

  if (loading) {
    return <AssistantDashboardSkeleton />;
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <CreateTaskDialog onTaskCreated={fetchData} />
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
                      <div className="space-y-1 w-full">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {task.isGeneral ? (
                              <HugeiconsIcon icon={Task01Icon} className="h-4 w-4 text-primary shrink-0" />
                            ) : null}
                            <p className="text-sm font-medium leading-none mt-1 line-clamp-1" title={task.content}>
                              {task.content}
                            </p>
                            {task.isGeneral && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase font-bold tracking-wider bg-primary/10 text-primary border-primary/20 shrink-0">
                                {t('tasks.general', { fallback: 'General' })}
                              </Badge>
                            )}
                          </div>
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
                        <p className="text-xs text-muted-foreground flex flex-wrap gap-x-1">
                          {!task.isGeneral ? (
                            <>
                              {task.booking?.staff && (
                                <>
                                  <span className="font-medium text-primary">{task.booking.staff.first_name} {task.booking.staff.last_name}</span>
                                  <span className="text-muted-foreground/50">•</span>
                                </>
                              )}
                              <span>{task.booking?.services?.name}</span>
                              <span className="text-muted-foreground/50">•</span>
                              <Link href={`/dashboard/bookings?id=${task.booking_id}`} className="hover:underline">
                                {Array.isArray(task.booking?.users) ? task.booking?.users[0]?.first_name : task.booking?.users?.first_name} {Array.isArray(task.booking?.users) ? task.booking?.users[0]?.last_name : task.booking?.users?.last_name}
                              </Link>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="text-primary">
                                {task.booking?.start_time ? formatInTimeZone(new Date(task.booking.start_time), 'Europe/Amsterdam', 'MMM d, HH:mm', { locale: locale === 'nl' ? nl : enUS }) : t('tasks.noDate')}
                              </span>
                            </>
                          ) : (
                            <span className="text-primary italic">
                              {task.created_at ? t('tasks.droppedOn', { date: formatInTimeZone(new Date(task.created_at), 'Europe/Amsterdam', 'MMM d, HH:mm', { locale: locale === 'nl' ? nl : enUS }) }) : ''}
                              {task.creator && ` ${t('tasks.droppedBy', { name: `${task.creator.first_name} ${task.creator.last_name}` })}`}
                            </span>
                          )}
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
                      <div className="space-y-1 w-full">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {task.isGeneral ? (
                              <HugeiconsIcon icon={Task01Icon} className="h-4 w-4 text-primary shrink-0" />
                            ) : null}
                            <p className="text-sm font-medium leading-none mt-1 line-clamp-1" title={task.content}>
                              {task.content}
                            </p>
                            {task.isGeneral && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase font-bold tracking-wider bg-primary/10 text-primary border-primary/20 shrink-0">
                                {t('tasks.general', { fallback: 'General' })}
                              </Badge>
                            )}
                          </div>
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
                        <p className="text-xs text-muted-foreground flex flex-wrap gap-x-1">
                          {!task.isGeneral ? (
                            <>
                              {task.booking?.staff && (
                                <>
                                  <span className="font-medium text-primary">{task.booking.staff.first_name} {task.booking.staff.last_name}</span>
                                  <span className="text-muted-foreground/50">•</span>
                                </>
                              )}
                              <span>{task.booking?.services?.name}</span>
                              <span className="text-muted-foreground/50">•</span>
                              <Link href={`/dashboard/bookings?id=${task.booking_id}`} className="hover:underline">
                                {Array.isArray(task.booking?.users) ? task.booking?.users[0]?.first_name : task.booking?.users?.first_name} {Array.isArray(task.booking?.users) ? task.booking?.users[0]?.last_name : task.booking?.users?.last_name}
                              </Link>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="text-primary">
                                {task.booking?.start_time ? formatInTimeZone(new Date(task.booking.start_time), 'Europe/Amsterdam', 'MMM d, HH:mm', { locale: locale === 'nl' ? nl : enUS }) : t('tasks.noDate')}
                              </span>
                            </>
                          ) : (
                            <span className="text-primary italic">
                              {task.created_at ? t('tasks.droppedOn', { date: formatInTimeZone(new Date(task.created_at), 'Europe/Amsterdam', 'MMM d, HH:mm', { locale: locale === 'nl' ? nl : enUS }) }) : ''}
                              {task.creator && ` ${t('tasks.droppedBy', { name: `${task.creator.first_name} ${task.creator.last_name}` })}`}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* NO SHOW APPOINTMENTS SECTION */}
        <Card style={{borderRadius: "10px"}} className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Calendar02Icon} className="h-5 w-5" />
              {t('sections.noShowAppointments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingBookings.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('appointments.empty')}</p>
              ) : (
                upcomingBookings.map(booking => (
                  <div 
                    key={booking.id} 
                    className="flex flex-col p-3 bg-muted border rounded-lg gap-2 cursor-pointer hover:bg-muted/80 transition-colors" 
                    style={{borderRadius: "10px"}}
                    onClick={() => openResolutionDialog(booking)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-primary/10 p-2 rounded-full shrink-0">
                          <HugeiconsIcon icon={UserIcon} className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {Array.isArray(booking.users) ? booking.users[0]?.first_name : booking.users?.first_name} {Array.isArray(booking.users) ? booking.users[0]?.last_name : booking.users?.last_name}
                            {booking.noShowCount && booking.noShowCount > 0 && (
                              <span className="ml-1.5 text-destructive font-bold">
                                ({booking.noShowCount})
                              </span>
                            )}
                          </p>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-1 mt-0.5">
                            {booking.staff && (
                              <>
                                <span className="font-medium text-primary line-clamp-1">{booking.staff.first_name} {booking.staff.last_name}</span>
                                <span className="text-muted-foreground/50">•</span>
                              </>
                            )}
                            <span className="line-clamp-1">{booking.services?.name}</span>
                            {booking.locations?.name && (
                              <>
                                <span className="text-muted-foreground/50">•</span>
                                <span className="line-clamp-1 italic">{booking.locations.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col justify-center">
                        <p className="text-sm font-bold text-foreground">
                          {formatInTimeZone(new Date(booking.start_time), 'Europe/Amsterdam', 'HH:mm')}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                          {formatInTimeZone(new Date(booking.start_time), 'Europe/Amsterdam', 'MMM d', { locale: locale === 'nl' ? nl : enUS })}
                        </p>
                      </div>
                    </div>
                    {booking.internal_notes && (
                      <div className="text-[11px] leading-relaxed italic text-blue-700 bg-blue-50/80 p-2 rounded-md border border-blue-100/50 flex items-start gap-2 mt-1">
                         <HugeiconsIcon icon={InformationCircleIcon} className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                         <span className="line-clamp-2">{booking.internal_notes}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div className="pt-2">
                {/* <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/bookings">{t('appointments.viewAll')}</Link>
                </Button> */}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-[425px]" style={{borderRadius: "10px"}}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingTask?.isGeneral ? (
                <HugeiconsIcon icon={Task01Icon} className="h-5 w-5 text-primary" />
              ) : (
                <HugeiconsIcon icon={CheckListIcon} className="h-5 w-5 text-primary" />
              )}
              {editingTask?.isGeneral ? t('dialog.generalTitle', { fallback: 'General Task' }) : t('dialog.title')}
            </DialogTitle>
            <DialogDescription className="text-foreground font-medium">
              {editingTask?.content}
            </DialogDescription>
          </DialogHeader>

          {editingTask?.booking && (
            <div className="bg-muted/50 p-3 space-y-2 text-xs border" style={{borderRadius: "10px"}}>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={UserIcon} className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">Staff:</span>
                <span>
                  {editingTask.booking.staff ? 
                    `${editingTask.booking.staff.first_name} ${editingTask.booking.staff.last_name}` : 
                    'Unassigned'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={CheckListIcon} className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">Service:</span>
                <span>{editingTask.booking.services?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={UserIcon} className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">Client:</span>
                <span>
                  {Array.isArray(editingTask.booking.users) ? editingTask.booking.users[0]?.first_name : editingTask.booking.users?.first_name}{' '}
                  {Array.isArray(editingTask.booking.users) ? editingTask.booking.users[0]?.last_name : editingTask.booking.users?.last_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Calendar02Icon} className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">Date/Time:</span>
                <span>
                  {editingTask.booking.start_time ? 
                    formatInTimeZone(new Date(editingTask.booking.start_time), 'Europe/Amsterdam', 'PPP, HH:mm', { locale: locale === 'nl' ? nl : enUS }) : 
                    'No date'}
                </span>
              </div>
            </div>
          )}

          <div className="grid gap-4 py-4">
            
            <div className="grid gap-2">
              <Label htmlFor="comment">{t('dialog.label')}</Label>
              <Textarea
                id="comment"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('dialog.placeholder')}
                className="col-span-3 min-h-[100px]"
                style={{borderRadius: "10px"}}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="complete-task" 
                checked={isTaskCompleted}
                onCheckedChange={(checked) => setIsTaskCompleted(checked === true)}
                className="rounded-full"
              />
              <Label 
                htmlFor="complete-task"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {t('tasks.markComplete', { fallback: 'Mark as Completed' })}
              </Label>
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

      <Dialog open={!!resolvingBooking} onOpenChange={(open) => !open && setResolvingBooking(null)}>
        <DialogContent className="sm:max-w-[425px]" style={{borderRadius: "10px"}}>
          <DialogHeader>
            <DialogTitle>{t('resolveDialog.title', { fallback: 'Resolve No-Show' })}</DialogTitle>
            <DialogDescription>
              {t('resolveDialog.description', { fallback: 'Document what actions were taken and mark as resolved.' })}
            </DialogDescription>
          </DialogHeader>
          
          {resolvingBooking && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <p className="font-semibold">
                  {Array.isArray(resolvingBooking.users) ? resolvingBooking.users[0]?.first_name : resolvingBooking.users?.first_name} {Array.isArray(resolvingBooking.users) ? resolvingBooking.users[0]?.last_name : resolvingBooking.users?.last_name}
                </p>
                <p className="text-muted-foreground italic">{resolvingBooking.services?.name}</p>
                <div className="flex flex-col gap-0.5 mt-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <HugeiconsIcon icon={Calendar02Icon} className="h-3 w-3" />
                    {formatInTimeZone(new Date(resolvingBooking.start_time), 'Europe/Amsterdam', 'PPP, HH:mm', { locale: locale === 'nl' ? nl : enUS })}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <HugeiconsIcon icon={UserIcon} className="h-3 w-3" />
                    {resolvingBooking.staff ? 
                      `${resolvingBooking.staff.first_name} ${resolvingBooking.staff.last_name}` : 
                      'Unassigned'}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <HugeiconsIcon icon={InformationCircleIcon} className="h-3 w-3" />
                    {resolvingBooking.locations?.name || 'Unknown Location'}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="resolution-note">{t('resolveDialog.label', { fallback: 'Actions Taken' })}</Label>
                <Textarea
                  id="resolution-note"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder={t('resolveDialog.placeholder', { fallback: 'E.g., Called client, left voicemail...' })}
                  className="min-h-[100px]"
                  style={{borderRadius: "10px"}}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvingBooking(null)} disabled={isResolving}>
              {t('dialog.cancel')}
            </Button>
            <Button onClick={handleResolveNoShow} disabled={isResolving}>
              {isResolving ? t('dialog.saving') : t('dialog.complete', { fallback: 'Complete & Resolve' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
