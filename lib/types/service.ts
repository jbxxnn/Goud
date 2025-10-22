// Service types for the Prenatal Ultrasound Booking System

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number; // Duration in minutes
  buffer_time: number; // Buffer time in minutes between appointments
  lead_time: number; // Minimum lead time in hours before booking
  reschedule_cutoff: number; // Hours before appointment when rescheduling is no longer allowed
  instructions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceAddon {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  price: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceWithAddons extends Service {
  addons: ServiceAddon[];
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  duration: number;
  buffer_time?: number;
  lead_time?: number;
  reschedule_cutoff?: number;
  instructions?: string;
  is_active?: boolean;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  duration?: number;
  buffer_time?: number;
  lead_time?: number;
  reschedule_cutoff?: number;
  instructions?: string;
  is_active?: boolean;
}

export interface CreateServiceAddonRequest {
  service_id: string;
  name: string;
  description?: string;
  price?: number;
  is_required?: boolean;
  is_active?: boolean;
}

export interface UpdateServiceAddonRequest {
  name?: string;
  description?: string;
  price?: number;
  is_required?: boolean;
  is_active?: boolean;
}

// API Response types
export interface ServiceResponse {
  success: boolean;
  data?: Service;
  error?: string;
}

export interface ServicesResponse {
  success: boolean;
  data?: Service[];
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ServiceAddonResponse {
  success: boolean;
  data?: ServiceAddon;
  error?: string;
}

export interface ServiceAddonsResponse {
  success: boolean;
  data?: ServiceAddon[];
  error?: string;
}

// Form validation schemas
export interface ServiceFormData {
  name: string;
  description: string;
  duration: number;
  buffer_time: number;
  lead_time: number;
  reschedule_cutoff: number;
  instructions: string;
  is_active: boolean;
}

export interface ServiceAddonFormData {
  name: string;
  description: string;
  price: number;
  is_required: boolean;
  is_active: boolean;
}

// Service configuration validation
export interface ServiceConfigValidation {
  isValid: boolean;
  errors: {
    duration?: string;
    buffer_time?: string;
    lead_time?: string;
    reschedule_cutoff?: string;
  };
}

// Helper function to validate service configuration
export const validateServiceConfig = (service: Partial<Service>): ServiceConfigValidation => {
  const errors: ServiceConfigValidation['errors'] = {};

  if (service.duration !== undefined && service.duration <= 0) {
    errors.duration = 'Duration must be greater than 0';
  }

  if (service.buffer_time !== undefined && service.buffer_time < 0) {
    errors.buffer_time = 'Buffer time cannot be negative';
  }

  if (service.lead_time !== undefined && service.lead_time < 0) {
    errors.lead_time = 'Lead time cannot be negative';
  }

  if (service.reschedule_cutoff !== undefined && service.reschedule_cutoff < 0) {
    errors.reschedule_cutoff = 'Reschedule cutoff cannot be negative';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Helper function to format duration for display
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

// Helper function to format price for display
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

// Helper function to calculate total service time (duration + buffer)
export const getTotalServiceTime = (service: Service): number => {
  return service.duration + service.buffer_time;
};

// Helper function to check if service can be booked at given time
export const canBookService = (service: Service, bookingTime: Date): boolean => {
  const now = new Date();
  const hoursUntilBooking = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  return hoursUntilBooking >= service.lead_time;
};

// Helper function to check if service can be rescheduled
export const canRescheduleService = (service: Service, appointmentTime: Date): boolean => {
  const now = new Date();
  const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  return hoursUntilAppointment >= service.reschedule_cutoff;
};
