"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import ShiftModal from "@/components/shift-modal";
import { ShiftWithDetails } from "@/lib/types/shift";
import { toast } from "sonner";
import type { IEvent } from "@/calendar/interfaces";
import { useTranslations } from 'next-intl';

interface IProps {
  event: IEvent;
  children: React.ReactNode;
  onShiftDeleted?: () => void;
  onShiftUpdated?: () => void;
  isReadOnly?: boolean;
}

export function ShiftDetailsDialog({ event, children, onShiftDeleted, onShiftUpdated, isReadOnly }: IProps) {
  const t = useTranslations('Shifts.dialog.details');
  const [shift, setShift] = useState<ShiftWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchShiftDetails = async () => {
    if (loading) return; // Prevent multiple clicks
    if (shift) {
      // If we already fetched it, just open the modal
      setIsEditOpen(true);
      return;
    }

    setLoading(true);
    try {
      const baseId = String(event.id).split('-instance-')[0];
      const response = await fetch(`/api/shifts/${baseId}?with_details=true`);
      const data = await response.json();

      if (data.success && data.data) {
        let shiftData = data.data;
        const isInstance = String(event.id).includes('-instance-');
        
        if (isInstance) {
          // Override the parent shift's dates with this specific instance's dates for the UI 
          shiftData = {
            ...shiftData,
            _isRecurringInstance: true,
            _instanceDate: event.startDate, // Keep track of the specific date we clicked
            start_time: event.startDate,
            end_time: event.endDate
          };
        }
        
        setShift(shiftData);
        setIsEditOpen(true);
      } else {
        toast.error(t('loadError'));
      }
    } catch (error) {
      console.error('Error fetching shift:', error);
      toast.error(t('loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fetchShiftDetails();
  };

  return (
    <>
      <div onClick={handleClick} className="contents relative cursor-pointer w-full h-full">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 rounded-md backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        {children}
      </div>

      {shift && (
        <ShiftModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          shift={shift}
          isViewMode={isReadOnly}
          onSave={() => {
            setIsEditOpen(false);
            if (onShiftUpdated) onShiftUpdated();
          }}
          onDelete={() => {
            setIsEditOpen(false);
            if (onShiftDeleted) onShiftDeleted();
          }}
        />
      )}
    </>
  );
}

