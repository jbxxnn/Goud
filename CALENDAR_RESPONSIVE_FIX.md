# Calendar Responsive Layout Fix

## Issue
The calendar was displaying in a vertical/mobile layout on all screen sizes, showing the message "Weekly view is not available on smaller devices."

## Root Cause
The `big-calendar` component had responsive breakpoints that were hiding the proper week view layout on screens smaller than the `sm` breakpoint (640px in Tailwind CSS).

## Files Fixed

### 1. `calendar/components/week-and-day-view/calendar-week-view.tsx`
**Problem**: Week view was hidden with `sm:hidden` and the actual calendar had `hidden sm:flex`

**Before**:
```tsx
<div className="flex flex-col items-center justify-center border-b py-4 text-sm text-muted-foreground sm:hidden">
  <p>Weekly view is not available on smaller devices.</p>
  <p>Please switch to daily or monthly view.</p>
</div>

<div className="hidden flex-col sm:flex">
  {/* Calendar content */}
</div>
```

**After**:
```tsx
<div className="flex flex-col">
  <div>
    {/* Calendar content */}
  </div>
</div>
```

### 2. `calendar/components/week-and-day-view/week-view-multi-day-events-row.tsx`
**Problem**: Multi-day events row was hidden on small screens with `hidden sm:flex`

**Before**:
```tsx
<div className="hidden overflow-hidden sm:flex">
```

**After**:
```tsx
<div className="overflow-hidden flex">
```

## Result
✅ Week view now displays properly on all screen sizes  
✅ Month view works on all screen sizes  
✅ Day view works on all screen sizes  
✅ Year view works on all screen sizes  
✅ Agenda view works on all screen sizes  

## Testing
1. Navigate to `/dashboard/shifts`
2. Switch between views using the header buttons
3. All views should now display properly regardless of screen size

## Notes
- The calendar will still be responsive and adjust its layout based on screen size
- Event badges and bullet points in month view will adapt based on screen size (this is intentional)
- The calendar grid and time slots will now always be visible

