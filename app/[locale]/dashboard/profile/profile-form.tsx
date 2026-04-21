'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, UpdateUserRequest } from '@/lib/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { useTranslations } from 'next-intl';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileFormProps {
    user: User;
}

interface MidwifeOption {
    id: string;
    first_name: string | null;
    last_name: string | null;
    practice_name: string | null;
}

export function ProfileForm({ user }: ProfileFormProps) {
    const t = useTranslations('Profile.personalInfo');
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        midwife_id: user.midwife_id,
    });
    const canManageMidwifeSelection = user.role === 'client' || user.role === 'midwife';
    const [midwives, setMidwives] = useState<MidwifeOption[]>([]);
    const [loadingMidwives, setLoadingMidwives] = useState(canManageMidwifeSelection);
    const [midwifePickerOpen, setMidwifePickerOpen] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    useEffect(() => {
        if (!canManageMidwifeSelection) {
            setLoadingMidwives(false);
            return;
        }

        const fetchMidwives = async () => {
            try {
                const response = await fetch('/api/midwives?active_only=true&limit=1000');
                const payload = await response.json();

                if (!response.ok || !payload.success) {
                    throw new Error(payload.error || t('midwifeLoadError'));
                }

                setMidwives(payload.data || []);
            } catch (error) {
                console.error(error);
                toast.error(error instanceof Error ? error.message : t('midwifeLoadError'));
            } finally {
                setLoadingMidwives(false);
            }
        };

        fetchMidwives();
    }, [canManageMidwifeSelection, t]);

    const { mutate: updateProfile, isPending: isLoading } = useMutation({
        mutationFn: async () => {
            const updateData: UpdateUserRequest = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone: formData.phone,
                midwife_id: canManageMidwifeSelection ? formData.midwife_id : undefined,
            };

            const response = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || t('error'));
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success(t('success'));
            queryClient.invalidateQueries({ queryKey: ['user', user.id] });
            // Also invalidate broad user queries if admin might be looking
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error) => {
            console.error(error);
            toast.error(error instanceof Error ? error.message : t('error'));
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        updateProfile();
    };

    const selectedMidwife = midwives.find((midwife) => midwife.id === formData.midwife_id);
    const selectedMidwifeLabel = selectedMidwife
        ? selectedMidwife.practice_name
            ? `${selectedMidwife.practice_name} (${[selectedMidwife.first_name, selectedMidwife.last_name].filter(Boolean).join(' ')})`
            : [selectedMidwife.first_name, selectedMidwife.last_name].filter(Boolean).join(' ') || t('unknownMidwife')
        : t('noMidwife');

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>
                    {t('description')}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">{t('firstName')}</Label>
                            <Input
                                id="first_name"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                placeholder="Jane"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name">{t('lastName')}</Label>
                            <Input
                                id="last_name"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                placeholder="Doe"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">{t('phone')}</Label>
                        <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+31 6 12345678"
                        />
                    </div>
                    {canManageMidwifeSelection && (
                        <div className="space-y-2">
                            <Label htmlFor="midwife">{t('midwife')}</Label>
                            <Popover open={midwifePickerOpen} onOpenChange={setMidwifePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="midwife"
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={midwifePickerOpen}
                                        className="w-full justify-between font-normal"
                                        disabled={loadingMidwives}
                                    >
                                        <span className="truncate">
                                            {loadingMidwives ? t('loadingMidwives') : selectedMidwifeLabel}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder={t('midwifeSearchPlaceholder')} />
                                        <CommandList>
                                            <CommandEmpty>{t('midwifeSearchEmpty')}</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    value={t('noMidwife')}
                                                    onSelect={() => {
                                                        setFormData((prev) => ({ ...prev, midwife_id: null }));
                                                        setMidwifePickerOpen(false);
                                                    }}
                                                >
                                                    <Check className={cn('mr-2 h-4 w-4', !formData.midwife_id ? 'opacity-100' : 'opacity-0')} />
                                                    {t('noMidwife')}
                                                </CommandItem>
                                                {midwives.map((midwife) => {
                                                    const name = [midwife.first_name, midwife.last_name].filter(Boolean).join(' ');
                                                    const label = midwife.practice_name
                                                        ? `${midwife.practice_name} (${name})`
                                                        : name || t('unknownMidwife');

                                                    return (
                                                        <CommandItem
                                                            key={midwife.id}
                                                            value={`${label} ${name} ${midwife.practice_name || ''}`}
                                                            onSelect={() => {
                                                                setFormData((prev) => ({ ...prev, midwife_id: midwife.id }));
                                                                setMidwifePickerOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    'mr-2 h-4 w-4',
                                                                    formData.midwife_id === midwife.id ? 'opacity-100' : 'opacity-0'
                                                                )}
                                                            />
                                                            {label}
                                                        </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <p className="text-xs text-muted-foreground">
                                {user.role === 'midwife' ? t('midwifeNoteMidwife') : t('midwifeNote')}
                            </p>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('email')}</Label>
                        <Input
                            id="email"
                            value={user.email}
                            disabled
                            className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('emailNote')}
                        </p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />
                                {t('saving')}
                            </>
                        ) : (
                            <>
                                <HugeiconsIcon icon={Tick01Icon} className="mr-2 h-4 w-4" />
                                {t('save')}
                            </>
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
