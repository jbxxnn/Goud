# Installation Commands for Shift Management

Run these commands in order to set up the Shift Management System:

## ⚠️ CRITICAL: Restart Dev Server After Tailwind Config Changes

The calendar requires specific Tailwind CSS configuration. After setup is complete, you **MUST** restart your dev server:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

Tailwind config changes are NOT hot-reloaded!

## 1. Install Core Dependencies
```bash
npm install date-fns react-day-picker
```

## 2. Install shadcn/ui Components (if missing)

Check if you have these components, install if needed:

```bash
# Check if these exist first in components/ui/
# If missing, run:

npx shadcn@latest add checkbox
npx shadcn@latest add popover
npx shadcn@latest add select
npx shadcn@latest add switch
npx shadcn@latest add textarea
npx shadcn@latest add label
npx shadcn@latest add input
npx shadcn@latest add button
npx shadcn@latest add sheet
```

## 3. Verify File Structure

Make sure you have these files:

### Calendar Files (already copied)
- ✅ `calendar/` folder
- ✅ `hooks/use-disclosure.ts`
- ✅ `components/ui/single-calendar.tsx`
- ✅ `components/ui/single-day-picker.tsx`

### Shift Management Files (created)
- ✅ `app/dashboard/shifts/page.tsx`
- ✅ `app/dashboard/shifts/shifts-client.tsx`
- ✅ `components/shift-modal.tsx`
- ✅ `components/shift-form.tsx`
- ✅ `lib/types/shift.ts`
- ✅ `lib/database/shifts.ts`
- ✅ `app/api/shifts/route.ts`
- ✅ `app/api/shifts/[id]/route.ts`

## 4. Database Setup (already done)

You've already run:
- ✅ `database/shifts_table.sql`

## 5. Start Development Server

```bash
npm run dev
```

## 6. Navigate to Shifts Page

Open your browser and go to:
```
http://localhost:3000/dashboard/shifts
```

## Troubleshooting

### If you get module not found errors:

**Error: Cannot find module 'date-fns'**
```bash
npm install date-fns
```

**Error: Cannot find module 'react-day-picker'**
```bash
npm install react-day-picker
```

**Error: Cannot find '@/hooks/use-disclosure'**
- Make sure `hooks/use-disclosure.ts` exists
- Check if it's in the root `hooks/` folder

**Error: Cannot find '@/calendar/...'**
- Make sure the `calendar/` folder is at project root
- Should be at same level as `app/`, `components/`, `lib/`

### If calendar doesn't show:

1. Check browser console for errors
2. Make sure you have at least one active staff member
3. Verify the shifts API is working: `http://localhost:3000/api/shifts?with_details=true`

### If form doesn't submit:

1. Check that you have:
   - At least one active staff member
   - At least one active location
   - At least one active service
2. Open browser console and check for errors
3. Check Network tab for API response

## Quick Test

To verify everything is working:

1. **Test API**: Open `http://localhost:3000/api/shifts`
   - Should return JSON with success: true

2. **Test Page**: Open `http://localhost:3000/dashboard/shifts`
   - Should show calendar interface
   - Should have "Add Shift" button

3. **Test Form**: Click "Add Shift"
   - Should open a drawer from the right
   - Should have all form fields

## Success Checklist

- [ ] npm install completed without errors
- [ ] Development server starts successfully
- [ ] `/dashboard/shifts` page loads
- [ ] Calendar displays (may be empty)
- [ ] "Add Shift" button works
- [ ] Form opens in drawer
- [ ] Can select staff, location, services
- [ ] Can create a shift
- [ ] Shift appears in calendar

## Need Help?

Check these files for detailed info:
- `QUICK_START_SHIFTS.md` - Quick start guide
- `SHIFT_MANAGEMENT_COMPLETE.md` - Full documentation
- `SHIFT_MANAGEMENT_SETUP.md` - Technical details

