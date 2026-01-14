'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LocationForm } from './location-form';
import { Location, CreateLocationRequest, UpdateLocationRequest } from '@/lib/types/location_simple';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: Location;
  onSave: (data: CreateLocationRequest | UpdateLocationRequest) => Promise<void>;
}

import { useTranslations } from 'next-intl';

export function LocationModal({ isOpen, onClose, location, onSave }: LocationModalProps) {
  const t = useTranslations('Locations.modal');
  const [loading, setLoading] = useState(false);

  const handleSave = async (data: CreateLocationRequest | UpdateLocationRequest) => {
    try {
      setLoading(true);
      await onSave(data);
      // Don't close here - let handleSaveLocation close it after showing the toast
    } catch (error) {
      console.error('Save error:', error);
      // Error toast is handled in handleSaveLocation
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>
            {location ? t('editTitle') : t('addTitle')}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden px-6 py-4">
            <LocationForm
              location={location}
              onSave={handleSave}
              onCancel={onClose}
              loading={loading}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
