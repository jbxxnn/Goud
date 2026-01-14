import { BookingContactInput } from '@/lib/validation/booking';
import { ServiceAddon, ServicePolicyField, ServicePolicyFieldChoice } from '@/lib/types/service';
export type { ServiceAddon, ServicePolicyField, ServicePolicyFieldChoice };
export type { BookingPolicyAnswer, BookingAddonSelection } from '@/lib/validation/booking';

export type PolicyField = ServicePolicyField & {
  choices: ServicePolicyFieldChoice[];
  order: number;
};

export type Addon = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  isRequired: boolean;
};

export type Service = {
  id: string;
  name: string;
  price: number;
  policyFields: PolicyField[];
  addons: Addon[];
};

export type Location = { id: string; name: string };
export type Slot = { shiftId: string; staffId: string; startTime: string; endTime: string };
export type PolicyAnswerValue = string | number | boolean | string[] | null;
export type PolicyResponses = Record<string, PolicyAnswerValue>;
export type AddonSelections = Record<string, boolean>;

export type RawPolicyField = ServicePolicyField & {
  order?: number | null;
  field_order?: number | null;
  service_policy_field_choices?: ServicePolicyFieldChoice[];
};

export type ServiceApiResponse = {
  id: string;
  name: string;
  price: number;
  policy_fields?: RawPolicyField[] | null;
  addons?: ServiceAddon[] | null;
};

export type DateRange = { start: string; end: string };

export type BookingState = {
  step: 1 | 2 | 3 | 4;
  serviceId: string;
  locationId: string;
  date: string;
  selectedSlot: Slot | null;
  policyResponses: PolicyResponses;
  selectedAddons: AddonSelections;
  clientEmail: string;
  contactDefaults: Omit<BookingContactInput, 'clientEmail'>;
  emailChecked: null | { exists: boolean };
  isLoggedIn: boolean;
  monthCursor: string; // ISO date string
  timestamp: number; // to detect stale data
};


export interface Booking {
  id: string;
  created_at: string;
  start_time: string;
  end_time: string;
  status: string;
  price_eur_cents: number;
  service_id: string;
  location_id: string;
  staff_id: string | null;
  user_id: string;

  // Relations
  services: {
    name: string;
    duration?: number;
  } | null;
  locations: {
    name: string;
    address?: string;
  } | null;
  staff: {
    first_name: string;
    last_name: string;
  } | null;
  users: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
  } | null;

  addons: Array<{
    id: string;
    name: string;
    description: string | null;
    price_eur_cents: number;
    quantity: number;
  }>;
  policy_answers: Array<{
    fieldId?: string;
    field_id?: string;
    value: any;
    priceEurCents?: number;
    price_eur_cents?: number;
  }> | Record<string, any> | null;
}

export const BOOKING_STATE_KEY = 'goudecho_booking_state';
export const STATE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
