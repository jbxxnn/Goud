// Database utilities for location operations
import { createClient } from '@/lib/supabase/client';
import { 
  Location, 
  CreateLocationRequest, 
  UpdateLocationRequest,
  LocationResponse, 
  LocationsResponse,
  LocationSearchParams
} from '@/lib/types/location';

const supabase = createClient();

export class LocationService {
  // Get location by ID
  static async getLocationById(id: string): Promise<LocationResponse> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get all locations with pagination and filtering
  static async getLocations(params: LocationSearchParams = {}): Promise<LocationsResponse> {
    try {
      const {
        search,
        city,
        state,
        active_only = false,
        page = 1,
        limit = 10
      } = params;

      let query = supabase
        .from('locations')
        .select('*', { count: 'exact' })
        .order('name');

      // Apply filters
      if (active_only) {
        query = query.eq('is_active', true);
      }

      if (city) {
        query = query.ilike('city', `%${city}%`);
      }

      if (state) {
        query = query.ilike('state', `%${state}%`);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%,address.ilike.%${search}%`);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) {
        return { success: false, error: error.message };
      }

      const totalPages = count ? Math.ceil(count / limit) : 0;

      return {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: totalPages,
        },
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get active locations (for booking)
  static async getActiveLocations(): Promise<LocationsResponse> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get locations by city
  static async getLocationsByCity(city: string): Promise<LocationsResponse> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .ilike('city', `%${city}%`)
        .eq('is_active', true)
        .order('name');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get locations by state
  static async getLocationsByState(state: string): Promise<LocationsResponse> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .ilike('state', `%${state}%`)
        .eq('is_active', true)
        .order('name');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Create location
  static async createLocation(locationData: CreateLocationRequest): Promise<LocationResponse> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .insert({
          ...locationData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Update location
  static async updateLocation(id: string, updates: UpdateLocationRequest): Promise<LocationResponse> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Delete location (soft delete by setting is_active to false)
  static async deleteLocation(id: string): Promise<LocationResponse> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Search locations
  static async searchLocations(searchTerm: string, activeOnly: boolean = true): Promise<LocationsResponse> {
    try {
      let query = supabase
        .from('locations')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
        .order('name');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.limit(20);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get unique cities
  static async getUniqueCities(): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('city')
        .eq('is_active', true)
        .order('city');

      if (error) {
        return { success: false, error: error.message };
      }

      const cities = [...new Set(data?.map(item => item.city) || [])];
      return { success: true, data: cities };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get unique states
  static async getUniqueStates(): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('state')
        .eq('is_active', true)
        .order('state');

      if (error) {
        return { success: false, error: error.message };
      }

      const states = [...new Set(data?.map(item => item.state) || [])];
      return { success: true, data: states };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Check if location name exists
  static async locationNameExists(name: string, excludeId?: string): Promise<{ success: boolean; exists?: boolean; error?: string }> {
    try {
      let query = supabase
        .from('locations')
        .select('id')
        .eq('name', name);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.limit(1);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, exists: (data?.length || 0) > 0 };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
