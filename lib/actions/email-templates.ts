'use server'

import { EmailTemplateService, EmailTemplate } from '@/lib/services/email-template-service';
import { revalidatePath } from 'next/cache';

export async function fetchEmailTemplates(): Promise<EmailTemplate[]> {
    try {
        return await EmailTemplateService.getAllTemplates();
    } catch (error) {
        console.error('Failed to fetch email templates:', error);
        return [];
    }
}

export async function updateEmailTemplate(key: string, data: Partial<EmailTemplate>) {
    try {
        const result = await EmailTemplateService.updateTemplate(key, data);
        revalidatePath('/dashboard/emails');
        return result;
    } catch (error) {
        console.error('Failed to update email template:', error);
        throw new Error('Failed to update email template');
    }
}
