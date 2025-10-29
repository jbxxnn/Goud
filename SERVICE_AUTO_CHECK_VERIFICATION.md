# Service Auto-Check Verification Guide

## Expected Behavior

When you select a staff member in the shift creation dialog, **all services they are qualified for should automatically be checked**.

## How to Verify It's Working

### Step 1: Open Shift Dialog
1. Go to `/dashboard/shifts`
2. Click "Add Shift" button OR click on a time slot in the calendar
3. Dialog opens

### Step 2: Check Initial State
**Before selecting staff:**
- Services section shows: "Select a staff member first to see available services"
- Services list is empty or shows placeholder message
- ✅ This is correct

### Step 3: Select a Staff Member
1. Click on the "Staff Member" dropdown
2. Select any staff member (e.g., "Sarah Johnson")

**What should happen immediately:**
- ✅ Services list updates to show only services Sarah can perform
- ✅ **ALL services are automatically CHECKED** (have checkmarks)
- ✅ Message shows: "Showing X of X services this staff can perform"

### Step 4: Verify Auto-Check
Look at each service in the list:
```
✅ 12-Week Ultrasound        ← Should have checkmark
✅ 20-Week Ultrasound        ← Should have checkmark  
✅ 3D/4D Imaging             ← Should have checkmark
```

**NOT like this:**
```
☐ 12-Week Ultrasound        ← Wrong! Should be checked
☐ 20-Week Ultrasound        ← Wrong! Should be checked
☐ 3D/4D Imaging             ← Wrong! Should be checked
```

### Step 5: Test Unchecking
1. Click on a checked service to uncheck it
2. The checkmark should disappear
3. Click again to re-check it
4. The checkmark should reappear

✅ This confirms the toggle functionality works

### Step 6: Test Staff Change
1. Select a different staff member from the dropdown
2. **Services should update AND all be auto-checked again**
3. Previous selections are cleared

## Troubleshooting

### Issue: Services Don't Auto-Check

**Possible Cause 1: Staff Has No Service Qualifications**
- Check if the staff member has services assigned in Staff Management
- Go to `/dashboard/staff` → Edit staff → Services tab
- Assign at least one service

**Possible Cause 2: Browser Cache**
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Clear browser cache
- Restart dev server

**Possible Cause 3: API Not Returning Data**
- Open browser DevTools (F12)
- Go to Network tab
- Select a staff member
- Look for `/api/staff/[id]/services` request
- Check response - should show staff's services

**Possible Cause 4: Checkbox State Not Updating**
- Check browser console for errors
- Look for React state update warnings

### Issue: All Services Show (Not Filtered)

**Problem:** Selecting staff shows ALL services, not just theirs

**Check:**
1. Verify `staffServiceMap` is populated correctly
2. Open browser console
3. After selecting staff, check if services filter
4. API endpoint `/api/staff/[id]/services` should return only qualified services

### Issue: Services Checked But Count Shows 0

**Problem:** Checkboxes appear checked but count says "Showing 0 of X"

**Fix:**
- This is a state sync issue
- The `selectedServices` state might not be updating
- Check `handleStaffChange` function is calling `setSelectedServices`

## Debugging Steps

### 1. Add Console Logs

Temporarily add these to `handleStaffChange`:

```typescript
const handleStaffChange = (staffId: string) => {
  console.log('Staff selected:', staffId);
  const staffServices = staffServiceMap[staffId] || [];
  console.log('Staff services:', staffServices);
  setSelectedServices(staffServices);
  console.log('Selected services updated to:', staffServices);
  // ... rest of code
};
```

### 2. Check API Response

In DevTools Network tab:
- URL: `/api/staff/[staff-id]/services`
- Method: GET
- Response should look like:
```json
{
  "success": true,
  "data": [
    {
      "service_id": "service-uuid-1",
      "is_qualified": true
    },
    {
      "service_id": "service-uuid-2",
      "is_qualified": true
    }
  ]
}
```

### 3. Check State Updates

In React DevTools:
- Find `AddShiftDialog` component
- Look at hooks:
  - `selectedServices` state
  - Should update when staff is selected
  - Should contain array of service IDs

## Expected Flow

```
User selects "Sarah Johnson"
  ↓
handleStaffChange("sarah-id") called
  ↓
staffServiceMap["sarah-id"] = ["service-1", "service-2", "service-3"]
  ↓
setSelectedServices(["service-1", "service-2", "service-3"])
  ↓
React re-renders
  ↓
filteredServices shows only Sarah's 3 services
  ↓
Each service checkbox checked={selectedServices.includes(service.id)}
  ↓
All 3 checkboxes are checked ✅
```

## Test Cases

### Test Case 1: Staff with Multiple Services
- **Staff**: Sarah (qualified for 3 services)
- **Expected**: All 3 services checked
- **Result**: ___

### Test Case 2: Staff with One Service
- **Staff**: John (qualified for 1 service)
- **Expected**: 1 service checked
- **Result**: ___

### Test Case 3: Staff with No Services
- **Staff**: Emma (qualified for 0 services)
- **Expected**: Warning message, no services shown
- **Result**: ___

### Test Case 4: Changing Between Staff
- **Start**: Select Sarah (3 services)
- **Action**: Select John (1 service)
- **Expected**: John's 1 service is checked, Sarah's services gone
- **Result**: ___

## Quick Fix Checklist

If services aren't auto-checking:

- [ ] Verify staff has services assigned in database
- [ ] Check API endpoint returns correct data
- [ ] Confirm `staffServiceMap` is populated
- [ ] Verify `handleStaffChange` calls `setSelectedServices`
- [ ] Check browser console for errors
- [ ] Hard refresh browser
- [ ] Restart dev server

## Code References

**Auto-select logic:**
```typescript
// Line ~260 in add-shift-dialog.tsx
const handleStaffChange = (staffId: string) => {
  setValue('staff_id', staffId);
  
  // Auto-select all services that this staff member can perform
  const staffServices = staffServiceMap[staffId] || [];
  setSelectedServices(staffServices);
};
```

**Checkbox state:**
```typescript
// Line ~505 in add-shift-dialog.tsx
<Checkbox
  checked={selectedServices.includes(service.id)}
  onCheckedChange={() => toggleService(service.id)}
/>
```

**Service filtering:**
```typescript
// Line ~250 in add-shift-dialog.tsx
const filteredServices = watch('staff_id')
  ? services.filter(svc => staffServiceMap[watch('staff_id')]?.includes(svc.id))
  : services;
```

---

**If following this guide and services still don't auto-check, there may be a browser caching issue. Try opening in an incognito window.**

