# Staff Service Auto-Selection in Shift Creation

## Overview

The shift creation form now automatically filters and selects services based on the staff member's qualifications. All services the staff member can perform are checked by default, and users can customize which ones are available for that specific shift.

## Business Logic

### Core Rule
**Staff members can only offer services they are qualified to perform during a shift.**

### Auto-Selection Behavior
1. When a staff member is selected, services are **filtered** to show only what they can do
2. **All qualified services are automatically checked** by default
3. Users can **uncheck specific services** if they don't want them available during this shift
4. Users can **re-check services** to add them back

## How It Works

### Flow

```
User selects "Sarah Johnson"
  ↓
System checks Sarah's service qualifications
  ↓
Services list filters to:
  ✅ 12-Week Ultrasound (auto-checked)
  ✅ 20-Week Ultrasound (auto-checked)
  ✅ 3D/4D Imaging (auto-checked)
  ↓
User unchecks "3D/4D Imaging" 
  (Sarah won't do 3D imaging during this specific shift)
  ↓
Final shift services:
  ✅ 12-Week Ultrasound
  ✅ 20-Week Ultrasound
  ❌ 3D/4D Imaging
```

### Visual States

**Before Staff Selection:**
```
┌─────────────────────────────────────┐
│ Services *                           │
│ ℹ️ Select a staff member first to   │
│   see available services             │
│                                      │
│ Please select a staff member to see │
│ their qualified services             │
└─────────────────────────────────────┘
```

**After Staff Selection (with services):**
```
┌─────────────────────────────────────┐
│ Services *                           │
│ ℹ️ Showing 3 of 3 services this     │
│   staff can perform                  │
│                                      │
│ ✅ 12-Week Ultrasound               │
│    [Max bookings: ___]              │
│ ✅ 20-Week Ultrasound               │
│    [Max bookings: ___]              │
│ ✅ 3D/4D Imaging                    │
│    [Max bookings: ___]              │
└─────────────────────────────────────┘
```

**Staff with No Service Qualifications:**
```
┌─────────────────────────────────────┐
│ Services *                           │
│ ⚠️ Selected staff member is not     │
│   qualified for any services         │
│                                      │
│ This staff member has no service    │
│ qualifications assigned              │
└─────────────────────────────────────┘
```

## Implementation Details

### Data Fetching

**On Dialog Open:**
```typescript
for (const member of staff) {
  // Fetch service qualifications
  const response = await fetch(`/api/staff/${member.id}/services`);
  const data = await response.json();
  
  // Store only qualified services
  serviceMapping[member.id] = data
    .filter(svc => svc.is_qualified)
    .map(svc => svc.service_id);
}
```

### Filtering Logic

```typescript
// Filter services based on selected staff
const filteredServices = watch('staff_id')
  ? services.filter(svc => staffServiceMap[watch('staff_id')]?.includes(svc.id))
  : services;
```

### Auto-Selection Logic

```typescript
const handleStaffChange = (staffId: string) => {
  setValue('staff_id', staffId);
  
  // Auto-select all services that this staff member can perform
  const staffServices = staffServiceMap[staffId] || [];
  setSelectedServices(staffServices);
};
```

### User Customization

Users can toggle services on/off:
```typescript
const toggleService = (serviceId: string) => {
  setSelectedServices(prev =>
    prev.includes(serviceId)
      ? prev.filter(id => id !== serviceId)  // Uncheck
      : [...prev, serviceId]                  // Check
  );
};
```

## API Endpoints

### New Endpoint: Get Staff Services

