"use client";

import { useState } from "react";
import { Settings, Clock, Users, Calendar as CalendarIcon } from "lucide-react";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChangeWorkingHoursInput } from "@/calendar/components/change-working-hours-input";
import { ChangeVisibleHoursInput } from "@/calendar/components/change-visible-hours-input";
import { ChangeBadgeVariantInput } from "@/calendar/components/change-badge-variant-input";

export function CalendarSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedUserId, setSelectedUserId, users } = useCalendar();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 shadow-lg"
        >
          <Settings className="h-4 w-4 mr-2" />
          Calendar Settings
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Calendar Settings
          </SheetTitle>
          <SheetDescription>
            Customize your calendar display and behavior
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="display" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="display" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Display
              </TabsTrigger>
              <TabsTrigger value="hours" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hours
              </TabsTrigger>
              <TabsTrigger value="filters" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Filters
              </TabsTrigger>
            </TabsList>

            {/* Display Settings */}
            <TabsContent value="display" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Display Options</h3>
                
                {/* Badge Variant */}
                <div className="space-y-2">
                  <ChangeBadgeVariantInput />
                </div>

                {/* Event Display Options */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-event-times">Show Event Times</Label>
                      <p className="text-sm text-muted-foreground">
                        Display start and end times on event blocks
                      </p>
                    </div>
                    <Switch id="show-event-times" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-staff-names">Show Staff Names</Label>
                      <p className="text-sm text-muted-foreground">
                        Display staff member names on event blocks
                      </p>
                    </div>
                    <Switch id="show-staff-names" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-location-names">Show Location Names</Label>
                      <p className="text-sm text-muted-foreground">
                        Display location names on event blocks
                      </p>
                    </div>
                    <Switch id="show-location-names" defaultChecked />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Hours Settings */}
            <TabsContent value="hours" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Time Settings</h3>
                
                {/* Working Hours */}
                <div className="space-y-2">
                  <h4 className="text-md font-medium">Working Hours</h4>
                  <p className="text-sm text-muted-foreground">
                    Set the working hours for each day of the week
                  </p>
                  <ChangeWorkingHoursInput />
                </div>

                {/* Visible Hours */}
                <div className="space-y-2">
                  <h4 className="text-md font-medium">Visible Hours</h4>
                  <p className="text-sm text-muted-foreground">
                    Control which hours are visible in the calendar
                  </p>
                  <ChangeVisibleHoursInput />
                </div>
              </div>
            </TabsContent>

            {/* Filters Settings */}
            <TabsContent value="filters" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Filter Options</h3>
                
                {/* Staff Filter */}
                <div className="space-y-2">
                  <Label htmlFor="staff-filter">Filter by Staff Member</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All staff members" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff Members</SelectItem>
                      {users && users.length > 0 ? users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      )) : (
                        <SelectItem value="no-staff" disabled>
                          No staff members available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Show shifts only for the selected staff member
                  </p>
                </div>

                {/* Additional Filter Options */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-recurring">Show Recurring Shifts</Label>
                      <p className="text-sm text-muted-foreground">
                        Display recurring shift instances
                      </p>
                    </div>
                    <Switch id="show-recurring" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-inactive">Show Inactive Shifts</Label>
                      <p className="text-sm text-muted-foreground">
                        Display inactive or cancelled shifts
                      </p>
                    </div>
                    <Switch id="show-inactive" defaultChecked={false} />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

