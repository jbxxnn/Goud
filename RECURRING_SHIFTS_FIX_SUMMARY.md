# Recurring Shifts "Only First Instance" Fix

## Problem

You created a recurring shift for "Weekly on Wednesday" but only saw 1 instance in the calendar.

## Root Cause

Your shift started on **October 29** (a Wednesday), but you were viewing **October 2025**. 

The RRULE generates instances **forward from the start date**, not backward:
- ✅ Oct 29 (first instance)
- ✅ Nov 5 (second instance)
- ✅ Nov 12, 19, 26... (future instances)

❌ It does NOT generate backward to earlier Wednesdays in October (Oct 2, 9, 16, 23).

## What Was Fixed

### 1. Extended Date Range (✅ CRITICAL FIX)

**File:** `app/dashboard/shifts/shifts-client.tsx`

**Before:**
- Fetched shifts for current month only (Oct 1-31)
- Expanded shifts for current month only
- Result: Only Oct 29 showed (1 instance)

**After:**
- Fetches shifts for **current month + 3 months ahead** (Oct 1 - Jan 31)
- Expands all shifts across this 4-month period
- Result: All instances pre-generated for smooth navigation

**Benefit:** Navigate to next weeks/months without refetching data

### 2. Improved RRULE Parsing

**File:** `lib/utils/expand-recurring-shifts.ts`

**Fix:**
- Automatically adds `DTSTART:` prefix to RRULE
- Uses proper date format for RRule library
- Handles edge cases in RRULE format

### 3. Added Debug Logging

**Console Output:**
```javascript
Expanding recurring shift: {
  shiftId: "...",
  originalRule: "FREQ=WEEKLY;BYDAY=WE",
  processedRule: "DTSTART:20251029T080000\nRRULE:FREQ=WEEKLY;BYDAY=WE",
  dateRange: {start: '2025-10-01...', end: '2026-01-31...'}
}
Generated 13 occurrences for shift ...
```

**What to Look For:**
- `Generated X occurrences` - Should match weeks in 4-month period
- If `Generated 0` or `Generated 1` - Check start date vs. view date

## Testing Instructions

### Step 1: Hard Refresh Browser
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Step 2: Check Console
Open browser DevTools (F12) → Console tab

Look for:
```
Fetched 2 raw shifts, expanded to 26 total shifts
Generated 13 occurrences for shift ...
Generated 13 occurrences for shift ...
```

### Step 3: Navigate Calendar

**Current View (October):**
- Should see Oct 29 instance (1 Wednesday remaining in Oct)

**Next Week:**
- Should see Nov 5 instance

**November View:**
- Should see ALL November Wednesdays (5 instances)
- Nov 5, 12, 19, 26, and Dec 3 if week spans months

**December View:**
- Should see ALL December Wednesdays (4-5 instances)

## Expected Behavior

### For Your Wednesday Shift (Starting Oct 29)

| Month | Expected Instances | Days |
|-------|-------------------|------|
| October 2025 | 1 | Oct 29 |
| November 2025 | 4 | Nov 5, 12, 19, 26 |
| December 2025 | 5 | Dec 3, 10, 17, 24, 31 |
| January 2026 | 5 | Jan 7, 14, 21, 28, Feb 4* |

*Depending on week view boundaries

### Console Output Example

For your Wednesday shift with UNTIL Dec 31, 2025:

```javascript
Generated 10 occurrences for shift 1d561e6f-...
```

This is correct! From Oct 29 to Dec 31:
- Oct: 1 Wednesday (29)
- Nov: 4 Wednesdays (5, 12, 19, 26)
- Dec: 5 Wednesdays (3, 10, 17, 24, 31)
- **Total: 10 occurrences**

## What You Should See Now

### Before Fix:
```
October 2025 Calendar:
[ ] [ ] [X] [ ] [ ] [ ] [ ]  ← Only Oct 29 shows
```

### After Fix:
```
October 2025 Calendar:
[ ] [ ] [X] [ ] [ ] [ ] [ ]  ← Oct 29 shows

November 2025 Calendar:
[ ] [ ] [X] [ ] [ ] [ ] [ ]  ← Nov 5 shows
[ ] [ ] [X] [ ] [ ] [ ] [ ]  ← Nov 12 shows
[ ] [ ] [X] [ ] [ ] [ ] [ ]  ← Nov 19 shows
[ ] [ ] [X] [ ] [ ] [ ] [ ]  ← Nov 26 shows
```

## Troubleshooting

### Still Only Seeing 1 Instance?

**Check Console:**
```javascript
Generated 1 occurrences for shift ...  // ❌ BAD
```

**Possible Causes:**
1. **UNTIL date is in the past** - Check database `recurrence_rule` for `UNTIL=...`
2. **Wrong day selected** - Check `BYDAY=` matches shift start day
3. **Not navigating to future** - Try clicking "Next Week" or "Next Month"
4. **Browser cache** - Hard refresh (Ctrl+Shift+R)

### Seeing "Generated 10+ occurrences" but Calendar Empty?

**Possible Causes:**
1. **Staff filter active** - Check if a staff member is selected in filter
2. **Wrong calendar view** - Try switching between Week/Month/Day views
3. **Date range issue** - Navigate to future weeks explicitly

### Seeing Wrong Days?

**Check Database:**
```sql
SELECT recurrence_rule FROM shifts WHERE id = 'your-shift-id';
```

**Day Codes:**
- Monday: `BYDAY=MO`
- Tuesday: `BYDAY=TU`
- Wednesday: `BYDAY=WE`
- Thursday: `BYDAY=TH`
- Friday: `BYDAY=FR`
- Saturday: `BYDAY=SA`
- Sunday: `BYDAY=SU`

If wrong day code, update the shift.

## Quick Test

### Create a Test Shift for Tomorrow

1. Go to `/dashboard/shifts`
2. Click "Add Shift"
3. Fill in:
   - Staff: Any
   - Location: Any
   - Start: **Tomorrow at 9 AM**
   - End: **Tomorrow at 5 PM**
   - Toggle "Recurring" ON
   - Frequency: Weekly
   - Day: (select tomorrow's day of week)
   - Until: 2 months from now
4. Save

### Expected Result

- ✅ Console: "Generated 8-9 occurrences"
- ✅ See shift tomorrow
- ✅ Navigate to next week → see shift on same day
- ✅ Navigate to next month → see shift on all matching days

## Summary

**The Fix:** Extended the date range from 1 month to 4 months (current + 3 ahead).

**The Result:** All recurring instances are now pre-generated and visible when navigating the calendar.

**Your Action:** Hard refresh browser and navigate to **November** to see all your Wednesday shifts! 📅

---

**Console Debug Command:**
```javascript
// In browser console, check expanded shifts count:
console.log('Total shifts in calendar:', window.__SHIFTS_COUNT__);
```

(This is what the new console.log shows you)

