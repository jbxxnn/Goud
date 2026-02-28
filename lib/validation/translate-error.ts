/**
 * Translates a key-based validation error from the Zod schema.
 * @param errorStr The error message string, potentially starting with 'v:'.
 * @param t The translation function for the 'Booking.flow' namespace.
 * @returns The translated error message.
 */
export const translateValidationError = (errorStr: string | undefined, t: (key: string, props?: any) => string): string => {
    if (!errorStr) return '';
    if (!errorStr.startsWith('v:')) return errorStr;

    const parts = errorStr.split(':');
    const key = parts[1]; // e.g., 'required', 'maxLength', 'invalid'
    
    // Handle specific keys with parameters
    if (key === 'required' || key === 'invalid') {
        const fieldKey = parts[2];
        return t(`validation.${key}`, { 
            label: t(`form.${fieldKey}`) 
        });
    }

    if (key === 'maxLength') {
        const fieldKey = parts[2];
        const max = parts[3];
        return t(`validation.maxLength`, { 
            label: t(`form.${fieldKey}`),
            max 
        });
    }

    // Generic lookup for simple keys like 'invalidEmail', 'invalidPhone', 'invalidId'
    return t(`validation.${key}`);
};
