import { HugeiconsIcon } from '@hugeicons/react';
import { useFormatter, useTranslations } from 'next-intl';
import { Loading03Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Slot } from '@/lib/types/booking';

interface TimePickerProps {
    loading: boolean;
    slots: Slot[];
    selected: Slot | null;
    onSelect: (s: Slot) => void;
}

function groupSlots(slots: Slot[]): { morning: Slot[]; afternoon: Slot[]; evening: Slot[] } {
    const res = { morning: [] as Slot[], afternoon: [] as Slot[], evening: [] as Slot[] };
    const tzFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Europe/Amsterdam' });
    
    for (const s of slots) {
        const hStr = tzFormatter.format(new Date(s.startTime));
        const h = parseInt(hStr, 10);
        
        if (h < 12) res.morning.push(s);
        else if (h < 17) res.afternoon.push(s);
        else res.evening.push(s);
    }
    return res;
}

export function TimePicker({
    loading,
    slots,
    selected,
    onSelect,
}: TimePickerProps) {
    const groups = groupSlots(slots);
    const t = useTranslations('Booking.flow.time');
    const format = useFormatter();

    return (
        <div>
            <label className="block text-sm font-bold">{t('available')}</label>
            {loading ? (
                <div className="space-y-4 pt-2">
                    {[1, 2].map((i) => (
                        <div key={i} className="animate-pulse space-y-2">
                            <div className="h-3 w-16 bg-gray-200 rounded" />
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {[1, 2, 3, 4].map((j) => (
                                    <div key={j} className="h-10 bg-gray-100 rounded-md" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : slots.length === 0 ? (
                <div className="text-xs text-gray-500">{t('noSlots')}</div>
            ) : (
                <div className="space-y-4">
                    {(['morning', 'afternoon', 'evening'] as const).map((k) => (
                        groups[k].length > 0 && (
                            <div key={k}>
                                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{t(k)}</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {groups[k].map((s, idx) => (
                                        <Button
                                            key={`${s.shiftId}-${idx}`}
                                            variant={selected === s ? 'default' : 'outline'}
                                            className={selected === s ? 'bg-primary' : 'bg-white'}
                                            style={{ borderRadius: '1rem' }}
                                            onClick={() => onSelect(s)}
                                        >
                                            {format.dateTime(new Date(s.startTime), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}
        </div>
    );
}
