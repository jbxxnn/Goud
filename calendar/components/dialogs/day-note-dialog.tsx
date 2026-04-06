"use client";

import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, subDays, addDays } from "date-fns";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Note01Icon, 
  Location01Icon,
  Delete02Icon
} from "@hugeicons/core-free-icons";

interface DayNoteDialogProps {
  date: Date;
  children: React.ReactNode;
}

export function DayNoteDialog({ date, children }: DayNoteDialogProps) {
  const t = useTranslations("Calendar.view");
  const { locations, dayNotes, fetchDayNotes, userRole, selectedLocationId } = useCalendar();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const canEdit = userRole && ["admin", "staff", "assistant"].includes(userRole);
  const dateStr = format(date, "yyyy-MM-dd");
  
  // Find existing note for this date
  const existingNote = dayNotes.find(n => n.date === dateStr);

  useEffect(() => {
    if (isOpen) {
      setShowConfirmDelete(false);
      if (existingNote) {
        setContent(existingNote.content);
        setSelectedLocationIds(existingNote.location_ids);
      } else {
        setContent("");
        // Default to current location filter if it's a specific location
        setSelectedLocationIds(selectedLocationId !== "all" ? [selectedLocationId] : []);
      }
    }
  }, [isOpen, existingNote, selectedLocationId]);

  const handleDelete = async () => {
    if (!existingNote) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/calendar/day-notes?id=${existingNote.id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Note deleted successfully");
        
        // Refresh notes in context
        const start = startOfWeek(subDays(date, 14), { weekStartsOn: 1 });
        const end = endOfWeek(addDays(date, 14), { weekStartsOn: 1 });
        await fetchDayNotes(start, end);
        
        setIsOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error("Failed to delete note: " + error.message);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Note content is required");
      return;
    }

    if (selectedLocationIds.length === 0) {
      toast.error("Select at least one location");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/calendar/day-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: existingNote?.id,
          date: dateStr,
          content,
          locationIds: selectedLocationIds,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Note saved successfully");
        
        // Refresh notes in context
        const start = startOfWeek(subDays(date, 14), { weekStartsOn: 1 });
        const end = endOfWeek(addDays(date, 14), { weekStartsOn: 1 });
        await fetchDayNotes(start, end);
        
        setIsOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error("Failed to save note: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLocation = (id: string) => {
    setSelectedLocationIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" style={{ borderRadius: '0.5rem' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Note01Icon} size={20} className="text-primary" />
            {format(date, "EEEE, d MMMM")}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="note-content" className="flex justify-between items-end">
              <span className="text-sm font-semibold">{t("notes")}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${content.length > 90 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                {content.length} / 100
              </span>
            </Label>
            <Textarea
              id="note-content"
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 100))}
              disabled={!canEdit || isSubmitting}
              className="resize-none h-28 border-input focus:ring-1 focus:ring-primary/20 transition-all text-sm leading-relaxed"
              style={{ borderRadius: '0.4rem' }}
            />
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <HugeiconsIcon icon={Location01Icon} size={16} className="text-muted-foreground" />
              Locations
            </Label>
            <ScrollArea className="h-36 border rounded-lg p-3 bg-muted/5">
              <div className="space-y-3">
                {locations?.map((location) => (
                  <div key={location.id} className="flex items-center space-x-3 group">
                    <Checkbox 
                      id={`loc-${location.id}`} 
                      checked={selectedLocationIds.includes(location.id)}
                      onCheckedChange={() => toggleLocation(location.id)}
                      disabled={!canEdit || isSubmitting}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label
                      htmlFor={`loc-${location.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 cursor-pointer group-hover:text-primary transition-colors flex-1"
                    >
                      {location.name}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-2 flex flex-col sm:flex-row gap-2">
          {canEdit ? (
            <>
              {existingNote && (
                <div className="flex-1 flex gap-2">
                  {!showConfirmDelete ? (
                    <Button 
                      variant="outline"
                      onClick={() => setShowConfirmDelete(true)}
                      className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive w-full"
                      style={{ borderRadius: '0.5rem' }}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={16} className="mr-2" />
                      Delete
                    </Button>
                  ) : (
                    <div className="flex w-full gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
                      <Button 
                        variant="ghost"
                        onClick={() => setShowConfirmDelete(false)}
                        className="flex-1 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 bg-destructive hover:bg-destructive/90 font-bold"
                        style={{ borderRadius: '0.5rem' }}
                      >
                        {isDeleting ? "Deleting..." : "Confirm"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {!showConfirmDelete && (
                <Button 
                  onClick={handleSave} 
                  disabled={isSubmitting} 
                  className={existingNote ? "flex-1" : "w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm"}
                  style={{ borderRadius: '0.5rem' }}
                >
                  {isSubmitting ? "Saving..." : "Save Note"}
                </Button>
              )}
            </>
          ) : (
            <div className="bg-destructive/5 border border-destructive/10 p-3 rounded-lg w-full text-center">
              <p className="text-[11px] text-destructive font-medium uppercase tracking-wider">
                Read Only Access
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Midwives do not have permission to edit calendar notes.
              </p>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
