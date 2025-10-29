# Quick Start: Shift Management

## ✅ You've Already Done:
1. ✅ Ran `database/shifts_table.sql` in Supabase
2. ✅ Copied calendar files to `/calendar`
3. ✅ Copied `single-calendar.tsx` and `single-day-picker.tsx`

---

## 🚀 What to Do Now:

### 1. **Install Missing Dependencies**
```bash
npm install date-fns react-day-picker
```

### 2. **Install Missing shadcn/ui Components**

You might need these shadcn/ui components (if not already installed):
```bash
npx shadcn@latest add checkbox
npx shadcn@latest add popover
```

### 3. **Verify Folder Structure**

Make sure you have:
- ✅ `calendar/` folder at project root (same level as `app/`)
- ✅ `hooks/use-disclosure.ts` exists
- ✅ `components/ui/single-calendar.tsx` exists
- ✅ `components/ui/single-day-picker.tsx` exists

### 4. **Test the Shifts Page**

1. **Start your dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Navigate to** `/dashboard/shifts`

3. **You should see**:
   - A calendar view (week by default)
   - "Add Shift" button in the top right
   - Your existing shifts displayed (if any)

### 5. **Create Your First Shift**

1. Click **"Add Shift"** button
2. Fill out the form:
   - Staff: Pick a staff member
   - Location: Pick a location
   - Start Time: e.g., Tomorrow at 9:00 AM
   - End Time: e.g., Tomorrow at 5:00 PM
   - Services: Check at least one service
3. Click **"Create Shift"**
4. The shift should appear in the calendar!

---

## ✅ Fixed Issues

### ✅ View Switching Fixed
The calendar now uses state-based view switching instead of navigation. Clicking "Month", "Week", etc. will change the view without navigating away from `/dashboard/shifts`.

See `NAVIGATION_FIX.md` for technical details.

### ✅ Responsive Layout Fixed
The calendar now displays properly on all screen sizes. The vertical/mobile layout no longer appears unnecessarily.

See `CALENDAR_RESPONSIVE_FIX.md` for technical details.

### ✅ Tailwind Configuration Fixed
The calendar requires specific Tailwind CSS configuration to render properly. The `tailwind.config.ts` has been updated with:
- Custom `w-18` spacing class for the time column
- `calendar-disabled-hour` color for non-working hours
- Content path for the `calendar/` directory

**⚠️ IMPORTANT:** After updating `tailwind.config.ts`, you MUST restart your dev server!

See `CALENDAR_CONFIG_FIX.md` for technical details.

---

## 🔍 Troubleshooting

### If calendar doesn't show:
- Check browser console for errors
- Make sure `date-fns` is installed
- Verify you have active staff members

### If "Add Shift" button doesn't work:
- Check that all components are in the right folders
- Verify `components/shift-modal.tsx` exists
- Check `components/shift-form.tsx` exists

### If shift creation fails:
- Check browser console for API errors
- Verify the database schema was run successfully
- Make sure you have active locations and services

---

## 📁 File Structure Check

Make sure you have these files:

```
✅ app/dashboard/shifts/page.tsx
✅ app/dashboard/shifts/shifts-client.tsx
✅ components/shift-modal.tsx
✅ components/shift-form.tsx
✅ components/app-sidebar.tsx (updated)
✅ calendar/ (entire folder)
✅ components/ui/single-calendar.tsx
✅ components/ui/single-day-picker.tsx
✅ lib/types/shift.ts
✅ lib/database/shifts.ts
✅ app/api/shifts/route.ts
✅ app/api/shifts/[id]/route.ts
✅ database/shifts_table.sql (already ran)
```

---

## 🎯 Next Actions

Once shifts are working:

1. **Create some test shifts** to populate the calendar
2. **Try the recurring shift feature** (toggle "Recurring Shift")
3. **Test conflict detection** (try to schedule the same staff twice)
4. **Switch calendar views** (week, month, day, year, agenda)

---

## 📞 Common Issues & Fixes

### Issue: "Cannot find module '@/calendar/...'"
**Fix**: Make sure the entire `calendar` folder is in your project root's `src/` or at the same level as `app/`

### Issue: Missing shadcn components
**Fix**: Run `npx shadcn@latest add checkbox` for any missing components

### Issue: Shifts not saving
**Fix**: 
1. Check API response in Network tab
2. Verify database schema was run
3. Check that staff and locations exist
4. Ensure you selected at least one service

### Issue: Calendar showing empty
**Fix**:
1. Create at least one staff member
2. Create at least one location  
3. Create a shift
4. Make sure shift dates are within the current view

---

## ✨ Features to Try

### 1. **Recurring Weekly Shift**
- Toggle "Recurring Shift"
- Select "Weekly"
- Choose multiple days (e.g., Monday & Wednesday)
- See multiple shifts created automatically

### 2. **Multiple Services per Shift**
- Select 2-3 services when creating a shift
- Set different max bookings for each

### 3. **Calendar Views**
- Try switching between Week, Month, Day views
- Filter by specific staff member

---

## 🎉 Success!

If you can:
- ✅ See the calendar
- ✅ Create a shift
- ✅ View the shift in the calendar
- ✅ Edit/Delete shifts

**Then Phase 4 is complete!** 🎊

You're ready to move on to **Phase 5: Booking System** whenever you're ready.

---

## 💡 Pro Tips

1. **Test Conflict Detection**: Try creating overlapping shifts for the same staff member - it should be blocked
2. **Use Recurring Shifts**: Save time by setting up weekly schedules
3. **Color Coding**: Each location gets its own color automatically
4. **Filter View**: Use the staff filter in the calendar to see specific schedules

---

Need help? Check `SHIFT_MANAGEMENT_COMPLETE.md` for full documentation!

