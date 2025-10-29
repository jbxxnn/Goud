-- Calendar Settings Table
-- Stores system-wide calendar configuration that applies to all users

CREATE TABLE IF NOT EXISTS calendar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on setting_key for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_settings_key ON calendar_settings(setting_key);

-- Insert default settings
INSERT INTO calendar_settings (setting_key, setting_value, description) VALUES
  ('badge_variant', '"colored"', 'Event badge display style (dot, colored, or mixed)'),
  ('visible_hours', '{"from": 7, "to": 18}', 'Visible hours range in the calendar'),
  ('working_hours', '{"0": {"from": 0, "to": 0}, "1": {"from": 8, "to": 17}, "2": {"from": 8, "to": 17}, "3": {"from": 8, "to": 17}, "4": {"from": 8, "to": 17}, "5": {"from": 8, "to": 17}, "6": {"from": 8, "to": 12}}', 'Working hours for each day of the week (0=Sunday, 6=Saturday)')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE calendar_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated admins can read calendar settings
CREATE POLICY "Admins can read calendar settings"
  ON calendar_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Only authenticated admins can update calendar settings
CREATE POLICY "Admins can update calendar settings"
  ON calendar_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_calendar_settings_updated_at ON calendar_settings;
CREATE TRIGGER update_calendar_settings_updated_at
  BEFORE UPDATE ON calendar_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_settings_updated_at();
