export interface Midwife {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  practice_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMidwifeRequest {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  practice_name?: string;
  is_active?: boolean;
}

export interface UpdateMidwifeRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  practice_name?: string;
  is_active?: boolean;
}

export interface MidwifeResponse {
  success: boolean;
  data: Midwife;
}

export interface MidwivesResponse {
  success: boolean;
  data: Midwife[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper functions
export function getMidwifeDisplayName(midwife: Midwife): string {
  return `${midwife.first_name} ${midwife.last_name}`;
}

export function getMidwifeFullDisplay(midwife: Midwife): string {
  const name = getMidwifeDisplayName(midwife);
  return midwife.practice_name ? `${name} (${midwife.practice_name})` : name;
}





