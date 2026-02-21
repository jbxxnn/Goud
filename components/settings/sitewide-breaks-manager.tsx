'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BlackoutPeriod, SitewideBreak } from '@/lib/types/shift';
import { format, parseISO } from 'date-fns';
import { Loader, Trash2, Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimeInput } from '@/components/ui/time-input';
import { Time } from '@internationalized/date';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar02Icon } from '@hugeicons/core-free-icons';

export function SitewideBreaksManager({ activeTab }: { activeTab: 'holidays' | 'breaks' }) {
  const [holidays, setHolidays] = useState<BlackoutPeriod[]>([]);
  const [sitewideBreaks, setSitewideBreaks] = useState<SitewideBreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingHoliday, setSubmittingHoliday] = useState(false);
  const [submittingBreak, setSubmittingBreak] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [breakStartDateOpen, setBreakStartDateOpen] = useState(false);
  const [breakEndDateOpen, setBreakEndDateOpen] = useState(false);

  const [editingHoliday, setEditingHoliday] = useState<BlackoutPeriod | null>(null);
  const [submittingEditHoliday, setSubmittingEditHoliday] = useState(false);
  const [editHolidayStartDateOpen, setEditHolidayStartDateOpen] = useState(false);
  const [editHolidayEndDateOpen, setEditHolidayEndDateOpen] = useState(false);

  const [editingBreak, setEditingBreak] = useState<SitewideBreak | null>(null);
  const [submittingEditBreak, setSubmittingEditBreak] = useState(false);
  const [editBreakStartDateOpen, setEditBreakStartDateOpen] = useState(false);
  const [editBreakEndDateOpen, setEditBreakEndDateOpen] = useState(false);

  const formatDateTimeLocal = (isoString: string): string => {
    const { formatInTimeZone } = require('date-fns-tz');
    return formatInTimeZone(new Date(isoString), 'Europe/Amsterdam', "yyyy-MM-dd'T'HH:mm");
  };

  const createLocalIsoString = (localDateTimeStr: string): string => {
    const { formatInTimeZone, toDate } = require('date-fns-tz');
    const amsterdamDate = toDate(`${localDateTimeStr}:00`, { timeZone: 'Europe/Amsterdam' });
    return formatInTimeZone(amsterdamDate, 'Europe/Amsterdam', "yyyy-MM-dd'T'HH:mm:ssXXX");
  };

  const [newHoliday, setNewHoliday] = useState({
    start_date: '',
    end_date: '',
    reason: '',
  });

  const [newBreak, setNewBreak] = useState({
    name: '',
    start_time: '',
    end_time: '',
    start_date: '',
    end_date: '',
    is_recurring: true,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [holidaysRes, breaksRes] = await Promise.all([
        fetch('/api/blackout-periods?global=true'),
        fetch('/api/sitewide-breaks?active_only=true')
      ]);
      
      const holidaysData = await holidaysRes.json();
      const breaksData = await breaksRes.json();
      
      if (holidaysData.success) {
        setHolidays(holidaysData.data.filter((b: BlackoutPeriod) => b.location_id === null && b.staff_id === null));
      } else {
        toast.error('Failed to load holidays');
      }
      
      if (breaksData.success) {
        setSitewideBreaks(breaksData.data);
      } else {
        toast.error('Failed to load sitewide breaks');
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.start_date || !newHoliday.end_date || !newHoliday.reason) return;

    try {
      setSubmittingHoliday(true);
      const response = await fetch('/api/blackout-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newHoliday,
          location_id: null,
          staff_id: null,
          is_active: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Holiday created');
        setNewHoliday({ start_date: '', end_date: '', reason: '' });
        fetchData();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to create holiday');
    } finally {
      setSubmittingHoliday(false);
    }
  };

  const handleCreateBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBreak.start_time || !newBreak.end_time || !newBreak.name) return;

    try {
      setSubmittingBreak(true);
      
      const localDate = newBreak.start_date || format(new Date(), 'yyyy-MM-dd');
      let formattedStartTime = createLocalIsoString(`${localDate}T${newBreak.start_time}`);
      let formattedEndTime = createLocalIsoString(`${localDate}T${newBreak.end_time}`);

      const payload = {
        name: newBreak.name,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        is_recurring: newBreak.is_recurring,
        start_date: newBreak.is_recurring ? null : (newBreak.start_date || null),
        end_date: newBreak.is_recurring ? null : (newBreak.end_date || null),
      };
      
      const response = await fetch('/api/sitewide-breaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Sitewide break created');
        setNewBreak({ name: '', start_time: '', end_time: '', start_date: '', end_date: '', is_recurring: true });
        fetchData();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to create break');
    } finally {
      setSubmittingBreak(false);
    }
  };

  const handleUpdateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday || !editingHoliday.start_date || !editingHoliday.end_date || !editingHoliday.reason) return;

    try {
      setSubmittingEditHoliday(true);
      const response = await fetch(`/api/blackout-periods/${editingHoliday.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: editingHoliday.start_date,
          end_date: editingHoliday.end_date,
          reason: editingHoliday.reason,
          location_id: null,
          staff_id: null,
          is_active: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Holiday updated');
        setEditingHoliday(null);
        fetchData();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to update holiday');
    } finally {
      setSubmittingEditHoliday(false);
    }
  };

  const handleUpdateBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBreak || !editingBreak.start_time || !editingBreak.end_time || !editingBreak.name) return;

    try {
      setSubmittingEditBreak(true);
      
      const localDate = editingBreak.start_date || format(new Date(), 'yyyy-MM-dd');
      let formattedStartTime = createLocalIsoString(`${localDate}T${editingBreak.start_time}`);
      let formattedEndTime = createLocalIsoString(`${localDate}T${editingBreak.end_time}`);

      const payload = {
        name: editingBreak.name,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        is_recurring: editingBreak.is_recurring,
        start_date: editingBreak.is_recurring ? null : (editingBreak.start_date || null),
        end_date: editingBreak.is_recurring ? null : (editingBreak.end_date || null),
      };
      
      const response = await fetch(`/api/sitewide-breaks/${editingBreak.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Sitewide break updated');
        setEditingBreak(null);
        fetchData();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to update break');
    } finally {
      setSubmittingEditBreak(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      const response = await fetch(`/api/blackout-periods/${id}`, { method: 'DELETE' });
      if (response.ok) {
         toast.success('Holiday deleted');
         fetchData();
      } else {
         toast.error('Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleDeleteBreak = async (id: string) => {
    try {
      const response = await fetch(`/api/sitewide-breaks/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
         toast.success('Break deleted');
         fetchData();
      } else {
         toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      {activeTab === 'holidays' && (
          <Card className='shadow-none' style={{borderRadius: '10px'}}>
            <CardHeader>
              <CardTitle>Holidays</CardTitle>
              <CardDescription>
                These strict limits completely block booking across ALL locations and ALL staff during the given timeframe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateHoliday} className="grid gap-2 md:grid-cols-4 2xl:grid-cols-4 items-end mb-6">
                <div className="grid gap-2 min-w-0">
                  <Label>Start Date & Time</Label>
                  <div className="flex gap-2 min-w-0">
                    <Popover modal={true} open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal h-10 px-3 border-input bg-background",
                            !newHoliday.start_date && "text-muted-foreground"
                          )}
                        >
                          <HugeiconsIcon icon={Calendar02Icon} />
                          <span className="truncate">
                            {newHoliday.start_date ? format(new Date(newHoliday.start_date), "P") : "Pick date"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newHoliday.start_date ? new Date(newHoliday.start_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const current = newHoliday.start_date ? new Date(newHoliday.start_date) : new Date();
                              date.setHours(current.getHours(), current.getMinutes());
                              const newStartDateStr = formatDateTimeLocal(date.toISOString());
                              
                              // Auto-populate end date with same date
                              const endCurrent = newHoliday.end_date ? new Date(newHoliday.end_date) : new Date();
                              const newEndDate = new Date(date);
                              newEndDate.setHours(endCurrent.getHours(), endCurrent.getMinutes());
                              const newEndDateStr = formatDateTimeLocal(newEndDate.toISOString());
                              
                              setNewHoliday({ 
                                ...newHoliday, 
                                start_date: newStartDateStr,
                                end_date: newEndDateStr 
                              });
                              setStartDateOpen(false);
                            }
                          }}
                          initialFocus
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={2030}
                        />
                      </PopoverContent>
                    </Popover>
                    <TimeInput
                      className="flex-1 min-w-[100px]"
                      style={{borderRadius: "10px"}}
                      dateInputClassName="h-10"
                      hourCycle={24}
                      value={newHoliday.start_date && !isNaN(new Date(newHoliday.start_date).getTime()) ? new Time(new Date(newHoliday.start_date).getHours(), new Date(newHoliday.start_date).getMinutes()) : null}
                      onChange={(time) => {
                        if (time) {
                          const date = newHoliday.start_date ? new Date(newHoliday.start_date) : new Date();
                          date.setHours(time.hour, time.minute);
                          setNewHoliday({ ...newHoliday, start_date: formatDateTimeLocal(date.toISOString()) });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-2 min-w-0">
                  <Label>End Date & Time</Label>
                  <div className="flex gap-2 min-w-0">
                    <Popover modal={true} open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal h-10 px-3 border-input bg-background min-w-0",
                            !newHoliday.end_date && "text-muted-foreground"
                          )}
                        >
                         <HugeiconsIcon icon={Calendar02Icon} />
                          <span className="truncate">
                            {newHoliday.end_date ? format(new Date(newHoliday.end_date), "P") : "Pick date"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newHoliday.end_date ? new Date(newHoliday.end_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const current = newHoliday.end_date ? new Date(newHoliday.end_date) : new Date();
                              date.setHours(current.getHours(), current.getMinutes());
                              setNewHoliday({ ...newHoliday, end_date: formatDateTimeLocal(date.toISOString()) });
                              setEndDateOpen(false);
                            }
                          }}
                          initialFocus
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={2030}
                        />
                      </PopoverContent>
                    </Popover>
                    <TimeInput
                      className="flex-1 min-w-[100px]"
                      dateInputClassName="h-10"
                      hourCycle={24}
                      value={newHoliday.end_date && !isNaN(new Date(newHoliday.end_date).getTime()) ? new Time(new Date(newHoliday.end_date).getHours(), new Date(newHoliday.end_date).getMinutes()) : null}
                      onChange={(time) => {
                        if (time) {
                          const date = newHoliday.end_date ? new Date(newHoliday.end_date) : new Date();
                          date.setHours(time.hour, time.minute);
                          setNewHoliday({ ...newHoliday, end_date: formatDateTimeLocal(date.toISOString()) });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="h_reason">Reason</Label>
                  <Input
                    id="h_reason"
                    className='h-10'
                    style={{borderRadius: '10px'}}
                    placeholder="e.g. Holiday"
                    value={newHoliday.reason}
                    onChange={(e) => setNewHoliday({ ...newHoliday, reason: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" disabled={submittingHoliday} style={{borderRadius: '10px'}} className='h-10'>
                  {submittingHoliday ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Holiday
                </Button>
              </form>

              <div className="rounded-md border bg-background" style={{borderRadius: '10px'}}>
                <Table >
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reason</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <Loader className="w-6 h-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : holidays.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          No holidays configured.
                        </TableCell>
                      </TableRow>
                    ) : (
                      holidays.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.reason}</TableCell>
                          <TableCell>{b.start_date ? format(new Date(b.start_date), 'PPp') : ''}</TableCell>
                          <TableCell>{b.end_date ? format(new Date(b.end_date), 'PPp') : ''}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingHoliday(b)}
                                className="text-secondary-foreground hover:text-foreground"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteHoliday(b.id)}
                                className="text-destructive hover:text-destructive/90"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
      )}

      {activeTab === 'breaks' && (
          <Card className='shadow-none' style={{borderRadius: "10px"}}>
            <CardHeader>
              <CardTitle>Sitewide Breaks</CardTitle>
              <CardDescription>
                These templates are automatically applied to ALL matching shifts. You can customize them from within individual shift details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateBreak} className="p-4 bg-muted/30 rounded-lg border mb-6 space-y-4" style={{borderRadius: "10px"}}>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="b_name">Break Name</Label>
                    <Input
                      id="b_name"
                      placeholder="e.g. Lunch Break"
                      className='h-10'
                      style={{borderRadius: '10px'}}
                      value={newBreak.name}
                      onChange={(e) => setNewBreak({ ...newBreak, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className='flex gap-2'>
                  <div className="grid gap-2">
                    <Label htmlFor="b_start_time">Start Time</Label>
                    <div className="h-10">
                      <TimeInput
                        className="w-full"
                        dateInputClassName="h-10 w-auto bg-background"
                        hourCycle={24}
                        value={newBreak.start_time ? new Time(parseInt(newBreak.start_time.split(':')[0]), parseInt(newBreak.start_time.split(':')[1])) : null}
                        onChange={(time) => {
                          if (time) {
                            setNewBreak({ ...newBreak, start_time: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}` });
                          } else {
                            setNewBreak({ ...newBreak, start_time: '' });
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="b_end_time">End Time</Label>
                    <div className="h-10">
                      <TimeInput
                        className="w-full"
                        dateInputClassName="h-10 w-auto bg-background"
                        hourCycle={24}
                        value={newBreak.end_time ? new Time(parseInt(newBreak.end_time.split(':')[0]), parseInt(newBreak.end_time.split(':')[1])) : null}
                        onChange={(time) => {
                          if (time) {
                            setNewBreak({ ...newBreak, end_time: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}` });
                          } else {
                            setNewBreak({ ...newBreak, end_time: '' });
                          }
                        }}
                      />
                    </div>
                  </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Checkbox 
                    id="b_recurring" 
                    className='rounded-full'
                    checked={newBreak.is_recurring}
                    onCheckedChange={(checked) => setNewBreak({ ...newBreak, is_recurring: checked === true })}
                  />
                  <Label htmlFor="b_recurring" className="font-medium cursor-pointer mb-0">
                    Apply Every Day
                  </Label>
                </div>

                {!newBreak.is_recurring && (
                  <div className="grid gap-4 md:grid-cols-2 pt-2">
                    <div className="grid gap-2">
                      <Label>Start Date (Optional)</Label>
                      <Popover modal={true} open={breakStartDateOpen} onOpenChange={setBreakStartDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-10 px-3 bg-background",
                              !newBreak.start_date && "text-muted-foreground"
                            )}
                          >
                            <HugeiconsIcon icon={Calendar02Icon} />
                            <span className="truncate">
                              {newBreak.start_date ? format(new Date(newBreak.start_date), "P") : "Pick date"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={newBreak.start_date ? new Date(newBreak.start_date) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                // Add 12 hours so we don't accidentally fall back a day due to timezone
                                const safeDate = new Date(date);
                                safeDate.setHours(12);
                                const dateStr = safeDate.toISOString().split('T')[0];
                                
                                setNewBreak({ 
                                  ...newBreak, 
                                  start_date: dateStr,
                                  end_date: dateStr 
                                });
                                setBreakStartDateOpen(false);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-2">
                      <Label>End Date (Optional)</Label>
                      <Popover modal={true} open={breakEndDateOpen} onOpenChange={setBreakEndDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-10 px-3 bg-background",
                              !newBreak.end_date && "text-muted-foreground"
                            )}
                          >
                            <HugeiconsIcon icon={Calendar02Icon} />
                            <span className="truncate">
                              {newBreak.end_date ? format(new Date(newBreak.end_date), "P") : "Pick date"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={newBreak.end_date ? new Date(newBreak.end_date) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const safeDate = new Date(date);
                                safeDate.setHours(12);
                                setNewBreak({ ...newBreak, end_date: safeDate.toISOString().split('T')[0] });
                                setBreakEndDateOpen(false);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
                
                <div className="pt-2">
                  <Button type="submit" disabled={submittingBreak} className="w-full md:w-auto">
                    {submittingBreak ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Break Template
                  </Button>
                </div>
              </form>

              <div className="rounded-md border bg-background" style={{borderRadius: "10px"}}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Recurrence</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <Loader className="w-6 h-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : sitewideBreaks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          No sitewide breaks configured.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sitewideBreaks.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell>{b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)}</TableCell>
                          <TableCell>
                            {b.is_recurring 
                              ? 'Daily' 
                              : (b.start_date || b.end_date) 
                                ? `From ${b.start_date || 'beginning'} to ${b.end_date || 'end'}` 
                                : 'Specific dates'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  // Remove any seconds from start_time / end_time formatting for TimeInput
                                  const breakToEdit = { ...b };
                                  if (breakToEdit.start_time.length > 5) breakToEdit.start_time = breakToEdit.start_time.substring(0, 5);
                                  if (breakToEdit.end_time.length > 5) breakToEdit.end_time = breakToEdit.end_time.substring(0, 5);
                                  // Default start_date and end_date if missing
                                  if (!breakToEdit.start_date) breakToEdit.start_date = '';
                                  if (!breakToEdit.end_date) breakToEdit.end_date = '';
                                  setEditingBreak(breakToEdit);
                                }}
                                className="text-secondary-foreground hover:text-foreground"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteBreak(b.id)}
                                className="text-destructive hover:text-destructive/90"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
      )}

      {/* Edit Holiday Dialog */}
      <Dialog open={!!editingHoliday} onOpenChange={(open) => !open && setEditingHoliday(null)}>
        <DialogContent className="max-w-[300px]" style={{borderRadius: "10px"}}>
          <DialogHeader>
            <DialogTitle>Edit Holiday</DialogTitle>
          </DialogHeader>
          {editingHoliday && (
            <form onSubmit={handleUpdateHoliday} className="grid gap-4 py-4">
              <div className='flex'>
              <div className="grid gap-2 min-w-0">
                  <Label>Start Date & Time</Label>
                  <div className="flex gap-2 min-w-0">
                    <Popover modal={true} open={editHolidayStartDateOpen} onOpenChange={setEditHolidayStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal h-10 px-3 border-input bg-background min-w-0",
                            !editingHoliday.start_date && "text-muted-foreground"
                          )}
                        >
                          <HugeiconsIcon icon={Calendar02Icon} />
                          <span className="truncate">
                            {editingHoliday.start_date ? format(new Date(editingHoliday.start_date), "P") : "Pick date"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editingHoliday.start_date ? new Date(editingHoliday.start_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const current = editingHoliday.start_date ? new Date(editingHoliday.start_date) : new Date();
                              date.setHours(current.getHours(), current.getMinutes());
                              const newStartDateStr = formatDateTimeLocal(date.toISOString());
                              
                              const endCurrent = editingHoliday.end_date ? new Date(editingHoliday.end_date) : new Date();
                              const newEndDate = new Date(date);
                              newEndDate.setHours(endCurrent.getHours(), endCurrent.getMinutes());
                              const newEndDateStr = formatDateTimeLocal(newEndDate.toISOString());
                              
                              setEditingHoliday({ 
                                ...editingHoliday, 
                                start_date: newStartDateStr,
                                end_date: newEndDateStr 
                              });
                              setEditHolidayStartDateOpen(false);
                            }
                          }}
                          initialFocus
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={2030}
                        />
                      </PopoverContent>
                    </Popover>
                    <TimeInput
                      className="flex-1 min-w-[100px]"
                      style={{borderRadius: "10px"}}
                      dateInputClassName="h-10"
                      hourCycle={24}
                      value={editingHoliday.start_date && !isNaN(new Date(editingHoliday.start_date).getTime()) ? new Time(new Date(editingHoliday.start_date).getHours(), new Date(editingHoliday.start_date).getMinutes()) : null}
                      onChange={(time) => {
                        if (time) {
                          const date = editingHoliday.start_date ? new Date(editingHoliday.start_date) : new Date();
                          date.setHours(time.hour, time.minute);
                          setEditingHoliday({ ...editingHoliday, start_date: formatDateTimeLocal(date.toISOString()) });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-2 min-w-0">
                  <Label>End Date & Time</Label>
                  <div className="flex gap-2 min-w-0">
                    <Popover modal={true} open={editHolidayEndDateOpen} onOpenChange={setEditHolidayEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal h-10 px-3 border-input bg-background min-w-0",
                            !editingHoliday.end_date && "text-muted-foreground"
                          )}
                        >
                          <HugeiconsIcon icon={Calendar02Icon} />
                          <span className="truncate">
                            {editingHoliday.end_date ? format(new Date(editingHoliday.end_date), "P") : "Pick date"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editingHoliday.end_date ? new Date(editingHoliday.end_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const current = editingHoliday.end_date ? new Date(editingHoliday.end_date) : new Date();
                              date.setHours(current.getHours(), current.getMinutes());
                              setEditingHoliday({ ...editingHoliday, end_date: formatDateTimeLocal(date.toISOString()) });
                              setEditHolidayEndDateOpen(false);
                            }
                          }}
                          initialFocus
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={2030}
                        />
                      </PopoverContent>
                    </Popover>
                    <TimeInput
                      className="flex-1 min-w-[100px]"
                      dateInputClassName="h-10"
                      hourCycle={24}
                      value={editingHoliday.end_date && !isNaN(new Date(editingHoliday.end_date).getTime()) ? new Time(new Date(editingHoliday.end_date).getHours(), new Date(editingHoliday.end_date).getMinutes()) : null}
                      onChange={(time) => {
                        if (time) {
                          const date = editingHoliday.end_date ? new Date(editingHoliday.end_date) : new Date();
                          date.setHours(time.hour, time.minute);
                          setEditingHoliday({ ...editingHoliday, end_date: formatDateTimeLocal(date.toISOString()) });
                        }
                      }}
                    />
                  </div>
                </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_h_reason">Reason</Label>
                  <Input
                    id="edit_h_reason"
                    className='h-10'
                    style={{borderRadius: '10px'}}
                    value={editingHoliday.reason || ''}
                    onChange={(e) => setEditingHoliday({ ...editingHoliday, reason: e.target.value })}
                    required
                  />
                </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingHoliday(null)}>Cancel</Button>
                <Button type="submit" disabled={submittingEditHoliday} style={{borderRadius: '10px'}}>
                  {submittingEditHoliday ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Break Dialog */}
      <Dialog open={!!editingBreak} onOpenChange={(open) => !open && setEditingBreak(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Sitewide Break</DialogTitle>
          </DialogHeader>
          {editingBreak && (
            <form onSubmit={handleUpdateBreak} className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit_b_name">Break Name</Label>
                    <Input
                      id="edit_b_name"
                      value={editingBreak.name}
                      onChange={(e) => setEditingBreak({ ...editingBreak, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit_b_start_time">Start Time</Label>
                      <div className="h-10">
                        <TimeInput
                          className="w-full"
                          dateInputClassName="h-10 w-full bg-background"
                          hourCycle={24}
                          value={editingBreak.start_time ? new Time(parseInt(editingBreak.start_time.split(':')[0]), parseInt(editingBreak.start_time.split(':')[1])) : null}
                          onChange={(time) => {
                            if (time) {
                              setEditingBreak({ ...editingBreak, start_time: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}` });
                            } else {
                              setEditingBreak({ ...editingBreak, start_time: '' });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit_b_end_time">End Time</Label>
                      <div className="h-10">
                        <TimeInput
                          className="w-full"
                          dateInputClassName="h-10 w-full bg-background"
                          hourCycle={24}
                          value={editingBreak.end_time ? new Time(parseInt(editingBreak.end_time.split(':')[0]), parseInt(editingBreak.end_time.split(':')[1])) : null}
                          onChange={(time) => {
                            if (time) {
                              setEditingBreak({ ...editingBreak, end_time: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}` });
                            } else {
                              setEditingBreak({ ...editingBreak, end_time: '' });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox 
                      id="edit_b_recurring" 
                      checked={editingBreak.is_recurring}
                      onCheckedChange={(checked) => setEditingBreak({ ...editingBreak, is_recurring: checked === true })}
                    />
                    <Label htmlFor="edit_b_recurring" className="font-medium cursor-pointer">
                      Apply Every Day
                    </Label>
                  </div>

                  {!editingBreak.is_recurring && (
                    <div className="grid gap-4 md:grid-cols-2 pt-2">
                      <div className="grid gap-2">
                        <Label>Start Date (Optional)</Label>
                        <Popover modal={true} open={editBreakStartDateOpen} onOpenChange={setEditBreakStartDateOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-10 px-3 bg-background",
                                !editingBreak.start_date && "text-muted-foreground"
                              )}
                            >
                              <HugeiconsIcon icon={Calendar02Icon} />
                              <span className="truncate">
                                {editingBreak.start_date ? format(new Date(editingBreak.start_date), "P") : "Pick date"}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={editingBreak.start_date && editingBreak.start_date.length > 5 ? new Date(editingBreak.start_date) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  const safeDate = new Date(date);
                                  safeDate.setHours(12);
                                  const dateStr = safeDate.toISOString().split('T')[0];
                                  setEditingBreak({ 
                                    ...editingBreak, 
                                    start_date: dateStr,
                                    end_date: dateStr 
                                  });
                                  setEditBreakStartDateOpen(false);
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="grid gap-2">
                        <Label>End Date (Optional)</Label>
                        <Popover modal={true} open={editBreakEndDateOpen} onOpenChange={setEditBreakEndDateOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-10 px-3 bg-background",
                                !editingBreak.end_date && "text-muted-foreground"
                              )}
                            >
                              <HugeiconsIcon icon={Calendar02Icon} />
                              <span className="truncate">
                                {editingBreak.end_date ? format(new Date(editingBreak.end_date), "P") : "Pick date"}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={editingBreak.end_date && editingBreak.end_date.length > 5 ? new Date(editingBreak.end_date) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  const safeDate = new Date(date);
                                  safeDate.setHours(12);
                                  setEditingBreak({ ...editingBreak, end_date: safeDate.toISOString().split('T')[0] });
                                  setEditBreakEndDateOpen(false);
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingBreak(null)}>Cancel</Button>
                <Button type="submit" disabled={submittingEditBreak}>
                  {submittingEditBreak ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
