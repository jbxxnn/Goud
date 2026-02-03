'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, UpdateUserRequest } from '@/lib/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { useTranslations } from 'next-intl';

interface ProfileFormProps {
    user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
    const t = useTranslations('Profile.personalInfo');
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const { mutate: updateProfile, isPending: isLoading } = useMutation({
        mutationFn: async () => {
            const updateData: UpdateUserRequest = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone: formData.phone,
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
