'use client';

import { useState } from 'react';
import { EmailTemplate } from '@/lib/services/email-template-service';
import { updateEmailTemplate } from '@/lib/actions/email-templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EmailTemplatesManagerProps {
    initialTemplates: EmailTemplate[];
}

export function EmailTemplatesManager({ initialTemplates }: EmailTemplatesManagerProps) {
    const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const handleEdit = (template: EmailTemplate) => {
        setEditingTemplate(template);
        setSubject(template.subject);
        setBody(template.body);
    };

    const handleSave = async () => {
        if (!editingTemplate) return;

        setIsLoading(true);
        try {
            const updated = await updateEmailTemplate(editingTemplate.key, {
                subject,
                body
            });

            // Update local state
            setTemplates(templates.map(t => t.key === editingTemplate.key ? { ...t, subject, body } : t));
            setEditingTemplate(null);
            toast.success('Template updated successfully');
        } catch (error) {
            toast.error('Failed to update template');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Email Templates</h2>
                <p className="text-muted-foreground">Manage email content and subject lines.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                    <Card key={template.key}>
                        <CardHeader>
                            <CardTitle className="text-lg">{formatKey(template.key)}</CardTitle>
                            <CardDescription>{template.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm font-medium mb-1">Subject:</p>
                            <p className="text-sm text-gray-500 mb-4 truncate">{template.subject}</p>
                            <Button onClick={() => handleEdit(template)} variant="outline" className="w-full">
                                Edit Template
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Template: {editingTemplate && formatKey(editingTemplate.key)}</DialogTitle>
                        <DialogDescription>
                            Make changes to the email subject and body. Use {'{{variable}}'} for dynamic content.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="body">Body Content</Label>
                            <Textarea
                                id="body"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="min-h-[200px] font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                This content replaces the introduction text. Structured details (date, time, etc.) will still be displayed below this message.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function formatKey(key: string) {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
