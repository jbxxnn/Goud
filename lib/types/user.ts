// User types for the Prenatal Ultrasound Booking System

export type UserRole = 'admin' | 'staff' | 'midwife' | 'client';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface CreateUserRequest {
  email: string;
  role?: UserRole;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: UserRole;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  full_name: string;
  display_name: string;
}

// Helper type for user creation from Supabase Auth
export interface AuthUserMetadata {
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  phone?: string;
}

// API Response types
export interface UserResponse {
  success: boolean;
  data?: User;
  error?: string;
}

export interface UsersResponse {
  success: boolean;
  data?: User[];
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Form validation schemas (for use with react-hook-form and zod)
export interface UserFormData {
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
}

// Role-based permissions
export interface UserPermissions {
  canManageUsers: boolean;
  canManageServices: boolean;
  canManageLocations: boolean;
  canManageStaff: boolean;
  canManageBookings: boolean;
  canViewReports: boolean;
  canViewAuditLogs: boolean;
}

// Helper function to get user permissions based on role
export const getUserPermissions = (role: UserRole): UserPermissions => {
  switch (role) {
    case 'admin':
      return {
        canManageUsers: true,
        canManageServices: true,
        canManageLocations: true,
        canManageStaff: true,
        canManageBookings: true,
        canViewReports: true,
        canViewAuditLogs: true,
      };
    case 'staff':
      return {
        canManageUsers: false,
        canManageServices: false,
        canManageLocations: false,
        canManageStaff: false,
        canManageBookings: true,
        canViewReports: false,
        canViewAuditLogs: false,
      };
    case 'midwife':
      return {
        canManageUsers: false,
        canManageServices: false,
        canManageLocations: false,
        canManageStaff: false,
        canManageBookings: true,
        canViewReports: false,
        canViewAuditLogs: false,
      };
    case 'client':
      return {
        canManageUsers: false,
        canManageServices: false,
        canManageLocations: false,
        canManageStaff: false,
        canManageBookings: false,
        canViewReports: false,
        canViewAuditLogs: false,
      };
    default:
      return {
        canManageUsers: false,
        canManageServices: false,
        canManageLocations: false,
        canManageStaff: false,
        canManageBookings: false,
        canViewReports: false,
        canViewAuditLogs: false,
      };
  }
};

// Helper function to get user display name
export const getUserDisplayName = (user: User): string => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  if (user.first_name) {
    return user.first_name;
  }
  if (user.last_name) {
    return user.last_name;
  }
  return user.email;
};

// Helper function to get user full name
export const getUserFullName = (user: User): string => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email;
};
