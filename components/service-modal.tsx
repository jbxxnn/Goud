'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ServiceForm from '@/components/service-form';
import ServiceView from '@/components/service-view';
import { Service, ServiceFormData } from '@/lib/types/service';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: ServiceFormData) => void;
  service?: Service;
  isViewMode?: boolean;
}

export default function ServiceModal({ isOpen, onClose, onSave, service, isViewMode = false }: ServiceModalProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>
            {isViewMode ? 'View Service' : service ? 'Edit Service' : 'Add New Service'}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isViewMode ? (
            <ServiceView service={service!} />
          ) : (
            <ServiceForm
              service={service}
              onSave={onSave}
              onCancel={onClose}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
