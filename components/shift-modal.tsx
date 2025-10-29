import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import ShiftForm from './shift-form';
import { ShiftWithDetails } from '@/lib/types/shift';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift?: ShiftWithDetails;
  onSave: () => void;
  isViewMode?: boolean;
}

export default function ShiftModal({ isOpen, onClose, shift, onSave, isViewMode = false }: ShiftModalProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {isViewMode ? 'Shift Details' : shift ? 'Edit Shift' : 'Create Shift'}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <ShiftForm
            shift={shift}
            onSave={onSave}
            onCancel={onClose}
            isViewMode={isViewMode}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

