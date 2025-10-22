// Database utilities for service operations
import { createClient } from '@/lib/supabase/client';
import { 
  Service, 
  ServiceAddon, 
  ServiceWithAddons,
  CreateServiceRequest, 
  UpdateServiceRequest,
  CreateServiceAddonRequest,
  UpdateServiceAddonRequest,
  ServiceResponse, 
  ServicesResponse,
  ServiceAddonResponse,
  ServiceAddonsResponse
} from '@/lib/types/service';

const supabase = createClient();

export class ServiceService {
  // Get service by ID
  static async getServiceById(id: string): Promise<ServiceResponse> {
    try {
      const { data, error } = await supabase
        .from('services')
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

  // Get service with addons by ID
  static async getServiceWithAddons(id: string): Promise<ServiceResponse> {
    try {
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

      if (serviceError) {
        return { success: false, error: serviceError.message };
      }

      const { data: addons, error: addonsError } = await supabase
        .from('service_addons')
        .select('*')
        .eq('service_id', id)
        .eq('is_active', true)
        .order('name');

      if (addonsError) {
        return { success: false, error: addonsError.message };
      }

      const serviceWithAddons: ServiceWithAddons = {
        ...service,
        addons: addons || []
      };

      return { success: true, data: serviceWithAddons };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get all services with pagination
  static async getServices(
    page: number = 1, 
    limit: number = 10, 
    activeOnly: boolean = false
  ): Promise<ServicesResponse> {
    try {
      let query = supabase
        .from('services')
        .select('*', { count: 'exact' })
        .order('name');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

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

  // Get active services (for booking)
  static async getActiveServices(): Promise<ServicesResponse> {
    try {
      const { data, error } = await supabase
        .from('services')
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

  // Create service
  static async createService(serviceData: CreateServiceRequest): Promise<ServiceResponse> {
    try {
      const { data, error } = await supabase
        .from('services')
        .insert({
          ...serviceData,
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

  // Update service
  static async updateService(id: string, updates: UpdateServiceRequest): Promise<ServiceResponse> {
    try {
      const { data, error } = await supabase
        .from('services')
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

  // Delete service (soft delete by setting is_active to false)
  static async deleteService(id: string): Promise<ServiceResponse> {
    try {
      const { data, error } = await supabase
        .from('services')
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

  // Search services
  static async searchServices(searchTerm: string, activeOnly: boolean = true): Promise<ServicesResponse> {
    try {
      let query = supabase
        .from('services')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
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
}

export class ServiceAddonService {
  // Get addons for a service
  static async getAddonsByServiceId(serviceId: string): Promise<ServiceAddonsResponse> {
    try {
      const { data, error } = await supabase
        .from('service_addons')
        .select('*')
        .eq('service_id', serviceId)
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

  // Create service addon
  static async createAddon(addonData: CreateServiceAddonRequest): Promise<ServiceAddonResponse> {
    try {
      const { data, error } = await supabase
        .from('service_addons')
        .insert({
          ...addonData,
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

  // Update service addon
  static async updateAddon(id: string, updates: UpdateServiceAddonRequest): Promise<ServiceAddonResponse> {
    try {
      const { data, error } = await supabase
        .from('service_addons')
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

  // Delete service addon (soft delete)
  static async deleteAddon(id: string): Promise<ServiceAddonResponse> {
    try {
      const { data, error } = await supabase
        .from('service_addons')
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
}
