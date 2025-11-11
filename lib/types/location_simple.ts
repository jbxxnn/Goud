// Simplified Location types for the Prenatal Ultrasound Booking System

export interface Location {
  id: string;
  name: string;
  locationCode: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationRequest {
  name: string;
  locationCode?: string;
  address: string;
  phone?: string;
  email?: string;
  color?: string;
  is_active?: boolean;
}

export interface UpdateLocationRequest {
  name?: string;
  locationCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  color?: string;
  is_active?: boolean;
}

// API Response types
export interface LocationResponse {
  success: boolean;
  data?: Location;
  error?: string;
}

export interface LocationsResponse {
  success: boolean;
  data?: Location[];
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Form validation schemas
export interface LocationFormData {
  name: string;
  locationCode: string;
  address: string;
  phone: string;
  email: string;
  color: string;
  is_active: boolean;
}

// Location with additional computed properties
export interface LocationWithDetails extends Location {
  full_address: string;
  display_name: string;
}

// Helper function to format full address
export const getFullAddress = (location: Location): string => {
  return location.address;
};

// Helper function to get display name
export const getLocationDisplayName = (location: Location): string => {
  return location.name;
};

// Helper function to validate phone number format
export const validatePhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if it's a valid US phone number (10 or 11 digits)
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
};

// Helper function to format phone number for display
export const formatPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return phone; // Return original if format is not recognized
};

// Helper function to search locations by name or address
export const searchLocations = (locations: Location[], searchTerm: string): Location[] => {
  const term = searchTerm.toLowerCase();
  
  return locations.filter(location => 
    location.name.toLowerCase().includes(term) ||
    location.address.toLowerCase().includes(term)
  );
};
