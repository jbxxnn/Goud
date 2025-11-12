// Booking types for the Prenatal Ultrasound Booking System

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface BookingAddon {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price_eur_cents: number;
}

export interface Booking {
  id: string;
  client_id: string;
  service_id: string;
  location_id: string;
  staff_id: string | null;
  shift_id: string | null;
  start_time: string;
  end_time: string;
  price_eur_cents: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  notes: string | null;
  policy_answers?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  // Joined data
  users?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  };
  services?: {
    id: string;
    service_code: string | null;
    name: string;
    duration: number;
  };
  locations?: {
    id: string;
    name: string;
  };
  staff?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  addons?: BookingAddon[];
}

export interface RecentBookingSummary {
  id: string;
  clientName: string;
  clientEmail: string | null;
  serviceName: string;
  serviceCode: string | null;
  staffName: string | null;
  locationName: string | null;
  startTime: string;
  status: BookingStatus;
}

export interface BookingsResponse {
  success: boolean;
  data: Booking[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  error?: string;
}

export interface UpdateBookingRequest {
  start_time?: string;
  end_time?: string;
  status?: BookingStatus;
  payment_status?: PaymentStatus;
  notes?: string;
}

