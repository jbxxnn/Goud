'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl'; // You might need to add translations later
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

// Define the type here or import it if you move it to types
export interface ServiceRepeatType {
    id: string;
    service_id: string;
    label: string;
    duration_minutes: number;
    price_eur_cents: number;
    active: boolean;
}

interface ServiceRepeatManagerProps {
    serviceId?: string;
}

export function ServiceRepeatManager({ serviceId }: ServiceRepeatManagerProps) {
    const t = useTranslations('Services.form.repeats');
    const tCommon = useTranslations('Common');

    const [repeatTypes, setRepeatTypes] = useState<ServiceRepeatType[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        label: '',
        duration_minutes: '15',
        price: '0',
        active: true,
    });

    const fetchRepeatTypes = async () => {
        if (!serviceId) {
            setRepeatTypes([]);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`/api/services/${serviceId}/repeat-types`);
            const data = await response.json();

            if (data.success) {
                setRepeatTypes(data.data || []);
            } else {
                toast.error(t('loadError'), { description: data.error });
            }
        } catch (error) {
            toast.error(t('loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRepeatTypes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serviceId]);

    const resetForm = () => {
        setFormData({
            label: '',
            duration_minutes: '15',
            price: '0',
            active: true,
        });
        setIsAdding(false);
        setEditingId(null);
    };

    const handleAdd = () => {
        resetForm();
        setIsAdding(true);
    };

    const handleEdit = (item: ServiceRepeatType) => {
        setFormData({
            label: item.label,
            duration_minutes: item.duration_minutes.toString(),
            price: (item.price_eur_cents / 100).toFixed(2),
            active: item.active,
        });
        setEditingId(item.id);
        setIsAdding(false);
    };

    const handleSave = async () => {
        if (!serviceId) {
            toast.error(t('saveServiceFirst'));
            return;
        }

        if (!formData.label.trim()) {
            toast.error(t('labelRequired'));
            return;
        }

        try {
            const duration = parseInt(formData.duration_minutes) || 15;
            const priceCents = Math.round((parseFloat(formData.price) || 0) * 100);

            const payload = {
                label: formData.label.trim(),
                duration_minutes: duration,
                price_eur_cents: priceCents,
                active: formData.active,
            };

            if (editingId) {
                const response = await fetch(`/api/services/repeat-types/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const data = await response.json();
                if (data.success) {
                    toast.success(t('updateSuccess'));
                    resetForm();
                    fetchRepeatTypes();
                } else {
                    toast.error(t('updateError'), { description: data.error });
                }
            } else {
                const response = await fetch(`/api/services/${serviceId}/repeat-types`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const data = await response.json();
                if (data.success) {
                    toast.success(t('createSuccess'));
                    resetForm();
                    fetchRepeatTypes();
                } else {
                    toast.error(t('createError'), { description: data.error });
                }
            }
        } catch (error) {
            toast.error(t('saveError'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return;

        try {
            const response = await fetch(`/api/services/repeat-types/${id}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (data.success) {
                toast.success(t('deleteSuccess'));
                fetchRepeatTypes();
            } else {
                toast.error(t('deleteError'), { description: data.error });
            }
        } catch (error) {
            toast.error(t('deleteError'));
        }
    };

    if (!serviceId) {
        return (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <p className="text-sm">{t('saveServiceFirst')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">{t('title')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t('subtitle')}
                    </p>
                </div>
                <Button type="button" onClick={handleAdd} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('add')}
                </Button>
            </div>

            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
                <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium">{editingId ? t('edit') : t('new')}</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                            {tCommon('cancel')}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <Label>{t('label')}</Label>
                            <Input
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                placeholder={t('labelPlaceholder')}
                            />
                        </div>

                        <div className="md:col-span-1">
                            <Label>{t('duration')}</Label>
                            <Input
                                type="number"
                                value={formData.duration_minutes}
                                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                                placeholder="15"
                            />
                        </div>

                        <div className="md:col-span-1">
                            <Label>{t('price')}</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">€</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    className="pl-7"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-3 flex items-center gap-2 pt-2">
                            <Switch
                                id="repeat-active"
                                checked={formData.active}
                                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                            />
                            <Label htmlFor="repeat-active" className="cursor-pointer">{t('active')}</Label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={resetForm}>
                            {tCommon('cancel')}
                        </Button>
                        <Button type="button" onClick={handleSave}>
                            {editingId ? t('update') : t('create')}
                        </Button>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-sm text-muted-foreground">{t('loading')}</div>
                </div>
            ) : repeatTypes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p className="text-sm">{t('listEmpty')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {repeatTypes.map((item) => (
                        <div
                            key={item.id}
                            className="border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{item.label}</span>
                                    {!item.active && (
                                        <Badge variant="outline" className="text-xs">{t('inactive')}</Badge>
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground flex gap-4 mt-1">
                                    <span>{item.duration_minutes} min</span>
                                    <span>{item.price_eur_cents === 0 ? t('free') : `€${(item.price_eur_cents / 100).toFixed(2)}`}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(item)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(item.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
