# Testing Shift Creation

## Prerequisites

Before you can create shifts, you need to have:
1. ✅ At least one **active staff member**
2. ✅ At least one **active location**
3. ✅ At least one **active service**

---

## Step 1: Verify Prerequisites

### Check Staff
1. Go to `/dashboard/staff`
2. Make sure you have at least one active staff member
3. If not, click **"Add Staff"** and create one

### Check Locations
1. Go to `/dashboard/locations`
2. Make sure you have at least one active location
3. If not, click **"Add Location"** and create one

### Check Services
1. Go to `/dashboard/services`
2. Make sure you have at least one active service
3. If not, click **"Add Service"** and create one

---

## Step 2: Create Your First Shift

1. **Navigate to Shifts Page**
   - Go to `/dashboard/shifts`
   - The calendar should now display properly (with grid layout)

2. **Click "Add Shift" Button**
   - Located in the top right corner

3. **Fill Out the Shift Form**

   ### Required Fields:
   - **Staff Member**: Select a staff member from the dropdown
   - **Location**: Select a location
   - **Start Time**: Pick a date and time (e.g., tomorrow at 9:00 AM)
   - **End Time**: Pick an end time (e.g., tomorrow at 5:00 PM)
   - **Services**: Check at least one service

   ### Optional Fields:
   - **Recurring Shift**: Toggle ON if you want it to repeat
     - If recurring, select **Frequency** (Daily/Weekly/Monthly)
     - If Weekly, select which days
     - Optionally set "Repeat Until" date
   - **Max Concurrent Bookings**: Set limits per service (leave blank for unlimited)
   - **Priority**: Default is 1 (higher = more priority)
   - **Notes**: Add any notes about the shift

4. **Click "Create Shift"**
   - The shift should appear in the calendar!
   - If there are any conflicts, you'll see an alert with details

---

## Step 3: Verify the Shift Appears

After creating the shift:

1. **Check the Calendar**
   - The shift should appear as a colored block in the calendar
   - The color represents the location
   - The title shows the staff member's name

2. **Try Different Views**
   - Click the view buttons (Day/Week/Month/Year/Agenda)
   - The shift should appear in all relevant views

3. **Test Filtering**
   - Use the "All" dropdown to filter by staff member
   - The calendar should update to show only that person's shifts

---

## Example: Creating a Simple Shift

### Scenario: Morning Shift for Ultrasound Technician

```
Staff Member: Sarah Johnson
Location: Main Clinic
Start Time: 2025-10-26 09:00 AM
End Time: 2025-10-26 01:00 PM
Services: ✓ 12-Week Ultrasound, ✓ 20-Week Ultrasound
Recurring: No
Priority: 1
Notes: Regular morning shift
```

**Expected Result**: A colored block appears in the calendar on October 26 from 9 AM to 1 PM.

---

## Example: Creating a Recurring Weekly Shift

### Scenario: Weekly Schedule for Full-Time Staff

```
Staff Member: Sarah Johnson
Location: Main Clinic
Start Time: 2025-10-28 09:00 AM (Monday)
End Time: 2025-10-28 05:00 PM
Services: ✓ All Ultrasound Services
Recurring: Yes
  - Frequency: Weekly
  - Days: ✓ Monday, ✓ Tuesday, ✓ Wednesday, ✓ Thursday, ✓ Friday
  - Repeat Until: 2025-12-31
Priority: 1
Notes: Regular weekly schedule, Monday-Friday
```

**Expected Result**: Multiple shifts appear across all weeks, Monday through Friday.

---

## Troubleshooting

### "No staff members found"
→ You need to create at least one staff member first at `/dashboard/staff`

### "Shift conflicts detected"
→ The same staff member is already scheduled at that location/time. Either:
- Change the time
- Use a different staff member
- Delete the conflicting shift first

### Form won't submit
→ Make sure:
- All required fields (*) are filled
- At least one service is selected
- End time is after start time
- If recurring/weekly, at least one day is selected

### Shift doesn't appear in calendar
→ Try:
- Refreshing the page
- Switching to a different view and back
- Checking if the shift date is within the visible date range

---

## Next Steps

After successfully creating shifts:

1. ✅ Test editing a shift (click on it in the calendar)
2. ✅ Test deleting a shift
3. ✅ Test creating overlapping shifts (to see conflict detection)
4. ✅ Test recurring shifts
5. ✅ Test filtering by staff member

---

## Quick Reference: Shift Form Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| Staff Member | ✅ Yes | Dropdown | Who is working |
| Location | ✅ Yes | Dropdown | Where they're working |
| Start Time | ✅ Yes | DateTime | When shift starts |
| End Time | ✅ Yes | DateTime | When shift ends |
| Services | ✅ Yes | Checkboxes | What services can be booked |
| Recurring | No | Toggle | Does it repeat? |
| Frequency | If recurring | Dropdown | DAILY/WEEKLY/MONTHLY |
| Days of Week | If weekly | Checkboxes | Which days |
| Repeat Until | No | Date | When to stop repeating |
| Max Bookings | No | Numbers | Limit per service |
| Priority | No | Number | Overlap precedence (default: 1) |
| Notes | No | Text | Additional info |

---

**Ready to test? Go to `/dashboard/shifts` and click "Add Shift"!** 🎯

