import { getServiceSupabase } from '@/lib/db/server-supabase';

export type EmailTemplate = {
    id: string;
    key: string;
    subject: string;
    body: string;
    description: string;
    updated_at: string;
};

export class EmailTemplateService {
    static async getTemplate(key: string): Promise<EmailTemplate | null> {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .eq('key', key)
            .single();

        if (error) {
            console.warn(`[EmailTemplateService] Template not found for key: ${key}`, error.message);
            return null;
        }
        return data;
    }

    static async updateTemplate(key: string, updates: Partial<EmailTemplate>) {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('email_templates')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('key', key)
            .select()
            .single();

        if (error) {
            console.error(`[EmailTemplateService] Error updating template ${key}:`, error);
            throw error;
        }
        return data;
    }

    static async getAllTemplates() {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .order('key');

        if (error) throw error;
        return data;
    }
}
