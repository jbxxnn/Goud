import { Addon, PolicyField, PolicyResponses, ServiceAddon, BookingPolicyAnswer, BookingAddonSelection, AddonSelections, RawPolicyField, ServicePolicyFieldChoice, ServicePolicyField, PolicyAnswerValue } from '@/lib/types/booking';

export function normalizePolicyFields(rawFields: RawPolicyField[] | null | undefined): PolicyField[] {
    if (!Array.isArray(rawFields)) return [];
    return rawFields
        .map((field, index) => {
            const order =
                typeof field.order === 'number'
                    ? field.order
                    : typeof field.field_order === 'number'
                        ? field.field_order
                        : index;
            const rawChoices = field.choices ?? field.service_policy_field_choices ?? [];
            const choices = rawChoices
                .map((choice, choiceIndex) => ({
                    id: choice.id ?? `${field.id ?? 'choice'}-${choiceIndex}`,
                    field_id: choice.field_id ?? field.id ?? '',
                    title: choice.title ?? '',
                    price: typeof choice.price === 'number' ? choice.price : Number(choice.price) || 0,
                    order:
                        typeof choice.order === 'number'
                            ? choice.order
                            : choiceIndex,
                }))
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            return {
                ...field,
                order,
                choices,
            } as PolicyField;
        })
        .sort((a, b) => a.order - b.order);
}

export function normalizeAddons(rawAddons: ServiceAddon[] | null | undefined): Addon[] {
    if (!Array.isArray(rawAddons)) return [];
    return rawAddons
        .filter((addon): addon is ServiceAddon => Boolean(addon && addon.id && addon.is_active !== false))
        .map((addon) => ({
            id: addon.id,
            name: addon.name ?? '',
            description: addon.description ?? null,
            priceCents: Math.round(((addon.price ?? 0) as number) * 100),
            isRequired: Boolean(addon.is_required),
            options: addon.options?.filter(o => o.is_active).map(o => ({
                id: o.id,
                addonId: o.addon_id,
                name: o.name,
                priceCents: Math.round(o.price * 100)
            }))
        }));
}

export function calculatePolicyFieldPriceCents(field: PolicyField, value: PolicyAnswerValue): number {
    if (field.field_type === 'multi_choice' && Array.isArray(value)) {
        return value.reduce((total, choiceId) => {
            const choice = field.choices.find((c) => c.id === choiceId);
            if (!choice) return total;
            const price = typeof choice.price === 'number' ? choice.price : Number(choice.price);
            if (Number.isFinite(price) && price > 0) {
                return total + Math.round(price * 100);
            }
            return total;
        }, 0);
    }
    return 0;
}

export function calculatePolicyExtraPriceCents(fields: PolicyField[], responses: PolicyResponses): number {
    return fields.reduce((sum, field) => {
        const value = responses[field.id];
        const price = calculatePolicyFieldPriceCents(field, value);
        return sum + price;
    }, 0);
}

export function calculateAddonExtraPriceCents(addons: Addon[], selections: AddonSelections): number {
    return addons.reduce((sum, addon) => {
        const selection = selections[addon.id];
        if (addon.isRequired || selection) {
            // If it's a string, it's an option ID
            if (typeof selection === 'string') {
                const option = addon.options?.find(o => o.id === selection);
                if (option) return sum + option.priceCents;
            }
            // Fallback to base price if no option selected or it's a simple boolean
            return sum + addon.priceCents;
        }
        return sum;
    }, 0);
}

export function buildPolicyAnswerPayload(fields: PolicyField[], responses: PolicyResponses): BookingPolicyAnswer[] {
    const answers: BookingPolicyAnswer[] = [];
    for (const field of fields) {
        const value = responses[field.id];
        if (value === undefined || value === null) {
            continue;
        }
        if (typeof value === 'string' && value.trim() === '') {
            continue;
        }
        if (Array.isArray(value) && value.length === 0) {
            continue;
        }
        const priceCents = calculatePolicyFieldPriceCents(field, value);
        answers.push({
            fieldId: field.id,
            fieldType: field.field_type,
            value,
            priceEurCents: priceCents > 0 ? priceCents : undefined,
        });
    }
    return answers;
}

export function buildAddonPayload(addons: Addon[], selections: AddonSelections): BookingAddonSelection[] {
    return addons
        .filter((addon) => addon.isRequired || selections[addon.id])
        .map((addon) => {
            const selection = selections[addon.id];
            let priceCents = addon.priceCents;
            let optionId: string | undefined = undefined;

            if (typeof selection === 'string') {
                const option = addon.options?.find(o => o.id === selection);
                if (option) {
                    priceCents = option.priceCents;
                    optionId = option.id;
                }
            }

            return {
                addonId: addon.id,
                quantity: 1,
                priceEurCents: priceCents,
                optionId
            };
        });
}