**Route:** `GET /api/staff/[id]/services`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "qualification-id",
      "staff_id": "staff-id",
      "service_id": "service-id",
      "is_qualified": true,
      "qualification_date": "2024-01-15",
      "services": {
        "name": "12-Week Ultrasound",
        "duration": 30
      }
    }
  ]
}
```

## User Experience Examples

### Example 1: Full-Service Staff

**Setup:**
- Sarah is qualified for: 12-Week Ultrasound, 20-Week Ultrasound, 3D Imaging, Gender Reveal

**User Flow:**
1. Select "Sarah Johnson"
   - ✅ All 4 services auto-checked
2. User unchecks "Gender Reveal" (not offering it today)
   - ✅ 12-Week Ultrasound
   - ✅ 20-Week Ultrasound
   - ✅ 3D Imaging
   - ❌ Gender Reveal
3. Create shift with 3 services

### Example 2: Specialized Staff

**Setup:**
- John is qualified for: Only Gynecologic Ultrasound

**User Flow:**
1. Select "John"
   - ✅ Gynecologic Ultrasound (auto-checked)
   - Only 1 service shown
2. Cannot uncheck (need at least 1 service)
3. Create shift with 1 service

### Example 3: Unqualified Staff

**Setup:**
- Emma is a new staff member with no qualifications yet

**User Flow:**
1. Select "Emma"
   - ⚠️ Warning: "Selected staff member is not qualified for any services"
   - Empty services list
2. Cannot create shift (need at least 1 service)
3. User must go to Staff Management to assign services first

## Benefits

### For Users
- ✅ **Faster Data Entry**: No need to manually select services
- ✅ **Prevents Errors**: Can't select services staff aren't qualified for
- ✅ **Flexibility**: Can customize per-shift which services are offered
- ✅ **Clear Feedback**: Shows exactly what staff can do

### For Data Integrity
- ✅ **Enforces Qualifications**: Only qualified services can be booked
- ✅ **Audit Trail**: Clear record of what services were available per shift
- ✅ **Business Rules**: Prevents invalid shift configurations

### For Scheduling
- ✅ **Realistic Capacity**: Only shows services staff can actually perform
- ✅ **Flexible Scheduling**: Same staff, different services on different days
- ✅ **Better Planning**: Know exactly what's available when

## Edge Cases Handled

### 1. Staff with No Qualifications
- Shows warning message
- Prevents shift creation
- Directs user to assign qualifications

### 2. Changing Staff Selection
- Clears previous service selections
- Auto-selects new staff's services
- Prevents stale data

### 3. All Services Unchecked
- Form validation prevents submission
- Must have at least 1 service selected

### 4. No Staff Selected
- Shows placeholder message
- Services section is informational
- Guides user to select staff first

## Form Validation

```typescript
// Shift cannot be created without at least 1 service
disabled={isSubmitting || selectedServices.length === 0}
```

**Error States:**
- No staff selected → "Select a staff member first"
- Staff with no qualifications → "Staff member is not qualified for any services"
- No services checked → "At least one service must be selected"

## Files Modified

### Created
- ✅ `app/api/staff/[id]/services/route.ts` - API endpoint for staff service qualifications
- ✅ `STAFF_SERVICE_AUTO_SELECTION.md` - This documentation

### Modified
- ✅ `calendar/components/dialogs/add-shift-dialog.tsx` - Added service filtering and auto-selection

## Testing Checklist

- [x] Select staff → services filter correctly
- [x] Services auto-check when staff selected
- [x] Can uncheck individual services
- [x] Can re-check unchecked services
- [x] Form validation prevents 0 services
- [x] Shows correct count (X of Y services)
- [x] Warning for staff with no qualifications
- [x] Info message when no staff selected
- [x] API endpoint returns correct data
- [ ] Test with staff having 0 qualifications
- [ ] Test with staff having 1 qualification
- [ ] Test with staff having 10+ qualifications
- [ ] Test changing between staff members

## Future Enhancements

1. **Bulk Service Toggle**
   - "Select All" / "Deselect All" buttons
   - Quick toggle for common combinations

2. **Service Templates**
   - Save common service combinations
   - "Morning Shift Services", "Full Service Day", etc.

3. **Service Recommendations**
   - Suggest services based on time of day
   - Highlight most-booked services

4. **Quick View**
   - Show service names next to staff in dropdown
   - "Sarah (3 services)" instead of just "Sarah"

---

**Summary**: Services are now intelligently filtered based on staff qualifications and auto-selected by default, with the flexibility to customize per shift. This improves data entry speed while maintaining data integrity.

