'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
    Delete02Icon, 
    PlusSignIcon, 
    Comment01Icon,
    Tick02Icon
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ChecklistItem {
    id: string;
    content: string;
    is_completed: boolean;
    completed_at: string | null;
    completed_by_user: { first_name: string; last_name: string } | null;
    comment: string | null;
    created_at: string;
}

interface ChecklistManagerProps {
    bookingId: string;
}

export function ChecklistManager({ bookingId }: ChecklistManagerProps) {
    const t = useTranslations('Checklist');
    const queryClient = useQueryClient();
    const [newItemContent, setNewItemContent] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');

    // Fetch Items
    const { data: items = [], isLoading } = useQuery<ChecklistItem[]>({
        queryKey: ['checklist', bookingId],
        queryFn: async () => {
            const res = await fetch(`/api/bookings/${bookingId}/checklist`);
            if (!res.ok) throw new Error('Failed to fetch checklist');
            return res.json();
        }
    });

    // Add Item Mutation
    const addItemMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await fetch(`/api/bookings/${bookingId}/checklist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            if (!res.ok) throw new Error('Failed to add item');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['checklist', bookingId] });
            setNewItemContent('');
            toast.success(t('itemAdded'));
        },
        onError: () => toast.error(t('errorAdding'))
    });

    // Toggle Complete Mutation
    const toggleCompleteMutation = useMutation({
        mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
            const res = await fetch(`/api/bookings/${bookingId}/checklist/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_completed })
            });
            if (!res.ok) throw new Error('Failed to update item');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['checklist', bookingId] });
        },
        onError: () => toast.error(t('errorUpdating'))
    });

    // Delete Item Mutation
    const deleteItemMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/bookings/${bookingId}/checklist/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete item');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['checklist', bookingId] });
            toast.success(t('itemDeleted'));
        },
        onError: () => toast.error(t('errorDeleting'))
    });

    // Update Comment Mutation
    const updateCommentMutation = useMutation({
        mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
            const res = await fetch(`/api/bookings/${bookingId}/checklist/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment })
            });
            if (!res.ok) throw new Error('Failed to update comment');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['checklist', bookingId] });
            setEditingCommentId(null);
            toast.success(t('commentSaved'));
        },
        onError: () => toast.error(t('errorCommenting'))
    });

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemContent.trim()) return;
        addItemMutation.mutate(newItemContent);
    };

    const handleSaveComment = (id: string) => {
        updateCommentMutation.mutate({ id, comment: commentText });
    };

    return (
        <div className="space-y-4">
            {/* Add Item Form */}
            <form onSubmit={handleAddItem} className="flex gap-2 items-center">
                <Input
                    placeholder={t('addItemPlaceholder')}
                    value={newItemContent}
                    onChange={(e) => setNewItemContent(e.target.value)}
                    disabled={addItemMutation.isPending}
                />
                <Button type="submit" size="icon" disabled={addItemMutation.isPending || !newItemContent.trim()}>
                    {addItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={PlusSignIcon} size={18} />}
                </Button>
            </form>

            {/* Checklist Items */}
            <ScrollArea className="h-[300px] pr-4">
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center p-4 text-muted-foreground text-sm">
                        {t('noItems')}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item) => (
                            <div key={item.id} className="group border rounded-lg p-3 space-y-2 bg-card/50 hover:bg-card transition-colors">
                            {/* Header: Checkbox + Content + Delete */}
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        checked={item.is_completed}
                                        onCheckedChange={(checked) => toggleCompleteMutation.mutate({ id: item.id, is_completed: !!checked })}
                                        className="mt-1"
                                    />
                                    <div className="flex-1 space-y-1">
                                        <p className={`text-sm font-medium leading-none ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                            {item.content}
                                        </p>
                                        {item.is_completed && item.completed_by_user && (
                                            <p className="text-[10px] text-muted-foreground">
                                                {t('completedBy')} {item.completed_by_user.first_name} • {format(new Date(item.completed_at!), 'PP p')}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                        onClick={() => deleteItemMutation.mutate(item.id)}
                                    >
                                        <HugeiconsIcon icon={Delete02Icon} size={14} />
                                    </Button>
                                    </div>
                                
                                {/* Comment Section */}
                                <div className="ml-7">
                                    {editingCommentId === item.id ? (
                                        <div className="flex gap-2">
                                            <Input
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                className="h-7 text-xs"
                                                placeholder={t('commentPlaceholder')}
                                                autoFocus
                                            />
                                            <Button size="icon" className="h-7 w-7" onClick={() => handleSaveComment(item.id)}>
                                                <HugeiconsIcon icon={Tick02Icon} size={12} />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div 
                                            className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground"
                                            onClick={() => {
                                                setEditingCommentId(item.id);
                                                setCommentText(item.comment || '');
                                            }}
                                        >
                                            <HugeiconsIcon icon={Comment01Icon} size={12} />
                                            {item.comment ? (
                                                <span>{item.comment}</span>
                                            ) : (
                                                <span className="opacity-50 hover:opacity-100">{t('addComment')}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
