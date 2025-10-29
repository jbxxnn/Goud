# Service Toggle UI Feature

## Overview

The shift creation form now includes a toggle to show/hide the services list. By default, all qualified services are auto-selected but hidden, keeping the form clean and simple. Users can toggle to view and customize which services are available.

## User Experience

### Default State (Services Hidden)

When staff is selected, services are auto-checked but the list is collapsed:

```
┌────────────────────────────────────────────┐
│ Services *          [Toggle] Customize     │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ 3 services selected • All staff         ││
│ │ services included                       ││
│ │                                         ││
│ │ Toggle "Customize services" to view    ││
│ │ and modify                              ││
│ └─────────────────────────────────────────┘│
└────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Clean, simple interface
- ✅ All services auto-selected
- ✅ Quick shift creation
- ✅ Minimal scrolling needed

### Expanded State (Services Visible)

When toggle is ON, full services list appears:

```
┌────────────────────────────────────────────┐
│ Services *          [Toggle ON] Customize  │
│                                             │
│ ℹ️ Showing 3 of 3 services selected        │
│                                             │
│ ✅ 12-Week Ultrasound                      │
│    [Max bookings: ___]                     │
│ ✅ 20-Week Ultrasound                      │
│    [Max bookings: ___]                     │
│ ✅ 3D/4D Imaging                           │
│    [Max bookings: ___]                     │
└────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Full control over services
- ✅ Can uncheck services
- ✅ Can set max bookings per service
- ✅ Clear visibility of selections

## How It Works

### Flow

```
1. User selects staff member
   ↓
2. All staff services auto-checked (hidden)
   ↓
3. Summary shows: "3 services selected"
   ↓
4. User toggles "Customize services" ON
   ↓
5. Services list expands
   ↓
6. User can uncheck/modify services
   ↓
7. User toggles OFF (optional)
   ↓
8. List collapses, shows summary
```

### States

**State 1: No Staff Selected**
- Services section: "Select a staff member first"
- Toggle: Hidden
- List: Hidden

**State 2: Staff Selected, Toggle OFF (Default)**
- Services section: Summary box
- Toggle: Visible, OFF
- List: Hidden
- Summary: "X services selected • All staff services included"

**State 3: Staff Selected, Toggle ON**
- Services section: Full list
- Toggle: Visible, ON
- List: Visible with all services checked
- Can uncheck/modify

**State 4: Staff with No Qualifications**
- Services section: Warning message
- Toggle: Hidden
- List: Hidden

## Implementation Details

### State Management

```typescript
const [showServices, setShowServices] = useState(false);

// Reset when dialog closes
useEffect(() => {
  if (!isOpen) {
    setShowServices(false);
  }
}, [isOpen]);
```

### Toggle Component

```typescript
<Switch
  id="show-services"
  checked={showServices}
  onCheckedChange={setShowServices}
/>
<Label htmlFor="show-services">
  Customize services
</Label>
```

### Conditional Rendering

```typescript
{/* Hidden state - show summary */}
{!showServices && watch('staff_id') && filteredServices.length > 0 && (
  <div className="border rounded-lg p-3 bg-muted/30">
    <div>
      {selectedServices.length} services selected
    </div>
    <p>Toggle "Customize services" to view and modify</p>
  </div>
)}

{/* Visible state - show full list */}
{showServices && (
  <div>
    {/* Services checkboxes */}
  </div>
)}
```

## Use Cases

### Use Case 1: Quick Shift Creation (Default)

**Scenario:** Create a standard shift with all services

**Steps:**
1. Select staff: "Sarah Johnson"
2. Select location: "Main Clinic"
3. Set time: 9 AM - 5 PM
4. **Skip services** (all auto-selected)
5. Click "Create Shift"

**Result:** Shift created with all 3 of Sarah's services ✅

### Use Case 2: Custom Service Selection

**Scenario:** Create a shift with specific services only

**Steps:**
1. Select staff: "Sarah Johnson"
2. Toggle "Customize services" ON
3. Uncheck "3D/4D Imaging"
4. Keep "12-Week" and "20-Week" checked
5. Toggle OFF (optional)
6. Click "Create Shift"

**Result:** Shift created with 2 services ✅

