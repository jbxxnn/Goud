'use client';

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
            {isViewMode ? 'View Midwife' : midwife ? 'Edit Midwife' : 'Add New Midwife'}
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
          <SheetFooter className="px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="midwife-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : midwife ? 'Update Midwife' : 'Create Midwife'}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

