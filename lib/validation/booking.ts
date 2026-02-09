import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .email('Voer een geldig e-mailadres in');

const requiredName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is verplicht`)
    .max(100, `${label} mag maximaal 100 tekens bevatten`);

const optionalText = (label: string, max = 255) =>
  z
    .string()
    .trim()
    .max(max, `${label} mag maximaal ${max} tekens bevatten`)
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value));

const optionalPhone = z
  .string()
  .trim()
  .max(32, 'Telefoonnummer mag maximaal 32 tekens bevatten')
  .regex(/^[\d\s+().-]*$/, 'Telefoonnummer bevat ongeldige tekens')
  .or(z.literal(''))
  .transform((value) => (value === '' ? undefined : value));

const optionalDate = z
  .string()
  .trim()
  .or(z.literal(''))
  .transform((value) => (value === '' ? undefined : value))
  .optional()
  .refine(
    (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
    { message: 'Ongeldige datum' }
  );

const optionalUuid = z
  .string()
  .uuid('Ongeldig ID')
  .or(z.literal(''))
  .transform((value) => (value === '' ? undefined : value))
  .optional();

export const bookingContactSchema = z.object({
  clientEmail: emailSchema,
  firstName: requiredName('Voornaam'),
  lastName: requiredName('Achternaam'),
  phone: optionalPhone.optional(),
  address: optionalText('Adres').optional(),
  // New fields
  dueDate: optionalDate,
  birthDate: optionalDate,
  midwifeId: optionalUuid,
  houseNumber: optionalText('Huisnummer', 20).optional(),
  postalCode: optionalText('Postcode', 20).optional(),
  streetName: optionalText('Straatnaam', 255).optional(),
  city: optionalText('Woonplaats', 100).optional(),
  notes: optionalText('Notities', 500).optional(),
  midwifeClientEmail: emailSchema.optional().or(z.literal('')),
});

export type BookingContactInput = z.infer<typeof bookingContactSchema>;

const policyAnswerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

export const bookingPolicyAnswerSchema = z.object({
  fieldId: z.string().uuid('Ongeldig veld-ID'),
  fieldType: z.enum(['multi_choice', 'text_input', 'number_input', 'date_time', 'checkbox', 'file_upload']).optional(),
  value: policyAnswerValueSchema,
  priceEurCents: z
    .number()
    .int('Prijs moet een geheel getal zijn')
    .nonnegative('Prijs kan niet negatief zijn')
    .optional(),
});

export type BookingPolicyAnswer = z.infer<typeof bookingPolicyAnswerSchema>;

export const bookingAddonSelectionSchema = z.object({
  addonId: z.string().uuid('Ongeldig add-on ID'),
  quantity: z
    .number()
    .int('Aantal moet een geheel getal zijn')
    .min(1, 'Aantal moet minimaal 1 zijn'),
  priceEurCents: z
    .number()
    .int('Prijs moet een geheel getal zijn')
    .nonnegative('Prijs kan niet negatief zijn'),
  optionId: z.string().uuid('Ongeldig optie-ID').optional(),
});

export type BookingAddonSelection = z.infer<typeof bookingAddonSelectionSchema>;

export const bookingSelectionSchema = z.object({
  clientId: z.string().trim().uuid().optional(),
  serviceId: z.string().trim().min(1, 'Service is verplicht'),
  locationId: z.string().trim().min(1, 'Locatie is verplicht'),
  staffId: z.string().trim().min(1, 'Medewerker is verplicht'),
  shiftId: z.string().trim().min(1, 'Dienst is verplicht'),
  startTime: z
    .string()
    .trim()
    .datetime({ offset: true, message: 'Starttijd heeft ongeldig formaat' }),
  endTime: z
    .string()
    .trim()
    .datetime({ offset: true, message: 'Eindtijd heeft ongeldig formaat' }),
  priceEurCents: z
    .number()
    .int('Prijs moet een geheel getal in centen zijn')
    .nonnegative('Prijs kan niet negatief zijn'),
  notes: optionalText('Notities', 500).optional(),
  isTwin: z.boolean().optional(),
  continuationToken: z.string().optional(),
});

export type BookingSelectionInput = z.infer<typeof bookingSelectionSchema>;

export const bookingRequestSchema = bookingSelectionSchema.merge(bookingContactSchema).extend({
  policyAnswers: z.array(bookingPolicyAnswerSchema).optional(),
  addons: z.array(bookingAddonSelectionSchema).optional(),
  sessionToken: z.string().optional(),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;


