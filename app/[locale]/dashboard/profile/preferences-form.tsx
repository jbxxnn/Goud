'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function PreferencesForm() {
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [smsEnabled, setSmsEnabled] = useState(true);

    const handleToggle = (type: 'email' | 'sms', value: boolean) => {
        if (type === 'email') setEmailEnabled(value);
        if (type === 'sms') setSmsEnabled(value);

        // Mock API call
        toast.success(`${type === 'email' ? 'Email' : 'SMS'} notifications turned ${value ? 'on' : 'off'}`);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                    Manage how you want to be notified about appointments.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                        <Label htmlFor="email-notifications" className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Email Reminders
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Receive booking confirmations and reminders via email.
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
                            SMS Reminders
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Receive urgent updates and reminders via SMS.
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
