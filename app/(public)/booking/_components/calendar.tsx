import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

interface CalendarProps {
    month: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    selectedDate: string;
    onSelectDate: (yyyyMmDd: string) => void;
    heatmap: Record<string, number>;
    loading?: boolean;
}

function toISODate(d: Date): string {
    const y = d.getFullYear();
    const m2 = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m2}-${dd}`;
}

export function Calendar({
    month,
    onPrevMonth,
    onNextMonth,
    selectedDate,
    onSelectDate,
    heatmap,
    loading = false,
}: CalendarProps) {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    const startWeekday = firstDay.getDay(); // 0=Sun
    const daysInMonth = lastDay.getDate();

    const cells: { dateStr: string; isOtherMonth: boolean }[] = [];
    // leading days from previous month
    for (let i = 0; i < startWeekday; i++) {
        const dateObj = new Date(year, m, 1 - (startWeekday - i));
        const dateStr = toISODate(dateObj);
        cells.push({ dateStr, isOtherMonth: true });
    }
    // current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, m, d);
        const dateStr = toISODate(dateObj);
        cells.push({ dateStr, isOtherMonth: false });
    }
    // trailing days to complete last week
    while (cells.length % 7 !== 0) {
        const last = cells[cells.length - 1];
        const [lastYear, lastMonth, lastDay] = last.dateStr.split('-').map(Number);
        const nextDate = new Date(lastYear, lastMonth - 1, lastDay + 1);
        cells.push({ dateStr: toISODate(nextDate), isOtherMonth: true });
    }

    const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    return (
        <div className="">
            <div className="flex justify-between items-center mb-3 p-4 bg-secondary" style={{ borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}>
                <button className="p-1 border rounded-full bg-accent hover:border-primary disabled:opacity-50" onClick={onPrevMonth} disabled={loading}><HugeiconsIcon icon={ArrowLeft01Icon} size={16} /></button>
                <div className="text-sm text-secondary-foreground font-bold">{monthLabel}</div>
                <button className="p-1 border rounded-full bg-accent hover:border-primary disabled:opacity-50" onClick={onNextMonth} disabled={loading}><HugeiconsIcon icon={ArrowRight01Icon} size={16} /></button>
            </div>
            <div className="bg-white p-2">
                <div className="grid grid-cols-7 gap-2 text-md mb-3">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                        <div key={d} className="text-center text-secondary-foreground font-normal">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {loading ? (
                        Array.from({ length: 35 }).map((_, idx) => (
                            <div key={idx} className="aspect-square flex flex-col items-center justify-center animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-gray-100" />
                            </div>
                        ))
                    ) : (
                        cells.map((cell, idx) => {
                            const count = heatmap[cell.dateStr] ?? 0;
                            const isSelected = selectedDate === cell.dateStr;
                            const enabled = count > 0;
                            return (
                                <button
                                    key={idx}
                                    className={
                                        `aspect-square text-xs font-bold flex flex-col items-center justify-center ${isSelected
                                            ? 'bg-primary text-white rounded-full'
                                            : enabled
                                                ? (cell.isOtherMonth ? 'text-gray-400 hover:bg-accent hover:rounded-full text-primary font-bold' : 'hover:bg-accent hover:rounded-full text-primary font-bold')
                                                : 'opacity-20 cursor-not-allowed'
                                        }`
                                    }
                                    disabled={!enabled}
                                    onClick={() => enabled && onSelectDate(cell.dateStr!)}
                                >
                                    <div className="text-md">{parseInt(cell.dateStr.split('-')[2], 10)}</div>
                                    {/* {enabled && count > 0 && (
                                        <div className="w-1 h-1 rounded-full bg-current mt-0.5" />
                                    )} */}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
