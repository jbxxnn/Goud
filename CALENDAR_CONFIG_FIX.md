# Calendar Tailwind Configuration Fix

## Issue
The calendar was not rendering properly - showing only a vertical list of days instead of the proper grid layout with time slots.

## Root Cause
The Tailwind CSS configuration was missing:
1. **Custom spacing class** `w-18` (4.5rem) used for the time column
2. **Calendar color** `bg-calendar-disabled-hour` for non-working hours
3. **Content path** for the `calendar/` directory

Without these configurations, Tailwind was **not generating the necessary CSS classes**, causing the calendar components to render incorrectly.

## Solution

### Updated `tailwind.config.ts`

**Added**:
```typescript
content: [
  // ... existing paths
  "./calendar/**/*.{js,ts,jsx,tsx,mdx}",  // ← Added this
],
theme: {
  extend: {
    spacing: {
      '18': '4.5rem',  // ← Added this for w-18 class
    },
    colors: {
      'calendar-disabled-hour': 'hsl(var(--muted) / 0.3)',  // ← Added this
      // ... rest of colors
    },
  },
},
```

## What These Do

### 1. `spacing: { '18': '4.5rem' }`
- Creates the `w-18` utility class
- Used for the time/hours column width on the left side of the calendar
- Without this, the column has no width and collapses

### 2. `'calendar-disabled-hour'` color
- Used to style non-working hours with a subtle gray pattern
- Creates a visual distinction between working and non-working hours

### 3. `"./calendar/**/*.{js,ts,jsx,tsx,mdx}"`
- Tells Tailwind to scan the `calendar/` directory for class names
- Without this, Tailwind doesn't know these components exist
- Results in missing CSS for calendar-specific classes

## Testing

After this fix:
1. **Restart your dev server** (required for Tailwind config changes)
2. Navigate to `/dashboard/shifts`
3. Calendar should now display properly with:
   - ✅ 7 columns (one for each day)
   - ✅ Time slots on the left (8 AM, 9 AM, etc.)
   - ✅ Proper grid layout
   - ✅ Horizontal time blocks across all days

## Important Note

⚠️ **You MUST restart your development server** after changing `tailwind.config.ts`:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

Tailwind config changes are **not** hot-reloaded!

