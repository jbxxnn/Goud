import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .email('v:invalidEmail');

const requiredName = (label: string) =>
  z
    .string({ message: `v:required:${label}` })
    .trim()
    .min(1, `v:required:${label}`)
    .max(100, `v:maxLength:${label}:100`);

const optionalText = (label: string, max = 255) =>
  z
    .string()
    .trim()
    .max(max, `v:maxLength:${label}:${max}`)
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value));

const requiredText = (label: string, max = 255) =>
  z
    .string({ message: `v:required:${label}` })
    .trim()
    .min(1, `v:required:${label}`)
    .max(max, `v:maxLength:${label}:${max}`);

const requiredPhone = z
  .string({ message: 'v:required:phone' })
  .trim()
  .min(1, 'v:required:phone')
  .max(32, 'v:maxLength:phone:32')
  .regex(/^[\d\s+().-]*$/, 'v:invalidPhone');

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
    { message: 'v:invalid:date' }
  );

const requiredDate = (label: string) =>
  z
    .string({ message: `v:required:${label}` })
    .trim()
    .min(1, `v:required:${label}`)
    .refine(
      (value) => {
        const date = new Date(value);
        return !isNaN(date.getTime());
      },
      { message: `v:invalid:${label}` }
    );

const optionalUuid = z
  .string()
  .uuid('v:invalidId')
  .or(z.literal(''))
  .transform((value) => (value === '' ? undefined : value))
  .optional();

const requiredMidwifeId = z
  .string({ message: 'v:required:midwife' })
  .trim()
  .min(1, 'v:required:midwife')
  .refine((val) => val === 'other' || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val), {
    message: 'v:invalidId',
  });

export const bookingContactSchema = z.object({
  clientEmail: emailSchema,
  firstName: requiredName('firstName'),
  lastName: requiredName('lastName'),
  phone: requiredPhone,
  address: optionalText('address').optional(),
  // New fields
  dueDate: requiredDate('dueDate'),
  birthDate: requiredDate('birthDate'),
  midwifeId: requiredMidwifeId,
  otherMidwifeName: optionalText('otherMidwifeName', 100).optional(),
  houseNumber: requiredText('houseNumber', 20),
  postalCode: requiredText('postalCode', 20),
  streetName: requiredText('streetName', 255),
  city: requiredText('city', 100),
  notes: optionalText('notes', 500).optional(),
  gravida: optionalText('gravida', 10).optional(),
  para: optionalText('para', 10).optional(),
  midwifeClientEmail: emailSchema.optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.midwifeId === 'other' && !data.otherMidwifeName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'v:required:otherMidwifeName',
      path: ['otherMidwifeName'],
    });
  }

  // If a midwife is booking for a client, gravida and para are required
  if (data.midwifeClientEmail && data.midwifeClientEmail.trim() !== '') {
    if (!data.gravida || data.gravida.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'v:required:gravida',
        path: ['gravida'],
      });
    }
    if (!data.para || data.para.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'v:required:para',
        path: ['para'],
      });
    }
  }
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
  fieldId: z.string().uuid('v:invalidId'),
  fieldTitle: z.string().optional(),
  fieldType: z.enum(['multi_choice', 'text_input', 'number_input', 'date_time', 'checkbox', 'file_upload']).optional(),
  value: policyAnswerValueSchema,
  valueTitle: z.string().optional(),
  priceEurCents: z
    .number()
    .int('v:invalid:price')
    .nonnegative('v:invalid:price')
    .optional(),
});

export type BookingPolicyAnswer = z.infer<typeof bookingPolicyAnswerSchema>;

export const bookingAddonSelectionSchema = z.object({
  addonId: z.string().uuid('v:invalidId'),
  quantity: z
    .number()
    .int('v:invalid:quantity')
    .min(1, 'v:invalid:quantity'),
  priceEurCents: z
    .number()
    .int('v:invalid:price')
    .nonnegative('v:invalid:price'),
  optionId: z.string().uuid('v:invalidId').optional(),
});

export type BookingAddonSelection = z.infer<typeof bookingAddonSelectionSchema>;

export const bookingSelectionSchema = z.object({
  clientId: z.string().trim().uuid().optional(),
  serviceId: z.string().trim().min(1, 'v:required:service'),
  locationId: z.string().trim().min(1, 'v:required:location'),
  staffId: z.string().trim().min(1, 'v:required:staff'),
  shiftId: z.string().trim().min(1, 'v:required:shift'),
  startTime: z
    .string()
    .trim()
    .datetime({ offset: true, message: 'v:invalid:startTime' }),
  endTime: z
    .string()
    .trim()
    .datetime({ offset: true, message: 'v:invalid:endTime' }),
  priceEurCents: z
    .number()
    .int('v:invalid:price')
    .nonnegative('v:invalid:price'),
  notes: optionalText('notes', 500).optional(),
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


