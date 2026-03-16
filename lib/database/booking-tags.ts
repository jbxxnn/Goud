import { createClient } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/db/server-supabase';
import { BookingTag, CreateBookingTagRequest, UpdateBookingTagRequest } from '@/lib/types/booking-tag';

export class BookingTagService {
  /**
   * Get all booking tags
   */
  static async getBookingTags(activeOnly: boolean = false): Promise<BookingTag[]> {
    const supabase = getServiceSupabase();
    let query = supabase.from('booking_tags').select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('title', { ascending: true });

    if (error) {
      console.error('Error fetching booking tags:', error);
      throw new Error(`Failed to fetch booking tags: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a single booking tag by ID
   */
  static async getBookingTagById(id: string): Promise<BookingTag | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('booking_tags')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching booking tag:', error);
      throw new Error(`Failed to fetch booking tag: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new booking tag
   */
  static async createBookingTag(data: CreateBookingTagRequest): Promise<BookingTag> {
    const supabase = await createClient();
    const { data: tag, error } = await supabase
      .from('booking_tags')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error creating booking tag:', error);
      throw new Error(`Failed to create booking tag: ${error.message}`);
    }

    return tag;
  }

  /**
   * Update an existing booking tag
   */
  static async updateBookingTag(id: string, data: UpdateBookingTagRequest): Promise<BookingTag> {
    const supabase = await createClient();
    const { data: tag, error } = await supabase
      .from('booking_tags')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating booking tag:', error);
      throw new Error(`Failed to update booking tag: ${error.message}`);
    }

    return tag;
  }

  /**
   * Delete a booking tag
   */
  static async deleteBookingTag(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from('booking_tags').delete().eq('id', id);
    if (error) throw error;
  }

  static async getTagsByBookingId(bookingId: string): Promise<BookingTag[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('booking_tag_mappings')
      .select('tag:booking_tags(*)')
      .eq('booking_id', bookingId);
    
    if (error) throw error;
    if (!data) return [];
    
    return (data as any[]).map(m => m.tag).filter(Boolean) as BookingTag[];
  }

  static async addTagToBooking(bookingId: string, tagId: string) {
    const supabase = await createClient();
    const { error } = await supabase
      .from('booking_tag_mappings')
      .insert({ booking_id: bookingId, tag_id: tagId });
    
    if (error && error.code !== '23505') throw error; // Ignore unique constraint violation
  }

  static async removeTagFromBooking(bookingId: string, tagId: string) {
    const supabase = await createClient();
    const { error } = await supabase
      .from('booking_tag_mappings')
      .delete()
      .eq('booking_id', bookingId)
      .eq('tag_id', tagId);
    
    if (error) throw error;
  }

  static async syncBookingTags(bookingId: string, tagIds: string[]) {
    const supabase = await createClient();
    
    // Use a transaction-like approach (delete all then insert new)
    const { error: deleteError } = await supabase
      .from('booking_tag_mappings')
      .delete()
      .eq('booking_id', bookingId);
    
    if (deleteError) throw deleteError;

    if (tagIds.length > 0) {
      const { error: insertError } = await supabase
        .from('booking_tag_mappings')
        .insert(tagIds.map(tagId => ({ booking_id: bookingId, tag_id: tagId })));
      
      if (insertError) throw insertError;
    }
  }
}
