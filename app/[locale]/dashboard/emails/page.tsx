import { EmailTemplatesManager } from '@/components/dashboard/email-templates/email-templates-manager';
import { fetchEmailTemplates } from '@/lib/actions/email-templates';

export default async function EmailTemplatesPage() {
    const templates = await fetchEmailTemplates();
    return <EmailTemplatesManager initialTemplates={templates} />;
}