### Use Case 3: Set Max Bookings

**Scenario:** Limit concurrent bookings for specific services

**Steps:**
1. Select staff: "Sarah Johnson"
2. Toggle "Customize services" ON
3. Set max bookings:
   - 12-Week: 4
   - 20-Week: 3
   - 3D/4D: 2
4. Toggle OFF (optional)
5. Click "Create Shift"

**Result:** Shift created with booking limits ✅

## Visual Design

### Collapsed State Design

```
┌─────────────────────────────────────┐
│ 🔘 3 services selected              │
│ • All staff services included       │
│                                     │
│ ℹ️ Toggle to customize              │
└─────────────────────────────────────┘
```

**Design Features:**
- Subtle background color (muted/30)
- Clear count of selected services
- Informative text
- Compact layout

### Expanded State Design

```
┌─────────────────────────────────────┐
│ ℹ️ Showing 3 of 3 services selected │
│                                     │
│ ✅ Service 1                        │
│ ✅ Service 2                        │
│ ✅ Service 3                        │
└─────────────────────────────────────┘
```

**Design Features:**
- Scrollable list (max-height: 192px)
- Checkboxes for selection
- Max bookings input per service
- Clear count at top

## Benefits

### For Users

**Faster Workflow:**
- ✅ No need to click through services
- ✅ Default selection works for most cases
- ✅ Reduced form complexity

**Flexibility:**
- ✅ Can customize when needed
- ✅ Toggle on/off as desired
- ✅ Clear visibility of selections

**Better UX:**
- ✅ Clean, uncluttered interface
- ✅ Progressive disclosure (show only when needed)
- ✅ Less scrolling required

### For Development

**Better Performance:**
- ✅ Renders fewer DOM elements by default
- ✅ Only expands when needed
- ✅ Faster initial render

**Maintainability:**
- ✅ Clear state management
- ✅ Simple toggle logic
- ✅ Easy to enhance

## Comparison

### Before (Always Visible)

**Pros:**
- All services immediately visible
- No extra click needed

**Cons:**
- Form feels long/cluttered
- Lots of scrolling
- Overwhelming for quick shifts
- Can't see other fields easily

### After (Toggle-able)

**Pros:**
- ✅ Clean, compact form
- ✅ Minimal scrolling
- ✅ Fast for standard shifts
- ✅ Still customizable when needed

**Cons:**
- Extra click to view services (but most users won't need to)

## Edge Cases Handled

### 1. Staff with No Services
- Toggle is hidden
- Shows warning message
- Cannot create shift

### 2. Single Service Staff
- Shows "1 service selected"
- Toggle works normally
- Can't uncheck last service (validation)

### 3. Changing Staff
- Toggle resets to OFF
- New staff's services auto-selected
- Previous customizations cleared

### 4. Dialog Close/Reopen
- Toggle resets to OFF
- Fresh state each time
- No stale customizations

## Keyboard Accessibility

The toggle is fully keyboard accessible:

- **Tab**: Focus toggle
- **Space/Enter**: Toggle on/off
- **Tab**: Navigate to next field

## Testing Checklist

- [x] Toggle starts as OFF when staff selected
- [x] Clicking toggle shows services list
- [x] Clicking toggle again hides services list
- [x] Summary shows correct count
- [x] Services are checked when list shown
- [x] Can uncheck/recheck services
- [x] Toggle resets when dialog closes
- [x] Toggle resets when staff changes
- [x] Toggle hidden when no staff selected
- [x] Toggle hidden when staff has no services
- [ ] Keyboard navigation works
- [ ] Screen reader announces toggle state

## Future Enhancements

1. **Remember Last State**
   - Save toggle preference per user
   - Auto-expand if user always customizes

2. **Service Templates**
   - Quick-select common combinations
   - "Morning Services", "Full Service", etc.

3. **Inline Edit Summary**
   - Click count to quick-toggle specific services
   - Edit without full expansion

4. **Smart Suggestions**
   - Highlight frequently unchecked services
   - Suggest based on time of day

---

**Summary**: Services are now hidden by default with all staff services auto-selected. Users can toggle to view and customize when needed, keeping the form clean and workflow fast.

