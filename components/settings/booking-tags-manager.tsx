'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BookingTag } from '@/lib/types/booking-tag';
import { Loader, Trash2, Plus, Pencil, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';

export function BookingTagsManager() {
  const t = useTranslations('BookingTags');
  const [tags, setTags] = useState<BookingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingTag, setEditingTag] = useState<BookingTag | null>(null);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  const [newTag, setNewTag] = useState({
    title: '',
    description: '',
    color: '#3b82f6',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/booking-tags');
      const data = await response.json();
      if (data.success) {
        setTags(data.data);
      } else {
        toast.error(t('toasts.loadError'));
      }
    } catch (error) {
      toast.error(t('toasts.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.title) return;

    try {
      setSubmitting(true);
      const response = await fetch('/api/booking-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTag),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('toasts.createSuccess'));
        setNewTag({ title: '', description: '', color: '#3b82f6' });
        fetchData();
      } else {
        toast.error(data.error || t('toasts.createError'));
      }
    } catch (error) {
      toast.error(t('toasts.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !editingTag.title) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/booking-tags/${editingTag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTag.title,
          description: editingTag.description,
          color: editingTag.color,
          is_active: editingTag.is_active,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('toasts.updateSuccess'));
        setEditingTag(null);
        fetchData();
      } else {
        toast.error(data.error || t('toasts.updateError'));
      }
    } catch (error) {
      toast.error(t('toasts.updateError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/booking-tags/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success(t('toasts.deleteSuccess'));
        setTagToDelete(null);
        fetchData();
      } else {
        toast.error(data.error || t('toasts.deleteError'));
      }
    } catch (error) {
      toast.error(t('toasts.deleteError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <DeleteConfirmationDialog
        isOpen={!!tagToDelete}
        onClose={() => setTagToDelete(null)}
        onConfirm={() => tagToDelete && handleDeleteTag(tagToDelete)}
        title={t('editTag')}
        description={t('toasts.deleteConfirm')}
        isLoading={submitting}
      />
      <Card className="shadow-none" style={{ borderRadius: '10px' }}>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTag} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4 items-end">
              <div className="grid gap-2 col-span-1">
                <Label htmlFor="title">{t('form.title')}</Label>
                <Input
                  id="title"
                  placeholder={t('form.titlePlaceholder')}
                  className='h-10'
                  value={newTag.title}
                  onChange={(e) => setNewTag({ ...newTag, title: e.target.value })}
                  required
                  style={{ borderRadius: '10px' }}
                />
              </div>
              <div className="grid gap-2 col-span-1">
                <Label htmlFor="description">{t('form.description')}</Label>
                <Input
                  id="description"
                  placeholder={t('form.descriptionPlaceholder')}
                  className='h-10'
                  value={newTag.description || ''}
                  onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                  style={{ borderRadius: '10px' }}
                />
              </div>
              <div className="grid gap-2 col-span-1">
                <Label htmlFor="create_color_picker">{t('form.color')}</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="create_color_picker"
                    type="color"
                    title="Select tag color"
                    value={newTag.color || '#3b82f6'}
                    onInput={(e) => {
                      const val = e.currentTarget.value;
                      setNewTag(prev => ({ ...prev, color: val }));
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewTag(prev => ({ ...prev, color: val }));
                    }}
                    className="h-10 w-20 rounded-xl border border-input cursor-pointer bg-white"
                  />
                  <Input
                    type="text"
                    value={newTag.color}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewTag(prev => ({ ...prev, color: val }));
                    }}
                    className="flex-1 font-mono text-xm h-10"
                    placeholder="#3b82f6"
                    style={{ borderRadius: '10px' }}
                  />
                </div>
              </div>
              <Button type="submit" disabled={submitting} style={{ borderRadius: '10px' }} className="h-10 col-span-1">
                {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {t('addTag')}
              </Button>
            </div>

            {/* Live Preview */}
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">{t('table.preview')}</Label>
              <div className="h-12 flex items-center p-3 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <div
                  className="px-3 py-1.5 rounded-lg text-white text-sm font-medium inline-flex items-center gap-2 shadow-sm transition-all duration-300 transform hover:scale-105"
                  style={{ backgroundColor: newTag.color || '#3b82f6', borderRadius: '1rem' }}
                >
                  <Tag className="w-4 h-4" />
                  {newTag.title || t('form.titlePlaceholder')}
                </div>
              </div>
            </div>
          </form>

          <div className="mt-8 rounded-xl border bg-background overflow-hidden" style={{ borderRadius: '10px' }}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[150px]">{t('table.preview')}</TableHead>
                  <TableHead>{t('table.title')}</TableHead>
                  <TableHead>{t('table.description')}</TableHead>
                  <TableHead className="w-[100px] text-right pr-6">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-muted-foreground text-sm">Loading tags...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : tags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Tag className="w-8 h-8 opacity-20 mb-2" />
                        <span>{t('table.empty')}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tags.map((tag) => (
                    <TableRow key={tag.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div
                          className="w-3 h-3 rounded-full text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                          style={{ backgroundColor: tag.color }}
                        >
                          {/* <Tag className="w-3 h-3" /> */}
                          {/* {tag.title} */}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{tag.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {tag.description || <span className="opacity-30 italic text-xs">No description</span>}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTag(tag)}
                            className="h-8 w-8 text-secondary-foreground hover:bg-secondary/20"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTagToDelete(tag.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Tag Dialog */}
      <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden" style={{ borderRadius: '15px' }}>
          <div className="h-2 w-full" style={{ backgroundColor: editingTag?.color || '#3b82f6' }} />
          <div className="p-6 pt-4">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" style={{ color: editingTag?.color || '#3b82f6' }} />
                {t('editTag')}
              </DialogTitle>
            </DialogHeader>
            {editingTag && (
              <form onSubmit={handleUpdateTag} className="space-y-5">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit_title">{t('form.title')}</Label>
                    <Input
                      id="edit_title"
                      value={editingTag.title}
                      onChange={(e) => setEditingTag({ ...editingTag, title: e.target.value })}
                      required
                      className="h-11"
                      style={{ borderRadius: '10px' }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit_description">{t('form.description')}</Label>
                    <Input
                      id="edit_description"
                      value={editingTag.description || ''}
                      onChange={(e) => setEditingTag({ ...editingTag, description: e.target.value })}
                      className="h-11"
                      style={{ borderRadius: '10px' }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit_color_picker">{t('form.color')}</Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="edit_color_picker"
                        type="color"
                        title="Select tag color"
                        value={editingTag.color || '#3b82f6'}
                        onInput={(e) => {
                          const val = e.currentTarget.value;
                          setEditingTag(prev => prev ? ({ ...prev, color: val }) : null);
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingTag(prev => prev ? ({ ...prev, color: val }) : null);
                        }}
                        className="h-11 w-20 rounded-xl border border-input cursor-pointer bg-white"
                      />
                      <Input
                        type="text"
                        value={editingTag.color}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingTag(prev => prev ? ({ ...prev, color: val }) : null);
                        }}
                        className="flex-1 font-mono text-xs h-11"
                        style={{ borderRadius: '10px' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 block">{t('table.preview')}</Label>
                  <div
                    className="px-3 py-1.5 rounded-lg text-white text-sm font-medium inline-flex items-center gap-2 shadow-sm"
                    style={{ backgroundColor: editingTag.color, borderRadius: '1rem' }}
                  >
                    <Tag className="w-4 h-4" />
                    {editingTag.title || 'Tag Name'}
                  </div>
                </div>

                <DialogFooter className="gap-4 sm:gap-4 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditingTag(null)} className="h-10 px-6 bg-white" style={{ borderRadius: '10px' }}>
                    {t('cancel')}
                  </Button>
                  <Button type="submit" disabled={submitting} className="h-10 px-8 shadow-md transition-all hover:translate-y-[-1px]" style={{ borderRadius: '10px' }}>
                    {submitting ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t('saveChanges')}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
