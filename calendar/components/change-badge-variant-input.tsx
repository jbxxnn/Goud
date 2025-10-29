"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import type { TBadgeVariant } from "@/calendar/types";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ChangeBadgeVariantInput() {
  const { badgeVariant, setBadgeVariant, isSaving } = useCalendar();
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = async (value: string) => {
    setIsLoading(true);
    try {
      await setBadgeVariant(value as TBadgeVariant);
      toast.success("Badge variant updated successfully");
    } catch (error) {
      toast.error("Failed to update badge variant");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Change badge variant</p>

      <div className="relative">
        <Select 
          value={badgeVariant} 
          onValueChange={handleChange}
          disabled={isLoading || isSaving}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="dot">Dot</SelectItem>
            <SelectItem value="colored">Colored</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
        {(isLoading || isSaving) && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
