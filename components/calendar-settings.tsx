"use client";

import { useState, useRef } from "react";
import { Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChangeWorkingHoursInput } from "@/calendar/components/change-working-hours-input";
import { ChangeVisibleHoursInput } from "@/calendar/components/change-visible-hours-input";
import { useCalendar } from "@/calendar/contexts/calendar-context";

export function CalendarSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { isSaving: contextIsSaving } = useCalendar();
  const workingHoursSaveHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const visibleHoursSaveHandlerRef = useRef<(() => Promise<void>) | null>(null);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 shadow-lg bg-secondary-foreground text-background"
          style={{borderRadius: '0.2rem'}}
        >
          <Settings className="h-4 w-4 mr-2" />
          Calendar Settings
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[600px] sm:w-[700px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Calendar Settings
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-4">
                <h3 className="text-lg font-semibold">Time Settings</h3>
                
                {/* Working Hours */}
                <div className="space-y-2">
                  <h4 className="text-md font-medium">Working Hours</h4>
                  <p className="text-sm text-muted-foreground">
                    Set the working hours for each day of the week
                  </p>
                  <ChangeWorkingHoursInput 
                    onSaveHandlerReady={(handler) => {
                      workingHoursSaveHandlerRef.current = handler;
                    }}
                  />
                </div>

                {/* Visible Hours */}
                <div className="space-y-2">
                  <h4 className="text-md font-medium">Visible Hours</h4>
                  <p className="text-sm text-muted-foreground">
                    Control which hours are visible in the calendar
                  </p>
                  <ChangeVisibleHoursInput 
                    onSaveHandlerReady={(handler) => {
                      visibleHoursSaveHandlerRef.current = handler;
                    }}
                  />
                </div>
              </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t px-6 pb-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button 
            onClick={async () => {
              setIsSaving(true);
              try {
                const errors: string[] = [];
                
                // Save working hours
                if (workingHoursSaveHandlerRef.current) {
                  try {
                    await workingHoursSaveHandlerRef.current();
                  } catch {
                    errors.push("Failed to update working hours");
                  }
                }
                
                // Save visible hours
                if (visibleHoursSaveHandlerRef.current) {
                  try {
                    await visibleHoursSaveHandlerRef.current();
                  } catch {
                    errors.push("Failed to update visible hours");
                  }
                }
                
                if (errors.length === 0) {
                  toast.success("Settings updated successfully");
                } else if (errors.length === 2) {
                  toast.error("Failed to update settings");
                } else {
                  toast.warning(errors[0]);
                }
              } catch {
                toast.error("Failed to update settings");
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving || contextIsSaving}
          >
            {(isSaving || contextIsSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

