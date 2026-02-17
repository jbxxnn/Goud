-- Migration to add 'assistant' role and corresponding RLS policies

-- 1. Update the check constraint on users.role if it exists
DO $$ 
BEGIN
    -- Drop the existing check constraint if it exists (name might vary, so we try to find it or just drop the common name)
    -- Assuming standard naming convention from typical Supabase/Postgres setups or previous migrations. 
    -- If created via `CHECK (role IN ('admin', ...))`, it usually has a name like `users_role_check`.
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;
    
    -- Re-add the constraint with 'assistant' included
    ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'staff', 'midwife', 'client', 'assistant'));
EXCEPTION
    WHEN undefined_object THEN
        -- If constraint doesn't exist by that name, we might just proceed or log notice
        RAISE NOTICE 'Constraint users_role_check did not exist, creating new one.';
        ALTER TABLE users ADD CONSTRAINT users_role_check 
            CHECK (role IN ('admin', 'staff', 'midwife', 'client', 'assistant'));
END $$;

-- 2. Update RLS Policies for 'assistant' role
-- The assistant should have similar permissions to 'admin' for most operational tables.

-- Helper function to check if user is admin OR assistant
CREATE OR REPLACE FUNCTION is_admin_or_assistant()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'assistant')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Services Policies
DROP POLICY IF EXISTS "Allow all for admins on services" ON services;
CREATE POLICY "Allow all for admins and assistants on services"
ON services FOR ALL
USING (is_admin_or_assistant());

-- Update Locations Policies
DROP POLICY IF EXISTS "Allow all for admins on locations" ON locations;
CREATE POLICY "Allow all for admins and assistants on locations"
ON locations FOR ALL
USING (is_admin_or_assistant());

-- Update Staff Policies
DROP POLICY IF EXISTS "Allow all for admins on staff" ON staff;
CREATE POLICY "Allow all for admins and assistants on staff"
ON staff FOR ALL
USING (is_admin_or_assistant());

-- Update Midwives Policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'midwives') THEN
        DROP POLICY IF EXISTS "Allow all for admins on midwives" ON midwives;
        EXECUTE 'CREATE POLICY "Allow all for admins and assistants on midwives" ON midwives FOR ALL USING (is_admin_or_assistant())';
    END IF;
END $$;

-- Update Shifts Policies
DROP POLICY IF EXISTS "Allow all for admins on shifts" ON shifts;
CREATE POLICY "Allow all for admins and assistants on shifts"
ON shifts FOR ALL
USING (is_admin_or_assistant());

-- Update Bookings Policies
DROP POLICY IF EXISTS "Allow all for admins on bookings" ON bookings;
CREATE POLICY "Allow all for admins and assistants on bookings"
ON bookings FOR ALL
USING (is_admin_or_assistant());

-- Update Users Policies (for managing clients/staff users)
-- Generally admins can view/edit all users. Assistants should too.
DROP POLICY IF EXISTS "Allow all for admins on users" ON users;
CREATE POLICY "Allow all for admins and assistants on users"
ON users FOR ALL
USING (is_admin_or_assistant());

-- Update Staff Recurring Breaks Policies
DROP POLICY IF EXISTS "Allow all for admins on staff_recurring_breaks" ON staff_recurring_breaks;
CREATE POLICY "Allow all for admins and assistants on staff_recurring_breaks"
ON staff_recurring_breaks FOR ALL
USING (is_admin_or_assistant());

-- Update Staff Services Policies
DROP POLICY IF EXISTS "Allow all for admins on staff_services" ON staff_services;
CREATE POLICY "Allow all for admins and assistants on staff_services"
ON staff_services FOR ALL
USING (is_admin_or_assistant());

-- Update Staff Locations Policies
DROP POLICY IF EXISTS "Allow all for admins on staff_locations" ON staff_locations;
CREATE POLICY "Allow all for admins and assistants on staff_locations"
ON staff_locations FOR ALL
USING (is_admin_or_assistant());

-- Update Booking Notes Policies
DROP POLICY IF EXISTS "Allow all for admins on booking_notes" ON booking_notes;
CREATE POLICY "Allow all for admins and assistants on booking_notes"
ON booking_notes FOR ALL
USING (is_admin_or_assistant());

-- Update Booking Addons Policies
DROP POLICY IF EXISTS "Allow all for admins on booking_addons" ON booking_addons;
CREATE POLICY "Allow all for admins and assistants on booking_addons"
ON booking_addons FOR ALL
USING (is_admin_or_assistant());

-- Update Booking Checklist Items Policies
DROP POLICY IF EXISTS "Allow all for admins on booking_checklist_items" ON booking_checklist_items;
CREATE POLICY "Allow all for admins and assistants on booking_checklist_items"
ON booking_checklist_items FOR ALL
USING (is_admin_or_assistant());
