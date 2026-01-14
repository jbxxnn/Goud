'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { useBooking } from './booking-context';
import { Calendar } from './calendar';
import { TimePicker } from './time-picker';
import { ArrowLeft01Icon, ArrowRight01Icon, CircleArrowLeft02Icon, CircleArrowRight02Icon, MapingIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

export function StepDateTime() {
    const {
        locations, loadingLocations, locationId, setLocationId,
        monthCursor, setPrevMonth, setNextMonth,
        date, setDate, heatmap, loadingHeatmap,
        slots, loadingSlots, selectedSlot, setSelectedSlot,
        setStep, hasAddons
    } = useBooking();

    const t = useTranslations('Booking.flow');


    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900">{t('datetime.title')}</h2>
                <p className="text-sm text-gray-600">{t('datetime.subtitle')}</p>
            </div>

            <div className="space-y-2">
                {/* <Label htmlFor="location-select-step2" className="text-sm font-bold text-gray-700">Location</Label> */}
                <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger id="location-select-step2" className="w-full">
                        {loadingLocations ? (
                            <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
                        ) : (
                            <SelectValue placeholder={t('datetime.locationPlaceholder')} className="text-lg">
                                {locationId ? locations.find(l => l.id === locationId)?.name : t('datetime.locationPlaceholder')}
                            </SelectValue>
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        {locations.map(l => (
                            <SelectItem key={l.id} value={l.id}>
                                <div className="flex items-center gap-2">
                                    <span className="text-primary">{l.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="relative p-0 mx-9 shadow-lg" style={{ borderRadius: '0.3rem' }}>
                <Calendar
                    month={monthCursor}
                    onPrevMonth={setPrevMonth}
                    onNextMonth={setNextMonth}
                    selectedDate={date}
                    onSelectDate={setDate}
                    heatmap={heatmap}
                    loading={loadingHeatmap}
                />
            </div>

            <TimePicker
                loading={loadingSlots}
                slots={slots}
                selected={selectedSlot}
                onSelect={setSelectedSlot}
            />

            <div className="flex justify-between pt-2">
                <Button onClick={() => setStep(1)} className="h-auto px-8 bg-primary shadow-lg hover:bg-secondary-foreground text-white font-medium hover:shadow-lg transition-all duration-300 ease-in-out" style={{ borderRadius: '1rem' }}>
                    <HugeiconsIcon icon={ArrowLeft01Icon} />
                    {t('back')}
                </Button>
                <Button
                    onClick={() => setStep(hasAddons ? 3 : 4)}
                    disabled={!selectedSlot}
                    className="h-auto px-8 bg-primary shadow-lg hover:bg-secondary-foreground text-white font-medium hover:shadow-lg transition-all duration-300 ease-in-out" style={{ borderRadius: '1rem' }}
                >
                    {t('continue')}
                    <HugeiconsIcon icon={ArrowRight01Icon} />
                </Button>
            </div>
        </div>
    );
}
