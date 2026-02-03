'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export function PreferencesForm() {
    const t = useTranslations('Profile.notifications');
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [smsEnabled, setSmsEnabled] = useState(true);

    const handleToggle = (type: 'email' | 'sms', value: boolean) => {
        if (type === 'email') setEmailEnabled(value);
        if (type === 'sms') setSmsEnabled(value);

        // Mock API call
        toast.success(value ? t(`${type}.on`) : t(`${type}.off`));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>
                    {t('description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                        <Label htmlFor="email-notifications" className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {t('email.label')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {t('email.description')}
                        </p>
                    </div>
                    <Switch
                        id="email-notifications"
                        checked={emailEnabled}
                        onCheckedChange={(checked) => handleToggle('email', checked)}
                    />
                </div>
                <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                        <Label htmlFor="sms-notifications" className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {t('sms.label')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {t('sms.description')}
                        </p>
                    </div>
                    <Switch
                        id="sms-notifications"
                        checked={smsEnabled}
                        onCheckedChange={(checked) => handleToggle('sms', checked)}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
