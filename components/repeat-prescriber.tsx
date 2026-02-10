'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, RefreshCw, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';

interface ServiceRepeatType {
    id: string;
    label: string;
    duration_minutes: number;
    price_eur_cents: number;
}

interface RepeatPrescriberProps {
    bookingId: string;
    serviceId: string;
}

export function RepeatPrescriber({ bookingId, serviceId }: RepeatPrescriberProps) {
    const t = useTranslations('Bookings.repeat');
    const tFlow = useTranslations('Booking.flow');
    const [repeatTypes, setRepeatTypes] = useState<ServiceRepeatType[]>([]);
    const [loadingTypes, setLoadingTypes] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchTypes = async () => {
            if (!serviceId) return;
            try {
                setLoadingTypes(true);
                const response = await fetch(`/api/services/${serviceId}/repeat-types`);
                const data = await response.json();
                if (data.success) {
                    const active = data.data.filter((t: any) => t.active);
                    setRepeatTypes(active);
                }
            } catch (error) {
                console.error('Error fetching repeat types', error);
            } finally {
                setLoadingTypes(false);
            }
        };
        fetchTypes();
    }, [serviceId]);

    const handleGenerate = async () => {
        if (!selectedType) return;
        try {
            setGenerating(true);
            const response = await fetch('/api/continuations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parent_booking_id: bookingId,
                    repeat_type_id: selectedType,
                }),
            });
            const data = await response.json();
            if (data.success) {
                const origin = window.location.origin;
                setGeneratedLink(`${origin}${data.data.link}`);
                toast.success(t('toasts.generated'));
            } else {
                toast.error(t('toasts.generateError'), { description: data.error });
            }
        } catch (error) {
            toast.error(t('toasts.unexpectedError'));
        } finally {
            setGenerating(false);
        }
    };

    const handleCopy = () => {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        toast.success(t('toasts.copied'));
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReset = () => {
        setGeneratedLink(null);
        setSelectedType(null);
        setCopied(false);
    };

    if (!loadingTypes && repeatTypes.length === 0) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) handleReset();
        }}>
            <DialogTrigger asChild>
                <Button variant="default" size="default" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {t('button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>
                        {t('description')}
                    </DialogDescription>
                </DialogHeader>

                {!generatedLink ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t('selectDuration')}</Label>
                            <div className="grid gap-2">
                                {repeatTypes.map((type) => (
                                    <div
                                        key={type.id}
                                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedType === type.id
                                            ? 'border-primary bg-primary/5'
                                            : 'hover:bg-muted'
                                            }`}
                                        onClick={() => setSelectedType(type.id)}
                                    >
                                        <div>
                                            <div className="font-medium">{type.label}</div>
                                            <div className="text-sm text-muted-foreground">{type.duration_minutes} min</div>
                                        </div>
                                        <div className="font-mono text-sm">
                                            {type.price_eur_cents === 0 ? t('free') : `€${(type.price_eur_cents / 100).toFixed(2)}`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button
                            className="w-full"
                            disabled={!selectedType || generating}
                            onClick={handleGenerate}
                        >
                            {generating ? t('generating') : t('generateButton')}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-muted/50 rounded-lg text-center space-y-2">
                            <div className="font-medium text-emerald-600 flex items-center justify-center gap-2">
                                <Check className="h-4 w-4" />
                                {t('linkReady')}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('linkExpiry')}
                            </p>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Input
                                readOnly
                                value={generatedLink}
                                className="font-mono text-xs"
                            />
                            <Button size="icon" variant="outline" onClick={handleCopy}>
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button variant="ghost" onClick={handleReset} className="mr-2">{t('generateAnother')}</Button>
                            <Button onClick={() => setIsOpen(false)}>{t('done')}</Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
