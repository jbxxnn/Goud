'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatEuroCents } from '@/lib/currency/format';
import { useBooking } from './booking-context';
import { PolicyField } from '@/lib/types/booking';
import { ArrowRight01Icon, CircleArrowRight02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

export function StepService() {
    const {
        services,
        loadingServices,
        serviceId,
        setServiceId,
        selectedService,
        policyResponses,
        policyErrors,
        updatePolicyResponse,
        toggleMultiChoiceOption,
        clearPolicyError,
        setPolicyErrors,
        setStep,
        grandTotalCents,
        isTwin,
        setIsTwin
    } = useBooking();

    const t = useTranslations('Booking.flow');


    const validatePolicyFields = (): Record<string, string> => {
        if (!selectedService) return {};
        const errors: Record<string, string> = {};
        for (const field of selectedService.policyFields) {
            if (!field.is_required) continue;
            const value = policyResponses[field.id];
            switch (field.field_type) {
                case 'checkbox':
                    if (value !== true) errors[field.id] = t('errors.policy.confirmCheckBox');
                    break;
                case 'multi_choice':
                    if (!Array.isArray(value) || value.length === 0) errors[field.id] = t('errors.policy.makeChoice');
                    break;
                case 'number_input':
                    if (typeof value !== 'number' || Number.isNaN(value)) errors[field.id] = t('errors.policy.validNumber');
                    break;
                case 'date_time':
                    if (typeof value !== 'string' || value.trim() === '') errors[field.id] = t('errors.policy.selectDateTime');
                    break;
                case 'file_upload':
                    errors[field.id] = t('errors.policy.uploadUnavailable');
                    break;
                case 'text_input':
                default:
                    if (typeof value !== 'string' || value.trim() === '') errors[field.id] = t('errors.policy.required');
                    break;
            }
        }
        return errors;
    };

    const handleContinue = () => {
        if (!serviceId) return;
        if (selectedService) {
            const errors = validatePolicyFields();
            if (Object.keys(errors).length > 0) {
                setPolicyErrors(errors);
                return;
            }
        }
        setPolicyErrors({});
        setStep(2);
    };

    const renderPolicyField = (field: PolicyField) => {
        const error = policyErrors[field.id];
        const description = field.description ? (
            <p className="text-sm text-gray-500">{field.description}</p>
        ) : null;

        switch (field.field_type) {
            case 'checkbox': {
                const checked = policyResponses[field.id] === true;
                return (
                    <div key={field.id} className="space-y-2">
                        <label className="flex items-start gap-2 cursor-pointer">
                            <Checkbox
                                className="mt-1 rounded-full border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-primary"
                                checked={checked}
                                onCheckedChange={(checked) => updatePolicyResponse(field.id, checked === true)}
                            />
                            <span>
                                <span className="text-xs font-bold">
                                    {field.title}
                                    {field.is_required && <span className="text-red-600 ml-1">*</span>}
                                </span>
                                {description}
                            </span>
                        </label>
                        {error && <p className="text-xs text-red-600">{error}</p>}
                    </div>
                );
            }
            case 'multi_choice': {
                const selected = Array.isArray(policyResponses[field.id]) ? (policyResponses[field.id] as string[]) : [];
                return (
                    <div key={field.id} className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">
                                {field.title}
                                {field.is_required && <span className="text-red-600 ml-1">*</span>}
                            </span>
                        </div>
                        {description}
                        <div className="space-y-2">
                            {field.choices.length === 0 && <p className="text-sm text-gray-500">{t('noOptions')}</p>}
                            {field.choices.map((choice) => {
                                const price = typeof choice.price === 'number' && !Number.isNaN(choice.price) ? choice.price : 0;
                                return (
                                    <label key={choice.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                        <Checkbox
                                            className="rounded-full border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-secondary focus-visible:ring-primary"
                                            checked={selected.includes(choice.id)}
                                            onCheckedChange={() => toggleMultiChoiceOption(field.id, choice.id)}
                                        />
                                        <span className="flex-1 text-xs font-bold">{choice.title}</span>
                                        {price > 0 && <span className="text-xs text-gray-600">{formatEuroCents(Math.round(price * 100))}</span>}
                                    </label>
                                );
                            })}
                        </div>
                        {error && <p className="text-xs text-red-600">{error}</p>}
                    </div>
                );
            }
            case 'number_input': {
                const value = typeof policyResponses[field.id] === 'number' && !Number.isNaN(policyResponses[field.id])
                    ? (policyResponses[field.id] as number)
                    : '';
                return (
                    <div key={field.id} className="space-y-2">
                        <label className="block text-xs font-bold">
                            {field.title}
                            {field.is_required && <span className="text-red-600 ml-1">*</span>}
                        </label>
                        {description}
                        <input
                            type="number"
                            className="border rounded px-3 py-2 w-full"
                            value={value}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') { updatePolicyResponse(field.id, null); return; }
                                const parsed = Number(raw);
                                updatePolicyResponse(field.id, Number.isNaN(parsed) ? null : parsed);
                            }}
                        />
                        {error && <p className="text-xs text-red-600">{error}</p>}
                    </div>
                );
            }
            case 'date_time': {
                const rawValue = typeof policyResponses[field.id] === 'string' ? (policyResponses[field.id] as string) : '';
                let value = '';
                if (rawValue) {
                    // Basic ISO to datetime-local handling logic
                    try {
                        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawValue)) {
                            value = rawValue;
                        } else {
                            const date = new Date(rawValue);
                            if (!isNaN(date.getTime())) {
                                const mm = String(date.getMonth() + 1).padStart(2, '0');
                                const dd = String(date.getDate()).padStart(2, '0');
                                const hh = String(date.getHours()).padStart(2, '0');
                                const min = String(date.getMinutes()).padStart(2, '0');
                                value = `${date.getFullYear()}-${mm}-${dd}T${hh}:${min}`;
                            }
                        }
                    } catch { value = ''; }
                }
                return (
                    <div key={field.id} className="space-y-2">
                        <label className="block text-xs font-bold">
                            {field.title}
                            {field.is_required && <span className="text-red-600 ml-1">*</span>}
                        </label>
                        {description}
                        <input
                            type="datetime-local"
                            className="border rounded px-3 py-2 w-full"
                            value={value}
                            onChange={(e) => updatePolicyResponse(field.id, e.target.value)}
                        />
                        {error && <p className="text-xs text-red-600">{error}</p>}
                    </div>
                );
            }
            case 'file_upload': {
                return (
                    <div key={field.id} className="space-y-2">
                        <label className="block text-xs font-bold">
                            {field.title}
                            {field.is_required && <span className="text-red-600 ml-1">*</span>}
                        </label>
                        {description}
                        <p className="text-sm text-amber-600">{t('uploadSoon')}</p>
                        {error && <p className="text-xs text-red-600">{error}</p>}
                    </div>
                );
            }
            case 'text_input':
            default: {
                const value = typeof policyResponses[field.id] === 'string' ? (policyResponses[field.id] as string) : '';
                return (
                    <div key={field.id} className="space-y-2">
                        <label className="block text-xs font-bold">
                            {field.title}
                            {field.is_required && <span className="text-red-600 ml-1">*</span>}
                        </label>
                        {description}
                        <input
                            className="border rounded px-3 py-2 w-full"
                            value={value}
                            onChange={(e) => updatePolicyResponse(field.id, e.target.value)}
                        />
                        {error && <p className="text-xs text-red-600">{error}</p>}
                    </div>
                );
            }
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-poppins font-bold text-gray-900">{t('selectService')}</h2>
                <p className="text-sm text-gray-600">{t('selectServiceSubtitle')}</p>
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                    {/* <Label htmlFor="service-select" className="text-sm font-bold text-gray-700">Services</Label> */}
                    <Select value={serviceId} onValueChange={setServiceId}>
                        <SelectTrigger
                            id="service-select"
                            className={`w-full transition-all duration-300 ${!serviceId && !loadingServices ? "ring-2 ring-primary ring-offset-2 animate-ring-pulse" : ""}`}
                        >
                            {loadingServices ? (
                                <div>
                                    <div className="flex items-center gap-2 opacity-25">
                                        <div className="h-2 w-16 bg-gray-300 rounded-full animate-pulse" />
                                        <div className="h-2 w-10 bg-gray-300 rounded-full animate-pulse delay-75" />
                                    </div>
                                </div>
                            ) : (
                                <SelectValue placeholder={t('servicePlaceholder')}>
                                    {serviceId ? services.find(s => s.id === serviceId)?.name : t('servicePlaceholder')}
                                </SelectValue>
                            )}
                        </SelectTrigger>
                        <SelectContent>
                            {services.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                    <div className="flex items-center justify-between py-2">
                                        <span className='text-primary'>{s.name}</span>
                                        {(s.price ?? 0) > 0 && (
                                            <span className="ml-4 text-xs font-bold text-gray-700">{formatEuroCents(s.price ?? 0)}</span>
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {selectedService?.allowsTwins && (
                <div className="space-y-4 p-4 bg-white animate-in fade-in slide-in-from-top-4 duration-500 ease-in-out" style={{ borderRadius: '0.2rem' }}>
                    <div className="flex items-start gap-3">
                        <Checkbox
                            id="twin-pregnancy"
                            checked={isTwin}
                            onCheckedChange={(checked) => setIsTwin(checked === true)}
                            className="mt-1 rounded-full border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-primary"
                        />
                        <div className="space-y-1">
                            <Label htmlFor="twin-pregnancy" className="text-sm font-bold text-gray-900 cursor-pointer">
                                {t('isTwinPregnancy')}
                            </Label>
                            {/* <p className="text-xs text-gray-500">
                                {t('twinPregnancyDescription')} (+100% price/duration)
                            </p> */}
                        </div>
                    </div>
                </div>
            )}
            {selectedService?.policyFields.length ? (
                <div className="space-y-4 p-4 bg-white animate-in fade-in slide-in-from-top-4 duration-500 ease-in-out" style={{ borderRadius: '0.2rem' }}>
                    <h3 className="text-sm font-bold tracking-wide text-gray-600">{t('servicePolicy')}</h3>
                    <div className="space-y-4">
                        {selectedService.policyFields.map((field) => renderPolicyField(field))}
                    </div>
                </div>
            ) : null}
            {selectedService && (
                <div className="flex items-center justify-between px-4 py-3 bg-white animate-in fade-in slide-in-from-top-4 duration-500 ease-in-out" style={{ borderRadius: '0.2rem' }}>
                    <span className="text-sm font-bold text-gray-700">{t('currentTotal')}</span>
                    <span className="text-sm font-bold text-gray-900">{formatEuroCents(grandTotalCents)}</span>
                </div>
            )}
            <div className="flex justify-end ">
                <Button
                    onClick={handleContinue}
                    disabled={!serviceId}
                    className="h-auto px-8 bg-primary shadow-lg hover:bg-secondary-foreground text-white font-medium hover:shadow-lg transition-all duration-300 ease-in-out" style={{ borderRadius: '1rem' }}
                >
                    {t('continue')}
                    <HugeiconsIcon icon={ArrowRight01Icon} />
                </Button>
            </div>
        </div>
    );
}
