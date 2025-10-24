export interface Staff {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  hire_date: string | null;
  role: StaffRole;
  bio: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffWithDetails extends Staff {
  user_email: string;
  user_role: string;
  locations: StaffLocation[];
  services: StaffService[];
}

export interface StaffLocation {
  id: string;
  name: string;
  address: string;
  is_primary: boolean;
}

export interface StaffService {
  id: string;
  name: string;
  duration: number;
  is_qualified: boolean;
  qualification_date: string | null;
}

export interface StaffLocationAssignment {
  id: string;
  staff_id: string;
  location_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface StaffServiceQualification {
  id: string;
  staff_id: string;
  service_id: string;
  is_qualified: boolean;
  qualification_date: string | null;
  notes: string | null;
  created_at: string;
}

export type StaffRole = 'technician' | 'supervisor' | 'manager' | 'admin';

export interface CreateStaffRequest {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  hire_date?: string;
  role?: StaffRole;
  bio?: string;
  is_active?: boolean;
  location_ids?: string[];
  service_ids?: string[];
}

export interface UpdateStaffRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  hire_date?: string;
  role?: StaffRole;
  bio?: string;
  is_active?: boolean;
  location_ids?: string[];
  service_ids?: string[];
}

export interface StaffResponse {
  success: boolean;
  data: Staff;
}

export interface StaffsResponse {
  success: boolean;
  data: Staff[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StaffSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: StaffRole;
  location_id?: string;
  service_id?: string;
  active_only?: boolean;
}

// Helper functions
export function getStaffDisplayName(staff: Staff): string {
  return `${staff.first_name} ${staff.last_name}`;
}

export function getStaffInitials(staff: Staff): string {
  return `${staff.first_name.charAt(0)}${staff.last_name.charAt(0)}`.toUpperCase();
}

export function getStaffRoleDisplay(role: StaffRole): string {
  const roleMap: Record<StaffRole, string> = {
    technician: 'Technician',
    supervisor: 'Supervisor',
    manager: 'Manager',
    admin: 'Administrator'
  };
  return roleMap[role] || role;
}

export function isStaffQualifiedForService(staff: StaffWithDetails, serviceId: string): boolean {
  return staff.services.some(service => 
    service.id === serviceId && service.is_qualified
  );
}

export function getStaffPrimaryLocation(staff: StaffWithDetails): StaffLocation | null {
  return staff.locations.find(location => location.is_primary) || null;
}

export function getStaffAvailableServices(staff: StaffWithDetails): StaffService[] {
  return staff.services.filter(service => service.is_qualified);
}