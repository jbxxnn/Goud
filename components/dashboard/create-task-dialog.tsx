'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { HugeiconsIcon } from '@hugeicons/react';
import { Task01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';

interface CreateTaskDialogProps {
  onTaskCreated?: () => void;
  trigger?: React.ReactNode;
}

export function CreateTaskDialog({ onTaskCreated, trigger }: CreateTaskDialogProps) {
  const t = useTranslations('CreateTaskDialog');
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const handleCreateTask = async () => {
    if (!content.trim()) {
      toast.error(t('toasts.required'));
      return;
    }

    try {
      setIsSubmitting(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('assistant_tasks')
        .insert({
          content: content.trim(),
          created_by: user.id,
        });

      if (error) throw error;

      toast.success(t('toasts.success'));
      setContent('');
      setOpen(false);
      if (onTaskCreated) onTaskCreated();
    } catch (error: any) {
      console.error('Error creating task:', error);
      const errorMsg = error.message === 'Not authenticated' ? t('toasts.authError') : t('toasts.error');
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" className="gap-2 bg-primary">
            <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" />
            {t('trigger')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" style={{borderRadius: "10px"}}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Task01Icon} className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="task-content">{t('label')}</Label>
            <Textarea
              id="task-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('placeholder')}
              className="min-h-[100px]"
              style={{borderRadius: "10px"}}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleCreateTask} disabled={isSubmitting}>
            {isSubmitting ? t('submitting') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
