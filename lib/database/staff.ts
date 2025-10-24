import { createClient } from '@/lib/supabase/server';
import { 
  Staff, 
  StaffWithDetails, 
  CreateStaffRequest, 
  UpdateStaffRequest, 
  StaffSearchParams,
  StaffLocationAssignment,
  StaffServiceQualification
} from '@/lib/types/staff';

export class StaffService {
  async getStaffById(id: string): Promise<Staff | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching staff:', error);
      return null;
    }

    return data;
  }

  async getStaffWithDetails(id: string): Promise<StaffWithDetails | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('staff_with_details')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching staff with details:', error);
      return null;
    }

    return data;
  }

  async getStaff(params: StaffSearchParams = {}): Promise<{
    data: Staff[];
    total: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      location_id,
      service_id,
      active_only = false
    } = params;

    const supabase = await createClient();
    let query = supabase
      .from('staff')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (active_only) {
      query = query.eq('is_active', true);
    }

    // Apply location filter
    if (location_id) {
      query = query.eq('staff_locations.location_id', location_id);
    }

    // Apply service filter
    if (service_id) {
      query = query.eq('staff_services.service_id', service_id);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching staff:', error);
      return { data: [], total: 0 };
    }

    return {
      data: data || [],
      total: count || 0
    };
  }

  async createStaff(staffData: CreateStaffRequest): Promise<Staff> {
    const { location_ids, service_ids, ...staffFields } = staffData;

    const supabase = await createClient();
    
    // Create staff record
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .insert(staffFields)
      .select()
      .single();

    if (staffError) {
      throw new Error(`Failed to create staff: ${staffError.message}`);
    }

    // Add location assignments if provided
    if (location_ids && location_ids.length > 0) {
      const locationAssignments = location_ids.map((location_id, index) => ({
        staff_id: staff.id,
        location_id,
        is_primary: index === 0 // First location is primary
      }));

      const { error: locationError } = await supabase
        .from('staff_locations')
        .insert(locationAssignments);

      if (locationError) {
        console.error('Error creating location assignments:', locationError);
      }
    }

    // Add service qualifications if provided
    if (service_ids && service_ids.length > 0) {
      const serviceQualifications = service_ids.map(service_id => ({
        staff_id: staff.id,
        service_id,
        is_qualified: true,
        qualification_date: new Date().toISOString().split('T')[0]
      }));

      const { error: serviceError } = await supabase
        .from('staff_services')
        .insert(serviceQualifications);

      if (serviceError) {
        console.error('Error creating service qualifications:', serviceError);
      }
    }

    return staff;
  }

  async updateStaff(id: string, staffData: UpdateStaffRequest): Promise<Staff> {
    const { location_ids, service_ids, ...staffFields } = staffData;

    const supabase = await createClient();
    
    // Update staff record
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .update({
        ...staffFields,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (staffError) {
      throw new Error(`Failed to update staff: ${staffError.message}`);
    }

    // Update location assignments if provided
    if (location_ids !== undefined) {
      // Remove existing assignments
      await supabase
        .from('staff_locations')
        .delete()
        .eq('staff_id', id);

      // Add new assignments
      if (location_ids.length > 0) {
        const locationAssignments = location_ids.map((location_id, index) => ({
          staff_id: id,
          location_id,
          is_primary: index === 0
        }));

        const { error: locationError } = await supabase
          .from('staff_locations')
          .insert(locationAssignments);

        if (locationError) {
          console.error('Error updating location assignments:', locationError);
        }
      }
    }

    // Update service qualifications if provided
    if (service_ids !== undefined) {
      // Remove existing qualifications
      await supabase
        .from('staff_services')
        .delete()
        .eq('staff_id', id);

      // Add new qualifications
      if (service_ids.length > 0) {
        const serviceQualifications = service_ids.map(service_id => ({
          staff_id: id,
          service_id,
          is_qualified: true,
          qualification_date: new Date().toISOString().split('T')[0]
        }));

        const { error: serviceError } = await supabase
          .from('staff_services')
          .insert(serviceQualifications);

        if (serviceError) {
          console.error('Error updating service qualifications:', serviceError);
        }
      }
    }

    return staff;
  }

  async deleteStaff(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete staff: ${error.message}`);
    }
  }

  async getStaffByUserId(userId: string): Promise<Staff | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching staff by user ID:', error);
      return null;
    }

    return data;
  }

  async getStaffByLocation(locationId: string): Promise<Staff[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('staff')
      .select(`
        *,
        staff_locations!inner(location_id)
      `)
      .eq('staff_locations.location_id', locationId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching staff by location:', error);
      return [];
    }

    return data || [];
  }

  async getStaffByService(serviceId: string): Promise<Staff[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('staff')
      .select(`
        *,
        staff_services!inner(service_id, is_qualified)
      `)
      .eq('staff_services.service_id', serviceId)
      .eq('staff_services.is_qualified', true)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching staff by service:', error);
      return [];
    }

    return data || [];
  }

  async getStaffLocations(staffId: string): Promise<StaffLocationAssignment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('staff_locations')
      .select(`
        *,
        locations(name, address)
      `)
      .eq('staff_id', staffId);

    if (error) {
      console.error('Error fetching staff locations:', error);
      return [];
    }

    return data || [];
  }

  async getStaffServices(staffId: string): Promise<StaffServiceQualification[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('staff_services')
      .select(`
        *,
        services(name, duration)
      `)
      .eq('staff_id', staffId);

    if (error) {
      console.error('Error fetching staff services:', error);
      return [];
    }

    return data || [];
  }

  async updateStaffLocationAssignment(
    staffId: string, 
    locationId: string, 
    isPrimary: boolean
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('staff_locations')
      .update({ is_primary: isPrimary })
      .eq('staff_id', staffId)
      .eq('location_id', locationId);

    if (error) {
      throw new Error(`Failed to update location assignment: ${error.message}`);
    }
  }

  async updateStaffServiceQualification(
    staffId: string,
    serviceId: string,
    isQualified: boolean,
    notes?: string
  ): Promise<void> {
    const updateData: { is_qualified: boolean; updated_at: string; qualification_date?: string; notes?: string } = {
      is_qualified: isQualified,
      updated_at: new Date().toISOString()
    };

    if (isQualified) {
      updateData.qualification_date = new Date().toISOString().split('T')[0];
    }

    if (notes) {
      updateData.notes = notes;
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('staff_services')
      .update(updateData)
      .eq('staff_id', staffId)
      .eq('service_id', serviceId);

    if (error) {
      throw new Error(`Failed to update service qualification: ${error.message}`);
    }
  }

  async staffEmailExists(email: string, excludeId?: string): Promise<boolean> {
    const supabase = await createClient();
    let query = supabase
      .from('staff')
      .select('id')
      .eq('email', email);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking staff email:', error);
      return false;
    }

    return (data && data.length > 0) || false;
  }
}