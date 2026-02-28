import { createClient } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import {
  Shift,
  ShiftWithDetails,
  CreateShiftRequest,
  UpdateShiftRequest,
  ShiftSearchParams,
  ShiftValidationResult,
  ShiftConflict,
  shiftsOverlap,
  BlackoutPeriod,
  CreateBlackoutPeriodRequest,
  UpdateBlackoutPeriodRequest,
  BlackoutPeriodSearchParams,
  SitewideBreak,
  CreateSitewideBreakRequest,
  UpdateSitewideBreakRequest,
  ShiftBreak,
  CreateShiftBreakRequest,
  UpdateShiftBreakRequest,
  parseRecurrenceRule,
  buildRecurrenceRule,
} from '@/lib/types/shift';
import { RRule } from 'rrule';
import { addMonths, startOfDay, endOfDay, format } from 'date-fns';

export class ShiftService {
  /**
   * Get a single shift by ID
   */
  static async getShiftById(id: string): Promise<Shift | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching shift:', error);
      return null;
    }

    return data;
  }

  /**
   * Delete a shift by ID.
   * If the shift is an exception to a recurring shift, it will be soft-deleted (marked inactive)
   * instead of hard-deleted to prevent the recurring logic from recreating it.
   */
  static async deleteShift(id: string): Promise<boolean> {
    const supabase = getServiceSupabase();
    console.log(`[ShiftService] Attempting to delete shift: ${id}`);
    
    // 1. Fetch the shift to check if it's recurring or an exception
    const { data: shift, error: fetchError } = await supabase
      .from('shifts')
      .select('id, parent_shift_id, is_recurring')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error(`[ShiftService] Error fetching shift ${id}:`, fetchError);
      if (fetchError.code === 'PGRST116') return true; // Not found
      throw new Error(`Failed to fetch shift: ${fetchError.message}`);
    }

    if (shift.parent_shift_id && !shift.is_recurring) {
      console.log(`[ShiftService] Soft-deleting exception shift: ${id}`);
      const { error } = await supabase
        .from('shifts')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('[ShiftService] Error soft-deleting exception shift:', error);
        throw new Error('Failed to delete exception shift');
      }
      return true;
    }

    // 2. Identify all IDs to be cleaned up
    let idsToDelete = [id];
    let childIds: string[] = [];
    if (shift.is_recurring) {
      const { data: children, error: childrenError } = await supabase
        .from('shifts')
        .select('id')
        .eq('parent_shift_id', id);
      
      if (childrenError) {
        console.warn(`[ShiftService] Error fetching children for parent ${id}:`, childrenError);
      } else if (children && children.length > 0) {
        childIds = children.map(c => c.id);
        idsToDelete = [...idsToDelete, ...childIds];
        console.log(`[ShiftService] Found ${childIds.length} child shifts to also delete.`);
      }
    }

    // 3. Clear all referencing tables (Using IDs to be explicit)
    console.log(`[ShiftService] Clearing references for IDs:`, idsToDelete);

    // booking_locks (CRITICAL)
    const { error: lockErr } = await supabase.from('booking_locks').delete().in('shift_id', idsToDelete);
    if (lockErr) console.error('[ShiftService] Error deleting booking_locks:', lockErr);

    // shift_services
    const { error: servErr } = await supabase.from('shift_services').delete().in('shift_id', idsToDelete);
    if (servErr) console.error('[ShiftService] Error deleting shift_services:', servErr);

    // shift_breaks (Some might have CASCADE but let's be safe)
    const { error: breakErr } = await supabase.from('shift_breaks').delete().in('shift_id', idsToDelete);
    if (breakErr) console.error('[ShiftService] Error deleting shift_breaks:', breakErr);

    // bookings (Nullify shift_id)
    const { error: bookErr } = await supabase.from('bookings').update({ shift_id: null }).in('shift_id', idsToDelete);
    if (bookErr) console.error('[ShiftService] Error nullifying bookings:', bookErr);

    // 4. Delete child shifts first
    if (childIds.length > 0) {
      console.log(`[ShiftService] Deleting ${childIds.length} child shifts...`);
      const { error: childDeleteErr } = await supabase
        .from('shifts')
        .delete()
        .in('id', childIds);
      
      if (childDeleteErr) {
        console.error('[ShiftService] Error deleting child shifts:', childDeleteErr);
        throw new Error(`Failed to delete child shifts: ${childDeleteErr.message}`);
      }
    }

    // 5. Delete the parent/main shift
    console.log(`[ShiftService] Deleting main shift: ${id}`);
    const { error: finalError } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id);

    if (finalError) {
      console.error('[ShiftService] Final delete failed:', finalError);
      throw new Error(`Failed to delete shift: ${finalError.message}`);
    }

    console.log(`[ShiftService] Successfully deleted shift ${id} and all references.`);
    return true;
  }

  /**
   * Get a single shift with full details (staff, location, services)
   */
  static async getShiftWithDetails(id: string): Promise<ShiftWithDetails | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('shifts_with_details')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching shift with details:', error);
      return null;
    }

    return data;
  }

  /**
   * Get shifts with filtering and pagination
   */
  static async getShifts(params: ShiftSearchParams = {}): Promise<{
    data: Shift[];
    total: number;
  }> {
    const {
      page = 1,
      limit = 50,
      staff_id,
      location_id,
      service_id,
      start_date,
      end_date,
      is_recurring,
      active_only = false,
    } = params;

    const supabase = await createClient();
    let query = supabase
      .from('shifts')
      .select('*', { count: 'exact' });

    // Apply filters
    if (staff_id) {
      query = query.eq('staff_id', staff_id);
    }

    if (location_id) {
      query = query.eq('location_id', location_id);
    }

    if (is_recurring !== undefined) {
      query = query.eq('is_recurring', is_recurring);
    }

    if (active_only) {
      query = query.eq('is_active', true);
    }

    // Date range filtering
    if (start_date) {
      query = query.gte('start_time', start_date);
    }

    if (end_date) {
      query = query.lte('end_time', end_date);
    }

    // Service filter (requires join)
    if (service_id) {
      query = query.filter('shift_services.service_id', 'eq', service_id);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to).order('start_time', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching shifts:', error);
      return { data: [], total: 0 };
    }

    return {
      data: data || [],
      total: count || 0,
    };
  }

  /**
   * Get shifts with full details (staff, location, services)
   */
  static async getShiftsWithDetails(params: ShiftSearchParams = {}): Promise<{
    data: ShiftWithDetails[];
    total: number;
  }> {
    const {
      page = 1,
      limit = 50,
      staff_id,
      location_id,
      start_date,
      end_date,
      is_recurring,
      active_only = false,
    } = params;

    const supabase = await createClient();
    let query = supabase
      .from('shifts_with_details')
      .select('*', { count: 'exact' });

    // Apply filters
    if (staff_id) {
      query = query.eq('staff_id', staff_id);
    }

    if (location_id) {
      query = query.eq('location_id', location_id);
    }

    if (is_recurring !== undefined) {
      query = query.eq('is_recurring', is_recurring);
    }

    if (active_only) {
      query = query.eq('is_active', true);
    }

    // Date range filtering
    if (start_date) {
      query = query.gte('start_time', start_date);
    }

    if (end_date) {
      query = query.lte('end_time', end_date);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to).order('start_time', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching shifts with details:', error);
      return { data: [], total: 0 };
    }

    return {
      data: data || [],
      total: count || 0,
    };
  }

  /**
   * Create a new shift
   */
  static async createShift(shiftData: CreateShiftRequest): Promise<Shift> {
    const { service_ids, max_concurrent_bookings, skip_conflicting_occurrences, ...shiftFields } = shiftData;

    const supabase = await createClient();

    // Create shift record
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .insert({
        ...shiftFields,
        is_recurring: shiftFields.is_recurring || false,
        priority: shiftFields.priority || 1,
      })
      .select()
      .single();

    if (shiftError) {
      throw new Error(`Failed to create shift: ${shiftError.message}`);
    }

    // If skip_conflicting_occurrences is true, we need to create inactive exception records 
    // for all dates that have conflicts
    if (shiftData.skip_conflicting_occurrences && shiftFields.is_recurring) {
      const validation = await this.validateShift({ ...shiftData, id: shift.id });
      const skipDates = [...new Set(validation.conflicts.map(c => c.occurrence_date).filter(Boolean) as string[])];
      
      if (skipDates.length > 0) {
        // Create tombstone records for skipped dates
        const exceptions = skipDates.map(date => ({
          parent_shift_id: shift.id,
          staff_id: shift.staff_id,
          location_id: shift.location_id,
          start_time: shift.start_time,
          end_time: shift.end_time,
          exception_date: date,
          is_active: false,
          is_recurring: false,
          priority: shift.priority,
          notes: 'Automatically skipped due to conflict'
        }));

        const { error: exceptionsError } = await supabase
          .from('shifts')
          .insert(exceptions);

        if (exceptionsError) {
          console.error('Error creating skipped occurrences:', exceptionsError);
        }
      }
    }

    // Add service assignments if provided
    if (service_ids && service_ids.length > 0) {
      const serviceAssignments = service_ids.map((service_id) => ({
        shift_id: shift.id,
        service_id,
        max_concurrent_bookings: max_concurrent_bookings?.[service_id] ?? null,
      }));

      const { error: servicesError } = await supabase
        .from('shift_services')
        .insert(serviceAssignments);

      if (servicesError) {
        console.error('Error creating service assignments:', servicesError);
      }
    }



    return shift;
  }

  /**
   * Update a shift
   */
  static async updateShift(id: string, shiftData: UpdateShiftRequest): Promise<Shift> {
    const { service_ids, max_concurrent_bookings, ...shiftFields } = shiftData;

    const supabase = getServiceSupabase();

    // Update shift record
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .update({
        ...shiftFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (shiftError) {
      throw new Error(`Failed to update shift: ${shiftError.message}`);
    }

    // If we are updating a recurring series, wipe out all its exceptions
    // and their referencing data so the series returns to a uniform state.
    if (shift.is_recurring) {
      // Find children to clear their references first
      const { data: childrenToClear } = await supabase
        .from('shifts')
        .select('id')
        .eq('parent_shift_id', id);
      
      if (childrenToClear && childrenToClear.length > 0) {
        const childIds = childrenToClear.map(c => c.id);
        
        // Clear references
        await supabase.from('booking_locks').delete().in('shift_id', childIds);
        await supabase.from('shift_services').delete().in('shift_id', childIds);
        await supabase.from('shift_breaks').delete().in('shift_id', childIds);
        await supabase.from('bookings').update({ shift_id: null }).in('shift_id', childIds);

        // Delete the children
        await supabase.from('shifts').delete().in('id', childIds);
      }
    }

    // Update service assignments if provided
    if (service_ids !== undefined) {
      // Remove existing assignments (and any related locks just in case)
      await supabase.from('shift_services').delete().eq('shift_id', id);

      // Add new assignments
      if (service_ids.length > 0) {
        const serviceAssignments = service_ids.map((service_id) => ({
          shift_id: id,
          service_id,
          max_concurrent_bookings: max_concurrent_bookings?.[service_id] ?? null,
        }));

        const { error: servicesError } = await supabase
          .from('shift_services')
          .insert(serviceAssignments);

        if (servicesError) {
          console.error('Error updating service assignments:', servicesError);
        }
      }
    }

    return shift;
  }

  /**
   * Split a recurring shift series at a specific date.
   * Modifies the original shift to end the day before the split date.
   * If action is 'update', clones the original shift (applying new data) starting from the split date.
   * Also wipes out any child exceptions from the original series that fall on or after the split date.
   */
  static async splitShift(id: string, exception_date: string, action: 'update' | 'delete', updateData?: CreateShiftRequest): Promise<Shift | null> {
    const supabase = getServiceSupabase();

    // 1. Fetch the original parent shift
    const originalShift = await this.getShiftById(id);
    if (!originalShift || !originalShift.is_recurring) {
      throw new Error('Shift not found or is not recurring');
    }

    // 2. Calculate the day before the exception date
    const splitDateObj = new Date(exception_date);
    const dayBeforeObj = new Date(splitDateObj);
    dayBeforeObj.setDate(dayBeforeObj.getDate() - 1);
    
    const dayBeforeStr = dayBeforeObj.toISOString().split('T')[0];

    // 3. Find any child exceptions on or after the exception_date to clean up their references
    const { data: childrenToClear } = await supabase
      .from('shifts')
      .select('id')
      .eq('parent_shift_id', id)
      .gte('exception_date', exception_date);
    
    if (childrenToClear && childrenToClear.length > 0) {
      const childIdsToClear = childrenToClear.map(c => c.id);
      
      // Clear references for these children
      await supabase.from('booking_locks').delete().in('shift_id', childIdsToClear);
      await supabase.from('shift_services').delete().in('shift_id', childIdsToClear);
      await supabase.from('shift_breaks').delete().in('shift_id', childIdsToClear);
      await supabase.from('bookings').update({ shift_id: null }).in('shift_id', childIdsToClear);

      // Delete the child shifts themselves
      const { error: deleteExceptionsError } = await supabase
        .from('shifts')
        .delete()
        .in('id', childIdsToClear);

      if (deleteExceptionsError) {
        console.error('Error wiping following exceptions:', deleteExceptionsError);
        throw new Error(`Failed to clear existing exceptions: ${deleteExceptionsError.message}`);
      }
    }

    // 4. Update the original parent shift to terminate on the day before the split
    if (!originalShift.recurrence_rule) {
      throw new Error('Original shift does not have a recurrence_rule to split');
    }
    const rruleOptions = parseRecurrenceRule(originalShift.recurrence_rule);
    if (!rruleOptions) {
      throw new Error('Could not parse recurrence_rule of the parent shift');
    }
    
    rruleOptions.until = dayBeforeStr;
    const newRrule = buildRecurrenceRule(rruleOptions);

    const { error: updateParentError } = await supabase
      .from('shifts')
      .update({ recurrence_rule: newRrule })
      .eq('id', id);

    if (updateParentError) {
      throw new Error(`Failed to update parent shift recurrence_rule: ${updateParentError.message}`);
    }

    // 5. If updating, create the newly split series using updateData
    if (action === 'update' && updateData) {
      // Clean up payload fields that might break Supabase insert
      const { split_action, exception_date: _, ...cleanUpdateData } = updateData as any;
      return await this.createShift(cleanUpdateData as CreateShiftRequest);
    }

    return null;
  }

  /**
   * Validate a shift for conflicts
   */
  static async validateShift(
    shiftData: CreateShiftRequest | (UpdateShiftRequest & { id: string })
  ): Promise<ShiftValidationResult> {
    const conflicts: ShiftConflict[] = [];
    const supabase = await createClient();

    // 1. Determine validation range
    const startTime = new Date(shiftData.start_time!);
    const endTime = new Date(shiftData.end_time!);
    let validationEnd = endTime;

    const isRecurring = !!shiftData.is_recurring && !!shiftData.recurrence_rule;
    
    if (isRecurring) {
      const rruleOptions = parseRecurrenceRule(shiftData.recurrence_rule!);
      if (rruleOptions?.until) {
        // Ensure until date is end of day for comparison
        validationEnd = endOfDay(new Date(rruleOptions.until));
      } else {
        // Default validation window: 6 months
        validationEnd = addMonths(startTime, 6);
      }
    }

    // 2. Fetch all potential blockers for the entire range in parallel
    // We check for staff overlaps and blackout periods
    const [existingShiftsRes, blackoutsRes] = await Promise.all([
      supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', shiftData.staff_id!)
        .eq('is_active', true)
        .lte('start_time', validationEnd.toISOString())
        .gte('end_time', startTime.toISOString()),
      supabase
        .from('blackout_periods')
        .select('*')
        .eq('is_active', true)
        .or(`staff_id.eq.${shiftData.staff_id},staff_id.is.null`)
        .or(`location_id.eq.${shiftData.location_id},location_id.is.null`)
        .lte('start_date', validationEnd.toISOString())
        .gte('end_date', startTime.toISOString())
    ]);

    const existingShifts = existingShiftsRes.data || [];
    const blackouts = blackoutsRes.data || [];

    // Exclude current shift if updating
    const otherShifts = 'id' in shiftData 
      ? existingShifts.filter(s => s.id !== shiftData.id)
      : existingShifts;

    // 3. Expand shift occurrences if recurring
    const instancesToValidate: { start: Date; end: Date; dateStr: string }[] = [];
    if (isRecurring) {
      try {
        const duration = endTime.getTime() - startTime.getTime();
        let rruleString = shiftData.recurrence_rule!;
        
        // Add DTSTART and RRULE prefix if missing (required by rrule lib)
        if (!rruleString.startsWith('RRULE:') && !rruleString.startsWith('DTSTART:')) {
          const year = startTime.getFullYear();
          const month = String(startTime.getMonth() + 1).padStart(2, '0');
          const day = String(startTime.getDate()).padStart(2, '0');
          const hours = String(startTime.getHours()).padStart(2, '0');
          const minutes = String(startTime.getMinutes()).padStart(2, '0');
          const seconds = String(startTime.getSeconds()).padStart(2, '0');
          const dtstart = `${year}${month}${day}T${hours}${minutes}${seconds}`;
          rruleString = `DTSTART:${dtstart}\nRRULE:${rruleString}`;
        } else if (!rruleString.startsWith('RRULE:') && !rruleString.includes('RRULE:')) {
          rruleString = `RRULE:${rruleString}`;
        }

        const rrule = RRule.fromString(rruleString);
        // Get occurrences in range
        const occurrences = rrule.between(startOfDay(startTime), endOfDay(validationEnd), true);

        occurrences.forEach(occ => {
          const iStart = new Date(occ);
          // Set same time as original start
          iStart.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds());
          const iEnd = new Date(iStart.getTime() + duration);
          instancesToValidate.push({
            start: iStart,
            end: iEnd,
            dateStr: format(iStart, 'yyyy-MM-dd')
          });
        });
      } catch (e) {
        console.error('Error expanding shift for validation:', e);
        // Fallback to single instance if expansion fails
        instancesToValidate.push({ start: startTime, end: endTime, dateStr: format(startTime, 'yyyy-MM-dd') });
      }
    } else {
      instancesToValidate.push({ start: startTime, end: endTime, dateStr: format(startTime, 'yyyy-MM-dd') });
    }

    // 4. Check for conflicts on each instance
    for (const instance of instancesToValidate) {
      const iShift = { start_time: instance.start.toISOString(), end_time: instance.end.toISOString() } as Shift;

      // Check staff overlaps
      for (const existing of otherShifts) {
        if (shiftsOverlap(iShift, existing)) {
          conflicts.push({
            type: 'staff_overlap',
            message: `Staff member is already scheduled during occurrence on ${instance.dateStr}`,
            conflicting_shift: existing,
            occurrence_date: instance.dateStr
          });
        }
      }

      // Check blackout periods
      for (const blackout of blackouts) {
        const bStart = new Date(blackout.start_date);
        const bEnd = new Date(blackout.end_date);
        // Overlap check
        if (instance.start < bEnd && bStart < instance.end) {
          conflicts.push({
            type: 'blackout_period',
            message: `Occurrence on ${instance.dateStr} is blocked by holiday: ${blackout.reason}`,
            blackout_period: blackout,
            occurrence_date: instance.dateStr
          });
        }
      }
    }

    // A shift is skippable if it is recurring and all its conflicts are on specific occurrences
    // (meaning skipping those dates would result in a valid (empty) series or a partially valid series)
    // For single shifts, conflicts are always hard errors.
    const skippable = isRecurring && conflicts.length > 0;

    return {
      valid: conflicts.length === 0,
      conflicts,
      skippable
    };
  }

  /**
   * Get shifts for a specific staff member
   */
  static async getShiftsByStaff(staffId: string, startDate?: string, endDate?: string): Promise<Shift[]> {
    const params: ShiftSearchParams = {
      staff_id: staffId,
      active_only: true,
      limit: 1000, // Get all shifts
    };

    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const result = await this.getShifts(params);
    return result.data;
  }

  /**
   * Get shifts for a specific location
   */
  static async getShiftsByLocation(locationId: string, startDate?: string, endDate?: string): Promise<Shift[]> {
    const params: ShiftSearchParams = {
      location_id: locationId,
      active_only: true,
      limit: 1000,
    };

    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const result = await this.getShifts(params);
    return result.data;
  }

  // =============================================
  // BLACKOUT PERIODS
  // =============================================

  /**
   * Get blackout periods
   */
  static async getBlackoutPeriods(params: BlackoutPeriodSearchParams = {}): Promise<{
    data: BlackoutPeriod[];
    total: number;
  }> {
    const {
      page = 1,
      limit = 50,
      location_id,
      staff_id,
      start_date,
      end_date,
      active_only = false,
    } = params;

    const supabase = await createClient();
    let query = supabase.from('blackout_periods').select('*', { count: 'exact' });

    if (location_id !== undefined) {
      if (location_id === null) {
        query = query.is('location_id', null);
      } else {
        query = query.eq('location_id', location_id);
      }
    }

    if (staff_id !== undefined) {
      if (staff_id === null) {
        query = query.is('staff_id', null);
      } else {
        query = query.eq('staff_id', staff_id);
      }
    }

    if (active_only) {
      query = query.eq('is_active', true);
    }

    if (start_date) {
      query = query.gte('end_date', start_date);
    }

    if (end_date) {
      query = query.lte('start_date', end_date);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to).order('start_date', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching blackout periods:', error);
      return { data: [], total: 0 };
    }

    return {
      data: data || [],
      total: count || 0,
    };
  }

  /**
   * Create a blackout period
   */
  static async createBlackoutPeriod(data: CreateBlackoutPeriodRequest): Promise<BlackoutPeriod> {
    const supabase = await createClient();

    const { data: blackout, error } = await supabase
      .from('blackout_periods')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create blackout period: ${error.message}`);
    }

    return blackout;
  }

  /**
   * Update a blackout period
   */
  static async updateBlackoutPeriod(id: string, data: UpdateBlackoutPeriodRequest): Promise<BlackoutPeriod> {
    const supabase = await createClient();

    const { data: blackout, error } = await supabase
      .from('blackout_periods')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update blackout period: ${error.message}`);
    }

    return blackout;
  }

  /**
   * Delete a blackout period
   */
  static async deleteBlackoutPeriod(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from('blackout_periods').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete blackout period: ${error.message}`);
    }
  }

  // =============================================
  // SITEWIDE BREAKS
  // =============================================

  static async getSitewideBreaks(activeOnly = false): Promise<SitewideBreak[]> {
    const supabase = await createClient();
    let query = supabase.from('sitewide_breaks').select('*').order('start_time', { ascending: true });
    
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching sitewide breaks:', error);
      return [];
    }
    return data || [];
  }

  static async createSitewideBreak(data: CreateSitewideBreakRequest): Promise<SitewideBreak> {
    const supabase = await createClient();
    const { data: breakTemplate, error } = await supabase
      .from('sitewide_breaks')
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(`Failed to create sitewide break: ${error.message}`);
    return breakTemplate;
  }

  static async updateSitewideBreak(id: string, data: UpdateSitewideBreakRequest): Promise<SitewideBreak> {
    const supabase = await createClient();
    const { data: breakTemplate, error } = await supabase
      .from('sitewide_breaks')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update sitewide break: ${error.message}`);
    return breakTemplate;
  }

  static async deleteSitewideBreak(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from('sitewide_breaks').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete sitewide break: ${error.message}`);
  }

  // =============================================
  // SHIFT BREAKS
  // =============================================

  static async getShiftBreaks(shiftId: string, instanceDate?: string): Promise<ShiftBreak[]> {
    const supabase = await createClient();
    const { toDate } = require('date-fns-tz');
    
    // 1. Handle virtual recurring shift instances logic
    let actualShiftId = shiftId;
    const isVirtualInstance = shiftId.includes('-instance-');
    if (isVirtualInstance) {
      actualShiftId = shiftId.split('-instance-')[0];
    }

    // Fetch the shift to know its date for sitewide/parent break projection
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('id, start_time, end_time')
      .eq('id', actualShiftId)
      .single();

    if (shiftError || !shift) {
      console.error('Error fetching shift for breaks:', shiftError);
      return [];
    }

    const sDate = instanceDate || shift.start_time.split('T')[0];

    // 2. Fetch explicit shift breaks (local overrides or custom breaks)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const idsToSearch = [];
    
    if (uuidRegex.test(shiftId)) {
      idsToSearch.push(shiftId);
    }
    
    if (isVirtualInstance && uuidRegex.test(actualShiftId)) {
      if (!idsToSearch.includes(actualShiftId)) {
        idsToSearch.push(actualShiftId);
      }
    }

    const { data: rawLocalBreaks, error: localBreaksError } = await supabase
      .from('shift_breaks')
      .select('*')
      .in('shift_id', idsToSearch)
      .order('start_time', { ascending: true });

    if (localBreaksError) {
      console.error('Error fetching local shift breaks:', localBreaksError);
      return [];
    }

    // Separate virtual overrides from parent pattern breaks
    const instanceBreaks = (rawLocalBreaks || []).filter(b => b.shift_id === shiftId);
    const parentBreaks = (rawLocalBreaks || []).filter(b => b.shift_id === actualShiftId);
    
    // Project parent breaks onto the instance date
    const projectedParentBreaks = parentBreaks.map(pb => {
      if (!isVirtualInstance) return pb;
      const { formatInTimeZone, toDate } = require('date-fns-tz');
      const pStart = new Date(pb.start_time);
      const pEnd = new Date(pb.end_time);
      
      const pStartLocal = formatInTimeZone(pStart, 'Europe/Amsterdam', 'HH:mm:ss');
      const pEndLocal = formatInTimeZone(pEnd, 'Europe/Amsterdam', 'HH:mm:ss');
      const startIso = toDate(`${sDate}T${pStartLocal}`, { timeZone: 'Europe/Amsterdam' }).toISOString();
      const endIso = toDate(`${sDate}T${pEndLocal}`, { timeZone: 'Europe/Amsterdam' }).toISOString();
      return { ...pb, start_time: startIso, end_time: endIso };
    });

    // Merge: Instance breaks take precedence
    const localBreaks = isVirtualInstance ? [...instanceBreaks, ...projectedParentBreaks] : rawLocalBreaks || [];

    // 3. Fetch active sitewide breaks
    const { data: activeGlobalBreaks, error: globalError } = await supabase
      .from('sitewide_breaks')
      .select('*')
      .eq('is_active', true);

    const inheritedBreaks: ShiftBreak[] = [];
    if (!globalError && activeGlobalBreaks) {
      for (const b of activeGlobalBreaks) {
        let applies = false;
        if (b.is_recurring) {
          applies = true;
        } else {
          const bStart = b.start_date || '0000-01-01';
          const bEnd = b.end_date || '9999-12-31';
          if (sDate >= bStart && sDate <= bEnd) {
            applies = true;
          }
        }

        if (applies) {
          const breakStartTs = toDate(`${sDate}T${b.start_time}`, { timeZone: 'Europe/Amsterdam' }).toISOString();
          const breakEndTs = toDate(`${sDate}T${b.end_time}`, { timeZone: 'Europe/Amsterdam' }).toISOString();

          // Overlap check
          const pStart = new Date(shift.start_time);
          const pEnd = new Date(shift.end_time);
          const { formatInTimeZone } = require('date-fns-tz');
          const pStartLocal = formatInTimeZone(pStart, 'Europe/Amsterdam', 'HH:mm:ss');
          const pEndLocal = formatInTimeZone(pEnd, 'Europe/Amsterdam', 'HH:mm:ss');
          const shiftStartOnDate = toDate(`${sDate}T${pStartLocal}`, { timeZone: 'Europe/Amsterdam' }).toISOString();
          const shiftEndOnDate = toDate(`${sDate}T${pEndLocal}`, { timeZone: 'Europe/Amsterdam' }).toISOString();

          if (breakStartTs >= shiftStartOnDate && breakEndTs <= shiftEndOnDate) {
            const isOverridden = localBreaks.some(lb => lb.sitewide_break_id === b.id);
            if (!isOverridden) {
              inheritedBreaks.push({
                id: `inherited-${b.id}`,
                shift_id: shiftId,
                sitewide_break_id: b.id,
                name: b.name,
                start_time: breakStartTs,
                end_time: breakEndTs,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              } as ShiftBreak);
            }
          }
        }
      }
    }

    // 5. Final merge and sort
    return [...localBreaks, ...inheritedBreaks]
      .filter(b => b.start_time !== b.end_time)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  static async createShiftBreak(data: CreateShiftBreakRequest): Promise<ShiftBreak> {
    const supabase = await createClient();
    
    let targetShiftId = data.shift_id;

    // Handle virtual IDs by realizing the shift if parent_shift_id and exception_date are provided
    if (data.shift_id.includes('-instance-') && data.parent_shift_id && data.exception_date) {
      // 1. Check if it already exists
      const { data: existingShift } = await supabase
        .from('shifts')
        .select('id')
        .eq('parent_shift_id', data.parent_shift_id)
        .eq('exception_date', data.exception_date)
        .single();
      
      if (existingShift) {
        targetShiftId = existingShift.id;
      } else {
        // 2. We need the parent shift details to clone it
        const { data: parentShift } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', data.parent_shift_id)
          .single();
        
        if (parentShift) {
          // 3. Calculate timestamps for the exception date using parent's hours
          // We must update the date part to match exception_date while keeping time
          const { toDate } = require('date-fns-tz');
          const pStart = new Date(parentShift.start_time);
          const pEnd = new Date(parentShift.end_time);
          
          const sDate = data.exception_date;
          const startIso = toDate(`${sDate}T${pStart.getUTCHours().toString().padStart(2,'0')}:${pStart.getUTCMinutes().toString().padStart(2,'0')}:00`, { timeZone: 'UTC' }).toISOString();
          const endIso = toDate(`${sDate}T${pEnd.getUTCHours().toString().padStart(2,'0')}:${pEnd.getUTCMinutes().toString().padStart(2,'0')}:00`, { timeZone: 'UTC' }).toISOString();

          // 4. Create the realized shift (exception)
          const { data: newShift, error: shiftError } = await supabase
            .from('shifts')
            .insert({
              staff_id: parentShift.staff_id,
              location_id: parentShift.location_id,
              start_time: startIso,
              end_time: endIso,
              is_recurring: false,
              parent_shift_id: parentShift.id,
              exception_date: data.exception_date,
              is_active: true,
              notes: parentShift.notes,
              priority: parentShift.priority
            })
            .select('id')
            .single();
          
          if (!shiftError && newShift) {
            targetShiftId = newShift.id;
          }
        }
      }
    }

    const { data: shiftBreak, error } = await supabase
      .from('shift_breaks')
      .insert({
        shift_id: targetShiftId,
        sitewide_break_id: data.sitewide_break_id,
        name: data.name,
        start_time: data.start_time,
        end_time: data.end_time
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create shift break: ${error.message}`);
    return shiftBreak;
  }

  static async updateShiftBreak(id: string, data: UpdateShiftBreakRequest): Promise<ShiftBreak> {
    const supabase = await createClient();
    const { data: shiftBreak, error } = await supabase
      .from('shift_breaks')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update shift break: ${error.message}`);
    return shiftBreak;
  }

  static async deleteShiftBreak(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from('shift_breaks').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete shift break: ${error.message}`);
  }
}

