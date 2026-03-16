'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Loader, ClipboardList, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ChecklistEditor } from './checklist-editor';
import { toast } from 'sonner';

import { useTranslations } from 'next-intl';

export function ServiceChecklistManager() {
  const t = useTranslations('ServiceChecklist');
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ['master-checklists'],
    queryFn: async () => {
      const res = await fetch('/api/settings/checklists');
      if (!res.ok) throw new Error('Failed to fetch checklists');
      return res.json();
    }
  });

  const createChecklistMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch('/api/settings/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: '' })
      });
      if (!res.ok) throw new Error('Failed to create checklist');
      return res.json();
    },
    onSuccess: (newChecklist) => {
      // Optimistically add to cache so it's available immediately for the editor
      queryClient.setQueryData(['master-checklists'], (old: any) => {
        if (!old) return [newChecklist];
        return [newChecklist, ...old];
      });
      queryClient.invalidateQueries({ queryKey: ['master-checklists'] });
      setEditingChecklistId(newChecklist.id);
      setIsAdding(false);
      toast.success(t('toasts.createSuccess'));
    },
    onError: () => toast.error(t('toasts.createError'))
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    if (!title.trim()) return;
    createChecklistMutation.mutate(title);
  };

  const filteredChecklists = checklists.filter((c: any) => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (editingChecklistId) {
    const checklist = checklists.find((c: any) => c.id === editingChecklistId);
    if (!checklist) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Loader className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      );
    }
    return (
      <ChecklistEditor 
        checklist={checklist} 
        onBack={() => setEditingChecklistId(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('title')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('newChecklist')}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder={t('searchPlaceholder')} 
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isAdding && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>{t('createTitle')}</CardTitle>
            <CardDescription>{t('createDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-4">
              <Input name="title" className='h-10' style={{borderRadius: '1rem'}} placeholder={t('titlePlaceholder')} autoFocus required />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className='h-10' onClick={() => setIsAdding(false)}>{t('cancel')}</Button>
                <Button type="submit" className='h-10' style={{borderRadius: '10rem'}} disabled={createChecklistMutation.isPending}>
                  {createChecklistMutation.isPending ? <Loader className="h-4 w-4 animate-spin" /> : t('create')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredChecklists.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium">{t('noChecklistsFound')}</h3>
            <p className="text-muted-foreground mb-4">{t('noChecklistsDescription')}</p>
            <Button variant="outline" onClick={() => setIsAdding(true)}>{t('createFirst')}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredChecklists.map((checklist: any) => (
            <Card 
              key={checklist.id} 
              className="hover:border-primary/50 transition-colors cursor-pointer group"
              style={{borderRadius: '0.5rem'}}
              onClick={() => setEditingChecklistId(checklist.id)}
            >
              <CardContent className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{checklist.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {checklist.master_checklist_items?.length || 0} {t('itemsCount')} • {checklist.master_checklist_services?.length || 0} {t('servicesCount')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
