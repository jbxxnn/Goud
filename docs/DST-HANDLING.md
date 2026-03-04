# Daylight Saving Time (DST) & Timezone Handling Guide

This document explains the strategy for maintaining timezone consistency in the Goud project, specifically for the `Europe/Amsterdam` timezone, to prevent one-hour offsets during DST transitions (e.g., late March and late October).

## The Core Problem

Most modern browsers interpret a ISO-8601 string (like `2026-03-31T09:30:00`) as a **local date** if it doesn't have a timezone offset. If you use a native `new Date()` or `parseISO()` from `date-fns`, the browser might apply its own local DST rules, leading to discrepancies when the application's ground truth is `Europe/Amsterdam`.

### Problematic Code Patterns

Avoid these patterns for business-critical times (appointments, shifts, etc.):

```tsx
// ❌ INCORRECT: Uses browser-local interpretation
import { format } from "date-fns";
const display = format(new Date(booking.start_time), "HH:mm");

// ❌ INCORRECT: parseISO also uses local time for naive strings
import { format, parseISO } from "date-fns";
const display = format(parseISO(booking.start_time), "PPP");
```

## The Solution: `formatInTimeZone`

Always use `formatInTimeZone` from the `date-fns-tz` package to force the `Europe/Amsterdam` timezone.

### Correct Implementation Pattern

```tsx
import { formatInTimeZone } from "date-fns-tz";
import { nl, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";

const displayTime = formatInTimeZone(
  new Date(booking.start_time),
  "Europe/Amsterdam",
  "HH:mm",
);

const displayDate = formatInTimeZone(
  new Date(booking.start_time),
  "Europe/Amsterdam",
  "PPP",
  { locale: locale === "nl" ? nl : enUS },
);
```

### Why we use static locale imports

In ESM/Turbopack environments, dynamic `require('date-fns/locale/nl')` can cause runtime `TypeErrors` (e.g., `undefined is not an object`). Always statically import the locales you need:

```tsx
import { nl, enUS } from "date-fns/locale";
```

## How to Audit the Codebase

To find potentially problematic areas, search for:

1.  `format(new Date(`
2.  `format(parseISO(`
3.  `.toLocaleTimeString(`
4.  `.getHours()` or `.getUTCHours()` (if used for display)

## Creating Local Date Strings for Inputs

When you need an `html` `<input type="datetime-local" />`, use a helper that forces the Amsterdam time instead of relying on `.toISOString()` which returns UTC:

```tsx
const formatDateTimeLocal = (date: Date): string => {
  return formatInTimeZone(date, "Europe/Amsterdam", "yyyy-MM-dd'T'HH:mm");
};
```

## Summary Checklist for New Code

- [ ] Is the date/time being displayed to a user?
- [ ] Is it using `formatInTimeZone` with `'Europe/Amsterdam'`?
- [ ] Are the locales (`nl`, `enUS`) statically imported?
- [ ] Is `useLocale()` from `next-intl` being used to determine the language?
