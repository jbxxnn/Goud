'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import MidwifeForm from '@/components/midwife-form';
import MidwifeView from '@/components/midwife-view';
import { Midwife, CreateMidwifeRequest, UpdateMidwifeRequest } from '@/lib/types/midwife';

interface MidwifeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (midwife: CreateMidwifeRequest | UpdateMidwifeRequest) => void;
  midwife?: Midwife;
  isViewMode?: boolean;
}

export default function MidwifeModal({ isOpen, onClose, onSave, midwife, isViewMode = false }: MidwifeModalProps) {
  const t = useTranslations('Midwives.modal');
  const tCommon = useTranslations('Common');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (data: CreateMidwifeRequest | UpdateMidwifeRequest) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>
            {isViewMode ? t('viewTitle') : midwife ? t('editTitle') : t('addTitle')}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {isViewMode ? (
            <MidwifeView midwife={midwife!} />
          ) : (
            <MidwifeForm
              midwife={midwife}
              onSave={handleSave}
              onCancel={onClose}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
        {!isViewMode && (
          <SheetFooter className="px-6 py-4 border-t flex flex-col gap-3 md:flex-row md:items-center md:justify-start">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {tCommon('cancel')}
            </Button>
            <Button
              type="submit"
              form="midwife-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? tCommon('saving') : midwife ? tCommon('update') : tCommon('create')}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

