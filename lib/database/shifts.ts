import { createClient } from '@/lib/supabase/server';
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
} from '@/lib/types/shift';

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
    const { service_ids, max_concurrent_bookings, ...shiftFields } = shiftData;

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

    const supabase = await createClient();

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

    // Update service assignments if provided
    if (service_ids !== undefined) {
      // Remove existing assignments
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
   * Delete a shift
   */
  static async deleteShift(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from('shifts').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete shift: ${error.message}`);
    }
  }

  /**
   * Validate a shift for conflicts
   */
  static async validateShift(
    shiftData: CreateShiftRequest | (UpdateShiftRequest & { id: string })
  ): Promise<ShiftValidationResult> {
    const conflicts: ShiftConflict[] = [];
    const supabase = await createClient();

    // Check for overlapping shifts with the same staff member
    let query = supabase
      .from('shifts')
      .select('*')
      .eq('staff_id', shiftData.staff_id!)
      .eq('is_active', true);

    // Exclude current shift if updating
    if ('id' in shiftData) {
      query = query.neq('id', shiftData.id);
    }

    const { data: existingShifts, error } = await query;

    if (error) {
      console.error('Error validating shift:', error);
      return { valid: true, conflicts: [] }; // Fail open
    }

    // Check for time overlaps
    const newShift: Partial<Shift> = {
      start_time: shiftData.start_time!,
      end_time: shiftData.end_time!,
    } as Shift;

    for (const existingShift of existingShifts || []) {
      if (shiftsOverlap(newShift as Shift, existingShift)) {
        conflicts.push({
          type: 'staff_overlap',
          message: `Staff member is already scheduled during this time`,
          conflicting_shift: existingShift,
        });
      }
    }

    // Check for blackout periods
    const { data: blackouts } = await supabase
      .from('blackout_periods')
      .select('*')
      .eq('is_active', true)
      .or(`staff_id.eq.${shiftData.staff_id},staff_id.is.null`)
      .or(`location_id.eq.${shiftData.location_id},location_id.is.null`)
      .lte('start_date', shiftData.end_time!)
      .gte('end_date', shiftData.start_time!);

    for (const blackout of blackouts || []) {
      conflicts.push({
        type: 'blackout_period',
        message: `This time period is blocked: ${blackout.reason}`,
        blackout_period: blackout,
      });
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
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

    if (location_id) {
      query = query.eq('location_id', location_id);
    }

    if (staff_id) {
      query = query.eq('staff_id', staff_id);
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
}

