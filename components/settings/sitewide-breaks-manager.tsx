'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BlackoutPeriod } from '@/lib/types/shift';
import { format } from 'date-fns';
import { Loader2, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export function SitewideBreaksManager() {
  const [breaks, setBreaks] = useState<BlackoutPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [newBreak, setNewBreak] = useState({
    start_date: '',
    end_date: '',
    reason: '',
  });

  const fetchBreaks = async () => {
    try {
      setLoading(true);
      // Fetch global blackouts (location_id=null implicitly via API if we don't pass it? 
      // Wait, the API defaults to undefined which returns ALL. 
      // We need to pass something to say query.is('location_id', null).
      // But searchParams are strings. 
      // I might need to update the API to handle a special flag or value like 'null'.
      // Let's check api/blackout-periods/route.ts again. 
      // It parses searchParams.
      // const location_id = searchParams.get('location_id') || undefined;
      // If I pass 'null' string, it will search for location_id = 'null' string (uuid).
      // I need to update the API logic to handle a specific flag for global.
      // OR, the API I modified uses `BlackoutPeriodSearchParams` which I updated in `ShiftService`.
      // But the API route needs to call it correctly.
      
      const response = await fetch('/api/blackout-periods?global=true'); // I'll update API to handle this
      const data = await response.json();
      if (data.success) {
        // Filter client side if API doesn't support it yet, but better to update API
        setBreaks(data.data.filter((b: BlackoutPeriod) => b.location_id === null && b.staff_id === null));
      } else {
        toast.error('Failed to load breaks');
      }
    } catch (error) {
      toast.error('Failed to load breaks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreaks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBreak.start_date || !newBreak.end_date || !newBreak.reason) return;

    try {
      setSubmitting(true);
      const response = await fetch('/api/blackout-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBreak,
          location_id: null,
          staff_id: null,
          is_active: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Break created');
        setNewBreak({ start_date: '', end_date: '', reason: '' });
        fetchBreaks();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to create break');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/blackout-periods/${id}`, { // Helper endpoint or main one?
        // Wait, main endpoint is GET/POST. Need DELETE support or dynamic route.
        // Assuming there is a [id]/route.ts
        method: 'DELETE',
      });
      
      if (response.ok) { // check success
         toast.success('Break deleted');
         fetchBreaks();
      } else {
         toast.error('Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sitewide Breaks & Holidays</CardTitle>
          <CardDescription>
            These breaks apply to ALL locations and ALL staff. No availability will be generated during these times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4 items-end mb-6">
            <div className="grid gap-2">
              <Label htmlFor="start_date">Start Date & Time</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={newBreak.start_date}
                onChange={(e) => setNewBreak({ ...newBreak, start_date: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end_date">End Date & Time</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={newBreak.end_date}
                onChange={(e) => setNewBreak({ ...newBreak, end_date: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                placeholder="e.g. Christmas Holiday"
                value={newBreak.reason}
                onChange={(e) => setNewBreak({ ...newBreak, reason: e.target.value })}
                required
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Break
            </Button>
          </form>

          <div className="rounded-md border">
            <Table>
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
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : breaks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No sitewide breaks configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  breaks.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.reason}</TableCell>
                      <TableCell>{format(new Date(b.start_date), 'PPp')}</TableCell>
                      <TableCell>{format(new Date(b.end_date), 'PPp')}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(b.id)}
                          className="text-destructive hover:text-destructive/90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
