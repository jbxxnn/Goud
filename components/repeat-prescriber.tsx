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
    const [generating, setGenerating] = useState<'send' | 'book' | null>(null);
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
                    if (active.length === 1) {
                        setSelectedType(active[0].id);
                    }
                }
            } catch (error) {
                console.error('Error fetching repeat types', error);
            } finally {
                setLoadingTypes(false);
            }
        };
        fetchTypes();
    }, [serviceId]);

    const [popupBlocked, setPopupBlocked] = useState(false);

    const handleGenerate = async (action: 'send' | 'book') => {
        if (!selectedType) return;
        try {
            setGenerating(action);
            setPopupBlocked(false);
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
                const fullLink = `${origin}${data.data.link}`;
                setGeneratedLink(fullLink);
                
                if (action === 'book') {
                    const win = window.open(fullLink, '_blank');
                    if (win) {
                        toast.success(t('toasts.generated'));
                        setIsOpen(false);
                    } else {
                        setPopupBlocked(true);
                        toast.warning(t('toasts.popupBlocked'), {
                            description: t('toasts.clickToOpen'),
                        });
                    }
                } else {
                    toast.success(t('toasts.generated'));
                }
            } else {
                toast.error(t('toasts.generateError'), { description: data.error });
            }
        } catch (error) {
            toast.error(t('toasts.unexpectedError'));
        } finally {
            setGenerating(null);
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
        setSelectedType(repeatTypes.length === 1 ? repeatTypes[0].id : null);
        setCopied(false);
        setPopupBlocked(false);
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
                        {/* {t('description')} */}
                    </DialogDescription>
                </DialogHeader>

                {!generatedLink ? (
                    <div className="space-y-6 py-4">
                        {repeatTypes.length > 1 && (
                            <div className="space-y-4">
                                <Label className="text-sm font-semibold">{t('selectDuration')}</Label>
                                <div className="grid gap-3">
                                    {repeatTypes.map((type) => (
                                        <div
                                            key={type.id}
                                            className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ring-offset-background ${selectedType === type.id
                                                ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2'
                                                : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                                                }`}
                                            onClick={() => setSelectedType(type.id)}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <div className="font-bold text-base">{type.label}</div>
                                                <div className="text-sm text-muted-foreground font-medium">{type.duration_minutes} min</div>
                                            </div>
                                            <div className="font-bold text-primary">
                                                {type.price_eur_cents === 0 ? t('free') : `€${(type.price_eur_cents / 100).toFixed(2)}`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedType && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {repeatTypes.length > 1 && <div className="h-px bg-border my-2" />}
                                <Label className="text-sm font-semibold block">{t('selectAction')}</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        className="h-24 flex flex-col gap-2 rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-all group"
                                        disabled={generating !== null}
                                        onClick={() => handleGenerate('send')}
                                    >
                                        {generating === 'send' ? (
                                            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                                        ) : (
                                            <Copy className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                        )}
                                        <span className="font-bold text-xs uppercase tracking-wider">{t('sendToClient')}</span>
                                    </Button>
                                    <Button
                                        variant="default"
                                        className="h-24 flex flex-col gap-2 rounded-xl border-2 border-transparent transition-all shadow-md hover:shadow-lg"
                                        disabled={generating !== null}
                                        onClick={() => handleGenerate('book')}
                                    >
                                        <RefreshCw className={`h-6 w-6 ${generating === 'book' ? 'animate-spin' : ''}`} />
                                        <span className="font-bold text-xs uppercase tracking-wider">{t('bookForClient')}</span>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        {popupBlocked ? (
                            <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-4 animate-in zoom-in-95 duration-200">
                                <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                                    <RefreshCw className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <div className="font-bold text-amber-900 text-lg">
                                        {t('toasts.popupBlocked')}
                                    </div>
                                    <p className="text-sm text-amber-700/80 font-medium">
                                        {t('toasts.clickToOpen')}
                                    </p>
                                </div>
                                <Button 
                                    className="w-full h-12 font-bold text-base rounded-full shadow-lg hover:shadow-xl transition-all"
                                    onClick={() => {
                                        window.open(generatedLink, '_blank');
                                        setIsOpen(false);
                                    }}
                                >
                                    {t('bookForClient')}
                                </Button>
                            </div>
                        ) : (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                                <div className="font-bold text-emerald-700 flex items-center justify-center gap-2">
                                    <Check className="h-5 w-5" />
                                    {t('linkReady')}
                                </div>
                                <p className="text-sm text-emerald-600/80 font-medium">
                                    {t('linkExpiry')}
                                </p>
                            </div>
                        )}

                        <div className="flex items-center space-x-2 mt-4">
                            <Input
                                readOnly
                                value={generatedLink}
                                className="font-mono text-xs h-11 bg-muted/30 border-dashed"
                            />
                            <Button size="icon" variant="outline" className="h-11 w-11 shrink-0" onClick={handleCopy}>
                                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t">
                            <Button variant="ghost" onClick={handleReset} className="text-muted-foreground hover:text-foreground">
                                {t('generateAnother')}
                            </Button>
                            <Button onClick={() => setIsOpen(false)} className="px-8 rounded-full font-bold">
                                {t('done')}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
