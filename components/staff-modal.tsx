'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import StaffForm from '@/components/staff-form';
import StaffView from '@/components/staff-view';
import { Staff, CreateStaffRequest, UpdateStaffRequest } from '@/lib/types/staff';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (staff: CreateStaffRequest | UpdateStaffRequest) => void;
  staff?: Staff;
  isViewMode?: boolean;
}

export default function StaffModal({ isOpen, onClose, onSave, staff, isViewMode = false }: StaffModalProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>
            {isViewMode ? 'View Staff' : staff ? 'Edit Staff' : 'Add New Staff'}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isViewMode ? (
            <StaffView staff={staff!} />
          ) : (
            <StaffForm
              staff={staff}
              onSave={onSave}
              onCancel={onClose}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
