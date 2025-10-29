# Staff-Location Filtering in Shift Creation

## Overview

The shift creation form now implements intelligent cascading filters between staff and location selections. This ensures that shifts can only be created for valid staff-location combinations.

## Business Logic

### Core Rule
**Staff members can only work at locations they are assigned to.**

This is enforced bidirectionally:
1. If you select a **staff member first** → only their assigned locations are available
2. If you select a **location first** → only staff assigned to that location are available

## Implementation

### How It Works

**Scenario 1: Select Staff First**
```
1. User selects "Sarah Johnson" as staff
2. System checks Sarah's location assignments
3. Location dropdown filters to show ONLY locations Sarah is assigned to
4. If a location was already selected but Sarah isn't assigned there, it's cleared
```

**Scenario 2: Select Location First**
```
1. User selects "Main Clinic" as location
2. System checks which staff are assigned to Main Clinic
3. Staff dropdown filters to show ONLY staff assigned to Main Clinic
4. If staff was already selected but not assigned to Main Clinic, it's cleared
```

**Scenario 3: No Selection**
```
1. Both dropdowns show all available options
2. User can start with either staff or location
```

### Visual Feedback

**Empty State Messages:**
- If location is selected but no staff are assigned:
  - Message: "No staff assigned to this location"
  - Warning: "No staff members are assigned to the selected location"
  
- If staff is selected but they have no locations:
  - Message: "Selected staff is not assigned to any locations"
  - Warning: "Selected staff member is not assigned to any locations"

**Auto-Clearing:**
- When selections become incompatible, they are automatically cleared
- Example: Select Staff A → Select Location X → Select Staff B (not at Location X) → Location X is cleared

## Technical Details

### Data Fetching

**On Dialog Open:**
1. Fetch all active staff members
2. For each staff member, fetch their location assignments
3. Build a `staffLocationMap` object:
   ```typescript
   {
     "staff-id-1": ["location-id-1", "location-id-2"],
     "staff-id-2": ["location-id-3"],
     ...
   }
   ```

### Filtering Logic

```typescript
// Filter locations based on selected staff
const filteredLocations = watch('staff_id')
  ? locations.filter(loc => staffLocationMap[watch('staff_id')]?.includes(loc.id))
  : locations;

// Filter staff based on selected location
const filteredStaff = watch('location_id')
  ? staff.filter(s => staffLocationMap[s.id]?.includes(watch('location_id')))
  : staff;
```

### Change Handlers

**Staff Selection:**
```typescript
const handleStaffChange = (staffId: string) => {
  setValue('staff_id', staffId);
  
  // Clear location if not in staff's locations
  const currentLocation = watch('location_id');
  if (currentLocation && !staffLocationMap[staffId]?.includes(currentLocation)) {
    setValue('location_id', '');
  }
};
```

**Location Selection:**
```typescript
const handleLocationChange = (locationId: string) => {
  setValue('location_id', locationId);
  
  // Clear staff if not assigned to this location
  const currentStaff = watch('staff_id');
  if (currentStaff && !staffLocationMap[currentStaff]?.includes(locationId)) {
    setValue('staff_id', '');
  }
};
```

## API Endpoints

### New Endpoint: Get Staff Locations

**Route:** `GET /api/staff/[id]/locations`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "assignment-id",
      "staff_id": "staff-id",
      "location_id": "location-id",
      "is_primary": true,
      "locations": {
        "name": "Main Clinic",
        "address": "123 Main St"
      }
    }
  ]
}
```

**Usage:**
- Called when the shift dialog opens
- Fetches location assignments for each staff member
- Builds the staff-location mapping

## Files Modified

### Created
- ✅ `app/api/staff/[id]/locations/route.ts` - API endpoint for staff location assignments

### Modified
- ✅ `calendar/components/dialogs/add-shift-dialog.tsx` - Added filtering logic

## User Experience

### Before (❌ Problems)
- Could select any staff with any location
- Could create invalid shifts (staff at unassigned locations)
- No validation until submission
- Confusing error messages

### After (✅ Improvements)
- Only valid combinations are selectable
- Immediate visual feedback
- Clear warning messages
- Prevents invalid submissions
- Better user guidance

## Examples

### Example 1: Sarah at Main Clinic

**Setup:**
- Sarah is assigned to: Main Clinic, Downtown Clinic
- John is assigned to: Suburban Clinic

**User Actions:**
1. Select "Sarah Johnson" as staff
   - ✅ Location dropdown shows: Main Clinic, Downtown Clinic
   - ❌ Location dropdown hides: Suburban Clinic

2. Select "Main Clinic" as location
   - ✅ Can proceed to create shift

### Example 2: Location First

**Setup:**
- Main Clinic has staff: Sarah, Emma
- Downtown Clinic has staff: John

**User Actions:**
1. Select "Suburban Clinic" as location (only Emma works there)
   - ✅ Staff dropdown shows: Emma
   - ❌ Staff dropdown hides: Sarah, John

2. Try to select "John" 
   - ❌ John is not in the dropdown
   - User is guided to select valid staff

### Example 3: Incompatible Change

**User Actions:**
1. Select "Sarah" (works at Main, Downtown)
2. Select "Main Clinic"
3. Change staff to "John" (only works at Suburban)
   - ✅ "Main Clinic" is automatically cleared
   - ⚠️ Location dropdown now shows only: Suburban Clinic

## Benefits

### Data Integrity
- ✅ Prevents invalid shift-staff-location combinations
- ✅ Enforces business rules at the UI level
- ✅ Reduces database constraint violations

### User Experience
- ✅ Clear guidance on what's possible
- ✅ Immediate feedback
- ✅ No confusing error messages after submission
- ✅ Faster shift creation workflow

### Maintainability
- ✅ Centralized filtering logic
- ✅ Easy to understand code
- ✅ Reusable pattern for other forms

## Testing Checklist

- [x] Select staff first → locations filter correctly
- [x] Select location first → staff filter correctly
- [x] Change staff → incompatible location clears
- [x] Change location → incompatible staff clears
- [x] Empty state messages display correctly
- [x] Warning messages display correctly
- [x] API endpoint returns correct data
- [x] No console errors
- [ ] Test with staff assigned to 0 locations
- [ ] Test with location having 0 staff
- [ ] Test with multiple staff assignments

## Future Enhancements

1. **Bulk Assignment Check**
   - Optimize: fetch all staff-location assignments in one call
   - Currently: fetches per staff member (N+1 queries)

2. **Cache Staff-Location Map**
   - Store in React context
   - Avoid re-fetching on every dialog open

3. **Visual Indicators**
   - Show location count next to staff name
   - Show staff count next to location name

4. **Quick Assignment**
   - "Assign to location" button in shift form
   - Quick-add staff to location without leaving form

---

**Summary**: The shift form now intelligently filters staff and locations to ensure only valid combinations can be selected, improving data integrity and user experience.

