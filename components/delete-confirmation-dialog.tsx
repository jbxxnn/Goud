'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  confirmButtonText?: string;
  confirmButtonVariant?: 'default' | 'destructive';
}

import { useTranslations } from 'next-intl';

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  confirmButtonText,
  confirmButtonVariant = 'destructive',
}: DeleteConfirmationDialogProps) {
  const t = useTranslations('Common');
  const buttonClassName = confirmButtonVariant === 'destructive'
    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
    : 'bg-secondary-foreground hover:bg-secondary-foreground/90';

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent style={{ borderRadius: '1rem' }}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
            {itemName && (
              <span className="font-semibold"> &quot;{itemName}&quot;</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} style={{ borderRadius: '1rem' }}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={buttonClassName}
            style={{ borderRadius: '1rem' }}
          >
            {confirmButtonText || t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}