# Testing Add-ons Functionality

This guide walks through testing the complete add-ons feature in the booking system.

## Prerequisites

1. **Database Setup**: Ensure migrations have been run:
   - `2025-11-11-0001_create_booking_addons.sql` (booking_addons table)
   - `service_addons` table should exist (from `database/service_addons_table.sql`)

2. **Test Data**: You need at least one service with add-ons. See "Creating Test Data" below.

## Test Plan

### 1. Test API Endpoints

#### 1.1 Test Services API Returns Add-ons

```bash
# Get all services (should include addons array)
curl http://localhost:3000/api/services | jq '.data[0].addons'

# Get specific service (should include addons)
curl http://localhost:3000/api/services/{SERVICE_ID} | jq '.data.addons'
```

**Expected Result**: 
- Services should have an `addons` array
- Each addon should have: `id`, `name`, `description`, `price`, `is_required`, `is_active`
- Only active add-ons should be returned

#### 1.2 Test Booking Creation with Add-ons

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "{SERVICE_ID}",
    "locationId": "{LOCATION_ID}",
    "staffId": "{STAFF_ID}",
    "shiftId": "{SHIFT_ID}",
    "startTime": "2025-01-15T10:00:00+01:00",
    "endTime": "2025-01-15T11:00:00+01:00",
    "priceEurCents": 5000,
    "clientEmail": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "addons": [
      {
        "addonId": "{ADDON_ID}",
        "quantity": 1,
        "priceEurCents": 1000
      }
    ]
  }'
```

**Expected Result**: 
- Booking should be created successfully
- Response should include booking ID
- Check database: `booking_addons` table should have entries

### 2. Test UI Flow

#### 2.1 Navigate to Booking Page
1. Go to `/booking`
2. Select a service that has add-ons
3. Complete Step 1 (service selection with policy fields if any)
4. Complete Step 2 (date/time selection)

#### 2.2 Test Step 3: Add-ons Selection
**Expected Behavior**:
- Step 3 should display all active add-ons for the selected service
- Each addon should show:
  - Checkbox (disabled if `is_required`)
  - Name and price
  - Description (if available)
  - "Verplicht" indicator for required add-ons
- Total price should update as add-ons are selected/deselected
- Required add-ons should be pre-checked and disabled

**Test Cases**:
1. ✅ Select optional add-on → price increases
2. ✅ Deselect optional add-on → price decreases
3. ✅ Required add-on → pre-checked, cannot be unchecked
4. ✅ No add-ons available → shows message, allows continuing
5. ✅ Total price calculation includes: service + policy extras + add-ons

#### 2.3 Test Step 4: Review & Checkout
**Expected Behavior**:
- Review should show:
  - Selected service details
  - Selected add-ons with prices
  - Policy answers (if any)
  - Total breakdown
- Checkout form should validate contact information
- On submit, booking should be created with add-ons

### 3. Test Database Persistence

#### 3.1 Verify Booking Add-ons are Saved

```sql
-- Check that booking_addons records exist
SELECT 
  ba.id,
  ba.booking_id,
  ba.addon_id,
  ba.quantity,
  ba.price_eur_cents,
  sa.name as addon_name,
  b.client_email
FROM booking_addons ba
JOIN service_addons sa ON ba.addon_id = sa.id
JOIN bookings b ON ba.booking_id = b.id
ORDER BY ba.created_at DESC
LIMIT 10;
```

**Expected Result**:
- Each selected addon should have a record in `booking_addons`
- `price_eur_cents` should match the price at booking time
- `quantity` should be correct

#### 3.2 Verify Policy Answers are Saved

```sql
-- Check policy_answers column in bookings
SELECT 
  id,
  client_email,
  policy_answers
FROM bookings
WHERE policy_answers IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result**:
- `policy_answers` should be a JSONB object with field IDs and values
- Should include any price adjustments from policy fields

## Creating Test Data

### Option 1: Using Supabase Dashboard
1. Go to Supabase Dashboard → Table Editor
2. Navigate to `service_addons` table
3. Insert a new row:
   - `service_id`: (UUID of an existing service)
   - `name`: "Extra Foto's"
   - `description`: "5 extra foto's van de echo"
   - `price`: 15.00
   - `is_required`: false
   - `is_active`: true

### Option 2: Using SQL

```sql
-- First, get a service ID
SELECT id, name FROM services WHERE is_active = true LIMIT 1;

-- Then insert add-ons (replace {SERVICE_ID} with actual UUID)
INSERT INTO service_addons (service_id, name, description, price, is_required, is_active)
VALUES 
  (
    '{SERVICE_ID}',
    'Extra Foto''s',
    '5 extra digitale foto''s van de echo',
    15.00,
    false,
    true
  ),
  (
    '{SERVICE_ID}',
    'Video Opname',
    'Video opname van de echo sessie',
    25.00,
    false,
    true
  ),
  (
    '{SERVICE_ID}',
    '3D/4D Upgrade',
    'Upgrade naar 3D/4D weergave',
    50.00,
    false,
    true
  ),
  (
    '{SERVICE_ID}',
    'Verzendkosten',
    'Verzendkosten voor fysieke foto''s',
    5.00,
    true,  -- Required addon
    true
  );
```

## Common Issues & Solutions

### Issue: API returns empty addons array
**Solution**: 
- Check that `service_addons` table has records with `is_active = true`
- Verify `service_id` matches an existing service
- Check RLS policies allow reading add-ons

### Issue: Add-ons not showing in Step 3
**Solution**:
- Check browser console for errors
- Verify service data includes `addons` array
- Check that `normalizeAddons` function is working correctly

### Issue: Booking creation fails with add-ons
**Solution**:
- Verify `booking_addons` table exists
- Check RLS policies on `booking_addons` table
- Verify addon IDs are valid UUIDs
- Check server logs for specific error messages

### Issue: Total price calculation incorrect
**Solution**:
- Verify `calculateAddonExtraPriceCents` function
- Check that addon prices are in cents (multiply by 100)
- Verify policy field prices are included
- Check `grandTotalCents` calculation

## Manual Testing Checklist

- [ ] API returns services with addons array
- [ ] Add-ons appear in Step 3 of booking flow
- [ ] Optional add-ons can be selected/deselected
- [ ] Required add-ons are pre-selected and disabled
- [ ] Total price updates when add-ons are toggled
- [ ] Review step shows selected add-ons
- [ ] Booking is created successfully with add-ons
- [ ] `booking_addons` table has correct records
- [ ] `price_eur_cents` in `booking_addons` matches booking time price
- [ ] Policy answers are saved correctly
- [ ] Total booking price includes all components

## Next Steps After Testing

Once testing is complete:
1. Surface add-ons and policy totals in admin booking views
2. Add add-ons to booking invoices/receipts
3. Add admin UI for managing service add-ons

