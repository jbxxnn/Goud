// Location types for the Prenatal Ultrasound Booking System

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationRequest {
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  timezone?: string;
  is_active?: boolean;
}

export interface UpdateLocationRequest {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  timezone?: string;
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
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  timezone: string;
  is_active: boolean;
}

// Location with additional computed properties
export interface LocationWithDetails extends Location {
  full_address: string;
  display_name: string;
  staff_count?: number;
  active_services_count?: number;
}

// Location search and filtering
export interface LocationSearchParams {
  search?: string;
  city?: string;
  state?: string;
  active_only?: boolean;
  page?: number;
  limit?: number;
}

// Helper function to format full address
export const getFullAddress = (location: Location): string => {
  const parts = [
    location.address,
    location.city,
    location.state,
    location.postal_code
  ].filter(Boolean);
  
  return parts.join(', ');
};

// Helper function to get display name
export const getLocationDisplayName = (location: Location): string => {
  return `${location.name} - ${location.city}, ${location.state}`;
};

// Helper function to validate postal code format
export const validatePostalCode = (postalCode: string, country: string = 'US'): boolean => {
  if (country === 'US') {
    // US ZIP code format: 12345 or 12345-6789
    const usZipRegex = /^\d{5}(-\d{4})?$/;
    return usZipRegex.test(postalCode);
  }
  
  if (country === 'CA') {
    // Canadian postal code format: A1A 1A1
    const caPostalRegex = /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/;
    return caPostalRegex.test(postalCode);
  }
  
  // For other countries, just check if it's not empty
  return postalCode.trim().length > 0;
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

// Helper function to get timezone display name
export const getTimezoneDisplayName = (timezone: string): string => {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long'
    });
    
    const parts = formatter.formatToParts(date);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value;
    
    return timeZoneName || timezone;
  } catch (error) {
    return timezone;
  }
};

// Helper function to check if location is in same timezone
export const isSameTimezone = (location1: Location, location2: Location): boolean => {
  return location1.timezone === location2.timezone;
};

// Helper function to get location distance (placeholder - would need geocoding service)
export const getLocationDistance = (location1: Location, location2: Location): number | null => {
  // This would require geocoding the addresses to get coordinates
  // and then calculating the distance between them
  // For now, return null to indicate distance calculation is not available
  return null;
};

// Helper function to sort locations by distance from a reference location
export const sortLocationsByDistance = (
  locations: Location[], 
  referenceLocation: Location
): Location[] => {
  // This would require geocoding and distance calculation
  // For now, just return the original array
  return locations;
};

// Helper function to filter locations by city
export const filterLocationsByCity = (locations: Location[], city: string): Location[] => {
  return locations.filter(location => 
    location.city.toLowerCase().includes(city.toLowerCase())
  );
};

// Helper function to filter locations by state
export const filterLocationsByState = (locations: Location[], state: string): Location[] => {
  return locations.filter(location => 
    location.state.toLowerCase().includes(state.toLowerCase())
  );
};

// Helper function to search locations by name, city, or address
export const searchLocations = (locations: Location[], searchTerm: string): Location[] => {
  const term = searchTerm.toLowerCase();
  
  return locations.filter(location => 
    location.name.toLowerCase().includes(term) ||
    location.city.toLowerCase().includes(term) ||
    location.state.toLowerCase().includes(term) ||
    location.address.toLowerCase().includes(term)
  );
};
