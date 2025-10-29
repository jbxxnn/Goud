# Navigation Fix for Shift Calendar

## Problem
The original big-calendar uses Next.js `Link` components for view switching, which navigates to different routes (e.g., `/month-view`, `/week-view`).

Since we're using the calendar in a single page (`/dashboard/shifts`), we need state-based view switching instead.

## Solution
Created custom components that use local state instead of navigation:

### 1. Custom Header Component
**File:** `components/shift-calendar-header.tsx`

- Replaces `<Link>` components with `<Button>` components
- Uses `onClick` handlers instead of `href` props
- Calls `onViewChange` callback to update parent state

### 2. Custom Container Component  
**File:** `components/shift-calendar-container.tsx`

- Copied from original `ClientContainer`
- Uses our custom `ShiftCalendarHeader`
- Accepts `onViewChange` prop to handle view switching

### 3. Updated Client Component
**File:** `app/dashboard/shifts/shifts-client.tsx`

- Added `calendarView` state (default: 'week')
- Added `setCalendarView` handler
- Uses `ShiftCalendarContainer` instead of `ClientContainer`
- Passes view and handler as props

## Result
✅ View switching now works within the same page
✅ No navigation/redirects
✅ URL stays at `/dashboard/shifts`
✅ All calendar views work: Day, Week, Month, Year, Agenda

## Files Created
1. `components/shift-calendar-header.tsx` - Header with button-based view switching
2. `components/shift-calendar-container.tsx` - Container that uses custom header

## Files Modified
1. `app/dashboard/shifts/shifts-client.tsx` - Updated to use custom container

