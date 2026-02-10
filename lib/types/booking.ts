import { BookingContactInput } from '@/lib/validation/booking';
import { ServiceAddon, ServicePolicyField, ServicePolicyFieldChoice } from '@/lib/types/service';
export type { ServiceAddon, ServicePolicyField, ServicePolicyFieldChoice };
export type { BookingPolicyAnswer, BookingAddonSelection } from '@/lib/validation/booking';

export type PolicyField = ServicePolicyField & {
    choices: ServicePolicyFieldChoice[];
    order: number;
};

export type AddonOption = {
    id: string;
    addonId: string;
    name: string;
    priceCents: number;
};

export type Addon = {
    id: string;
    name: string;
    description: string | null;
    priceCents: number;
    isRequired: boolean;
    options?: AddonOption[];
};

export type Service = {
    id: string;
    name: string;
    price: number;
    duration?: number;
    policyFields: PolicyField[];
    addons: Addon[];
    allowsTwins: boolean;
    twinPrice?: number | null;
    twinDurationMinutes?: number | null;
};

export type Location = { id: string; name: string };
export type Slot = { shiftId: string; staffId: string; startTime: string; endTime: string };
export type PolicyAnswerValue = string | number | boolean | string[] | null;
export type PolicyResponses = Record<string, PolicyAnswerValue>;
export type AddonSelections = Record<string, boolean | string>; // boolean for toggled, string for selected option id

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
    allows_twins?: boolean | null;
    twin_price?: number | null;
    twin_duration_minutes?: number | null;
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
    isTwin: boolean;
};

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'ongoing' | 'completed';

export interface Booking {
    id: string;
    created_at: string;
    updated_at: string; // Added updated_at
    start_time: string;
    end_time: string;
    status: BookingStatus | string; // Keep string for safety against DB values not matching exactly yet
    payment_status: string; // Added payment_status
    price_eur_cents: number;
    notes: string | null; // Added notes
    service_id: string;
    location_id: string;
    staff_id: string | null;
    user_id: string;
    due_date?: string | null;
    internal_notes?: string | null;
    birth_date?: string | null;
    midwife_id?: string | null;
    is_twin?: boolean;
    parent_booking_id?: string | null;
    continuation_id?: string | null;

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
    created_by_user?: {
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
        option_id?: string | null;
        option?: {
            name: string;
            price: number;
        } | null;
    }>;
    isRepeat?: boolean;
    policy_answers: Array<{
        fieldId?: string;
        field_id?: string;
        value: any;
        priceEurCents?: number;
        price_eur_cents?: number;
    }> | Record<string, any> | null;
}

export interface RecentBookingSummary {
    id: string;
    clientName: string;
    clientEmail?: string;
    serviceName: string;
    serviceCode?: string;
    staffName?: string;
    locationName?: string;
    startTime: string;
    endTime: string;
    status: BookingStatus | string;
    isRepeat?: boolean;
    parentBookingId?: string | null;
}

export const BOOKING_STATE_KEY = 'goudecho_booking_state';
export const STATE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export interface BookingsResponse {
    success: boolean;
    data?: Booking[];
    error?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}

