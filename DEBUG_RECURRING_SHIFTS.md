# Debug Recurring Shifts Not Showing

## Quick Debug Steps

### 1. Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab  
3. Refresh the `/dashboard/shifts` page
4. Look for logs like:

```
Expanding recurring shift: {
  shiftId: "...",
  originalRule: "FREQ=WEEKLY;BYDAY=MO",
  processedRule: "DTSTART:20251028T090000\nRRULE:FREQ=WEEKLY;BYDAY=MO",
  shiftStart: "2025-10-28T09:00:00.000Z",
  dateRange: { start: "2025-10-01...", end: "2025-10-31..." }
}
Generated X occurrences for shift ...
```

### 2. Check the Numbers

**If you see "Generated 0 occurrences":**
- The RRULE didn't produce any instances
- Possible causes:
  - Wrong day selected (check BYDAY value)
  - DTSTART is outside the date range
  - UNTIL date is in the past

**If you see "Generated 5 occurrences" (or more):**
- The expansion is working!
- Check if the calendar is filtering them out
- Check the date range being viewed

### 3. Check the Recurrence Rule in Database

Run this in Supabase SQL Editor:

```sql
SELECT 
  id,
  staff_id,
  location_id,
  start_time,
  end_time,
  is_recurring,
  recurrence_rule
FROM shifts
WHERE is_recurring = true
ORDER BY created_at DESC
LIMIT 5;
```

**Look for:**
- `is_recurring` should be `true`
- `recurrence_rule` should look like: `FREQ=WEEKLY;BYDAY=MO`
- `start_time` should be on the correct day of week

### 4. Verify the Day Code

Make sure the day code in `recurrence_rule` matches:

| Day | Code |
|-----|------|
| Monday | MO |
| Tuesday | TU |
| Wednesday | WE |
| Thursday | TH |
| Friday | FR |
| Saturday | SA |
| Sunday | SU |

Example: For Monday shifts, you should see `BYDAY=MO`

### 5. Check the Date Range

The calendar only expands shifts for the visible period:

- **Month View**: Expands for current month only
- **Week View**: Expands for current week only

**Navigate to future weeks/months** to see future instances.

## Common Issues & Fixes

### Issue 1: "Generated 0 occurrences"

**Problem:** RRULE produces no instances

**Fix:**
1. Check if shift start date is in the past
2. Check if viewing a future month where shift should appear
3. Verify BYDAY matches the shift start date's day of week

### Issue 2: Only First Instance Shows

**Problem:** Expansion might not be running

**Fix:**
1. Check console for expansion logs
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear cache and reload
4. Check if `expandRecurringShifts` is being called

### Issue 3: Wrong Days Appearing

**Problem:** Shift appears on wrong days

**Fix:**
1. Check database `recurrence_rule` field
2. Verify BYDAY code is correct
3. Update the shift with correct days

### Issue 4: Shift Stops After Certain Date

**Problem:** UNTIL date is set

**Fix:**
1. Check if `recurrence_rule` contains `UNTIL=...`
2. Either remove UNTIL or extend the date
3. Update the shift

## Testing Checklist

- [ ] Open browser console (F12)
- [ ] Refresh `/dashboard/shifts`
- [ ] See "Expanding recurring shift" log
- [ ] Check "Generated X occurrences" number
- [ ] Navigate to next week
- [ ] Navigate to next month
- [ ] Verify shift appears on correct days
- [ ] Check database `recurrence_rule` field
- [ ] Verify `is_recurring` is true
- [ ] Check BYDAY code matches intended day

## Expected Console Output

For a working recurring Monday shift:

```javascript
Expanding recurring shift: {
  shiftId: "abc-123-def",
  originalRule: "FREQ=WEEKLY;BYDAY=MO",
  processedRule: "DTSTART:20251028T090000\nRRULE:FREQ=WEEKLY;BYDAY=MO",
  shiftStart: "2025-10-28T09:00:00.000Z",
  dateRange: { 
    start: "2025-10-01T00:00:00.000Z", 
    end: "2025-10-31T23:59:59.999Z" 
  }
}
Generated 4 occurrences for shift abc-123-def
```

This means:
- ✅ Recurrence rule found
- ✅ DTSTART added
- ✅ 4 Mondays in October 2025
- ✅ 4 shift instances created

## Manual Test

### Create a Test Shift

1. Go to `/dashboard/shifts`
2. Click "Add Shift"
3. Select:
   - Staff: Any
   - Location: Any
   - Start: **Next Monday** at 9:00 AM
   - End: **Next Monday** at 5:00 PM
   - Toggle "Recurring Shift": ON
   - Frequency: Weekly
   - Days: Monday (MO)
   - Repeat Until: 2 months from now
4. Click "Create Shift"

### Verify

1. You should see the shift on the selected Monday
2. Navigate to next week → should see same shift
3. Navigate to next month → should see same shift on Mondays
4. Check console → should see "Generated X occurrences"

## SQL Debug Queries

### Check Shift Details

```sql
SELECT 
  s.*,
  st.first_name || ' ' || st.last_name as staff_name,
  l.name as location_name
FROM shifts s
JOIN staff st ON s.staff_id = st.id
JOIN locations l ON s.location_id = l.id
WHERE s.is_recurring = true
ORDER BY s.created_at DESC;
```

### Check What Should Recur

```sql
SELECT 
  id,
  to_char(start_time, 'Dy, YYYY-MM-DD HH24:MI') as start,
  recurrence_rule,
  CASE 
    WHEN recurrence_rule LIKE '%BYDAY=MO%' THEN 'Monday'
    WHEN recurrence_rule LIKE '%BYDAY=TU%' THEN 'Tuesday'
    WHEN recurrence_rule LIKE '%BYDAY=WE%' THEN 'Wednesday'
    WHEN recurrence_rule LIKE '%BYDAY=TH%' THEN 'Thursday'
    WHEN recurrence_rule LIKE '%BYDAY=FR%' THEN 'Friday'
    WHEN recurrence_rule LIKE '%BYDAY=SA%' THEN 'Saturday'
    WHEN recurrence_rule LIKE '%BYDAY=SU%' THEN 'Sunday'
    ELSE 'Multiple/Unknown'
  END as recurring_on
FROM shifts
WHERE is_recurring = true;
```

## Still Not Working?

If after all these steps it's still not working:

1. **Share console output** - screenshot of browser console
2. **Share database query result** - from SQL above
3. **Share specific details**:
   - What day did you select?
   - What frequency?
   - What date range are you viewing?
   - How many weeks ahead are you looking?

---

**Most common fix: Hard refresh the browser (Ctrl+Shift+R) after the code changes!**

