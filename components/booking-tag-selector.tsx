'use client';

import { useState, useEffect } from 'react';
import { Check, Plus, Tag, X, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { BookingTag } from '@/lib/types/booking-tag';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface BookingTagSelectorProps {
  bookingId: string;
  initialTags?: BookingTag[];
  onTagsChange?: (tags: BookingTag[]) => void;
  className?: string;
  readOnly?: boolean;
}

export function BookingTagSelector({
  bookingId,
  initialTags = [],
  onTagsChange,
  className,
  readOnly = false,
}: BookingTagSelectorProps) {
  const t = useTranslations('BookingTags');
  const tTags = useTranslations('BookingTags');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState<BookingTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<BookingTag[]>(initialTags);
  const [fetching, setFetching] = useState(false);

  // Fetch available tags
  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        setFetching(true);
        const response = await fetch('/api/booking-tags?activeOnly=true');
        const data = await response.json();
        if (data.success) {
          setAvailableTags(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching available tags:', error);
      } finally {
        setFetching(false);
      }
    };

    fetchAvailableTags();
  }, []);

  // Update selected tags if initialTags changes (e.g. from parent booking update)
  useEffect(() => {
    setSelectedTags(initialTags);
  }, [initialTags]);

  const handleToggleTag = async (tag: BookingTag) => {
    if (readOnly) return;

    const isSelected = selectedTags.some((t) => t.id === tag.id);
    const previousTags = [...selectedTags];
    let newSelected: BookingTag[];

    if (isSelected) {
      newSelected = selectedTags.filter((t) => t.id !== tag.id);
    } else {
      newSelected = [...selectedTags, tag];
    }

    // Optimistic Update
    setSelectedTags(newSelected);
    onTagsChange?.(newSelected);

    try {
      setLoading(true);
      // Call Sync API
      const response = await fetch(`/api/bookings/${bookingId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: newSelected.map((t) => t.id) }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tags');
      }
    } catch (error) {
      console.error('Error updating tags:', error);
      toast.error(t('toasts.error') || 'Error updating tags');
      // Rollback
      setSelectedTags(previousTags);
      onTagsChange?.(previousTags);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('space-y-2 w-full', className)}>
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground mb-1">{tTags('selector.tags')}</div>
      {!readOnly && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground shadow-sm border border-secondary bg-card hover:bg-muted"
              >
                <Plus className="w-1.5 h-1.5 mr-1" />
                {t('selector.addTag')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 shadow-xl border-gray-100" align="start">
              <Command>
                <CommandInput placeholder={t('selector.searchTags')} className="h-9" />
                <CommandList>
                  <CommandEmpty>{t('selector.noTagsFound')}</CommandEmpty>
                  <CommandGroup>
                    {fetching ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      availableTags.map((tag) => {
                        const isSelected = selectedTags.some((t) => t.id === tag.id);
                        return (
                          <CommandItem
                            key={tag.id}
                            onSelect={() => handleToggleTag(tag)}
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className="text-sm">{tag.title}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                          </CommandItem>
                        );
                      })
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
        </div>
      <div className="flex flex-wrap gap-1.5 min-h-[1.5rem] items-center">
        {selectedTags.length > 0 ? (
          selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="px-2 py-0.5 rounded-full text-white text-[10px] sm:text-xs font-semibold inline-flex items-center gap-1 shadow-sm group"
              style={{ backgroundColor: tag.color }}
            >
              {/* <Tag className="w-3 h-3" /> */}
              {tag.title}
              {!readOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleTag(tag);
                  }}
                  className="hover:bg-black/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))
        ) : (
          <span className="text-xs text-muted-foreground italic">{t('selector.noTagsApplied')}</span>
        )}

        
      </div>
    </div>
  );
}
