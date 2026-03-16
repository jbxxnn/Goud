'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2, Loader2, Save, Check, ClipboardList, Info, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';

interface ChecklistEditorProps {
  checklist: any;
  onBack: () => void;
}

export function ChecklistEditor({ checklist, onBack }: ChecklistEditorProps) {
  const t = useTranslations('ServiceChecklist');
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(checklist.title);
  const [description, setDescription] = useState(checklist.description || '');
  const [newItemContent, setNewItemContent] = useState('');
  const [servicesOpen, setServicesOpen] = useState(false);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    checklist.master_checklist_services?.map((s: any) => s.service_id) || []
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch available services
  useEffect(() => {
    const fetchServices = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('services').select('id, name').eq('is_active', true).order('name');
      if (data) setAvailableServices(data);
    };
    fetchServices();
  }, []);

  // Update Checklist Metadata Mutation
  const updateMetaMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/settings/checklists/${checklist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update checklist');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-checklists'] });
      toast.success(t('toasts.updateSuccess'));
    },
    onError: () => toast.error(t('toasts.updateError'))
  });

  // Items Mutations
  const addItemMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/settings/checklists/${checklist.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, item_order: checklist.master_checklist_items?.length || 0 })
      });
      if (!res.ok) throw new Error('Failed to add item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-checklists'] });
      setNewItemContent('');
      toast.success(t('toasts.itemAdded'));
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/settings/checklists/${checklist.id}/items/${itemId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete item');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-checklists'] });
      toast.success(t('toasts.itemRemoved'));
    }
  });

  // Services Sync Mutation
  const syncServicesMutation = useMutation({
    mutationFn: async (serviceIds: string[]) => {
      const res = await fetch(`/api/settings/checklists/${checklist.id}/services`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceIds })
      });
      if (!res.ok) throw new Error('Failed to sync services');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-checklists'] });
      toast.success(t('toasts.servicesSynced'));
    }
  });

  // Delete Checklist Mutation
  const deleteChecklistMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/settings/checklists/${checklist.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete checklist');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-checklists'] });
      toast.success(t('toasts.deleteSuccess'));
      onBack();
    },
    onSettled: () => {
      setIsDeleteDialogOpen(false);
    }
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemContent.trim()) return;
    addItemMutation.mutate(newItemContent);
  };

  const toggleService = (serviceId: string) => {
    const newSelected = selectedServiceIds.includes(serviceId)
      ? selectedServiceIds.filter(id => id !== serviceId)
      : [...selectedServiceIds, serviceId];
    
    setSelectedServiceIds(newSelected);
    syncServicesMutation.mutate(newSelected);
  };

  return (
    <div className="space-y-6">
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => deleteChecklistMutation.mutate()}
        title={t('editor.delete')}
        description={t('editor.deleteConfirm')}
        isLoading={deleteChecklistMutation.isPending}
      />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold flex-1">{t('editor.title')}</h2>
        <Button 
          variant="destructive" 
          size="sm" 
          className="gap-2"
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          {t('editor.delete')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t('editor.generalDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('editor.checklistTitle')}</label>
                <Input 
                  value={title} 
                  className='h-10'
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => title !== checklist.title && updateMetaMutation.mutate({ title })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('editor.checklistDescription')}</label>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => description !== checklist.description && updateMetaMutation.mutate({ description })}
                  placeholder={t('editor.descriptionPlaceholder')}
                  className="resize-none h-24"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                {t('editor.appliedServices')}
              </CardTitle>
              <CardDescription>{t('editor.appliedServicesDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Popover open={servicesOpen} onOpenChange={setServicesOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {t('editor.selectServices')}
                    <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('searchPlaceholder')} />
                    <CommandList>
                      <CommandEmpty>{t('editor.noServiceFound')}</CommandEmpty>
                      <CommandGroup>
                        {availableServices.map((service) => (
                          <CommandItem
                            key={service.id}
                            onSelect={() => toggleService(service.id)}
                            className="flex items-center gap-2"
                          >
                            <div className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              selectedServiceIds.includes(service.id)
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible"
                            )}>
                              <Check className="h-3 w-3" />
                            </div>
                            <span>{service.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="flex flex-wrap gap-2">
                {selectedServiceIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">{t('editor.noServicesSelected')}</p>
                ) : (
                  selectedServiceIds.map(id => {
                    const s = availableServices.find(as => as.id === id);
                    return s ? (
                      <Badge key={id} variant="secondary" className="gap-1 px-2 py-1">
                        {s.name}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleService(id);
                          }}
                        />
                      </Badge>
                    ) : null;
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>{t('editor.checklistItems')}</CardTitle>
                <CardDescription>{t('editor.itemsDescription')}</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono">
                {checklist.master_checklist_items?.length || 0} {t('itemsCount').toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <form onSubmit={handleAddItem} className="flex gap-2">
                <Input 
                  placeholder={t('editor.addItemPlaceholder')} 
                  value={newItemContent} 
                  onChange={(e) => setNewItemContent(e.target.value)}
                  className="flex-1 h-10"
                />
                <Button type="submit" className='h-10' style={{borderRadius: '10rem'}} disabled={addItemMutation.isPending || !newItemContent.trim()}>
                  {addItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </form>

              <Separator />

              <ScrollArea className="h-[500px] pr-4">
                {(!checklist.master_checklist_items || checklist.master_checklist_items.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground opacity-50">
                    <ClipboardList className="h-8 w-8 mb-2" />
                    <p className="text-sm">{t('editor.noItems')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {checklist.master_checklist_items
                      .sort((a: any, b: any) => a.item_order - b.item_order)
                      .map((item: any) => (
                        <div key={item.id} className="group flex items-center gap-3 px-3 py-2 border bg-muted hover:border-muted transition-all" style={{borderRadius: '0.5rem'}}>
                          <div className="flex-1 text-sm font-medium">{item.content}</div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                {t('editor.automationAlert')}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
