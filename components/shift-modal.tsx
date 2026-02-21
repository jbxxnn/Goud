import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ShiftForm from './shift-form';
import { ShiftWithDetails } from '@/lib/types/shift';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift?: ShiftWithDetails;
  onSave: () => void;
  onDelete?: () => void;
  isViewMode?: boolean;
}

export default function ShiftModal({ isOpen, onClose, shift, onSave, onDelete, isViewMode = false }: ShiftModalProps) {
  const getTitle = () => {
    if (isViewMode) {
      return 'Shift Details';
    }
    if (shift) {
      const staffName = `${shift.staff_first_name} ${shift.staff_last_name}`;
      const date = new Date(shift.start_time);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
      return `Edit Shift: ${staffName}, ${dayName}, ${dateStr}`;
    }
    return 'Create Shift';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{borderRadius: "10px"}}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <ShiftForm
            shift={shift}
            onSave={onSave}
            onCancel={onClose}
            onDelete={onDelete}
            isViewMode={isViewMode}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

