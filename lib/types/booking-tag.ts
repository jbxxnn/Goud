export interface BookingTag {
  id: string;
  created_at?: string;
  title: string;
  description?: string | null;
  color: string;
  is_active?: boolean;
}

export interface BookingTagMapping {
  id: string;
  created_at: string;
  booking_id: string;
  tag_id: string;
  tag?: BookingTag;
}

export interface CreateBookingTagRequest {
  title: string;
  description?: string | null;
  color?: string;
  is_active?: boolean;
}

export interface UpdateBookingTagRequest {
  title?: string;
  description?: string | null;
  color?: string;
  is_active?: boolean;
}
