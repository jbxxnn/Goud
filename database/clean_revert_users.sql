-- Clean up and revert users table properly
-- Run this script to fix everything

-- 1. Delete any users that don't have corresponding auth records
DELETE FROM users 
WHERE id NOT IN (SELECT id FROM auth.users);

-- 2. Drop the current trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Drop the current function
DROP FUNCTION IF EXISTS handle_new_user();

-- 4. Remove the default value from id column
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;

-- 5. Make sure id is NOT NULL
ALTER TABLE users ALTER COLUMN id SET NOT NULL;

-- 6. Drop and recreate the foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE users ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. Recreate the original trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, first_name, last_name, role, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
