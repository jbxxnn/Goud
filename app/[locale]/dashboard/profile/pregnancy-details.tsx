'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HugeiconsIcon } from '@hugeicons/react';
import { CircleLock02Icon } from '@hugeicons/core-free-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';

export function PregnancyDetails() {
    const t = useTranslations('Profile.pregnancy');

    return (
        <Card className="bg-muted/30 border-dashed">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-muted-foreground">{t('title')}</CardTitle>
                        <CardDescription>
                            {t('description')}
                        </CardDescription>
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <HugeiconsIcon icon={CircleLock02Icon} className="text-muted-foreground h-5 w-5" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('readOnly')}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 opacity-70">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('edd')}</Label>
                        <div className="relative">
                            <Input value="-- / -- / ----" disabled className="pl-10" />
                            <div className="absolute left-3 top-2.5">
                                <HugeiconsIcon icon={CircleLock02Icon} size={14} className="text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('parity')}</Label>
                        <div className="relative">
                            <Input value="--" disabled className="pl-10" />
                            <div className="absolute left-3 top-2.5">
                                <HugeiconsIcon icon={CircleLock02Icon} size={14} className="text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    {t('contact')}
                </p>
            </CardContent>
        </Card>
    );
}
