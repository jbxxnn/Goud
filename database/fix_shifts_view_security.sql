-- Fix for Security Definer View Warning on shifts_with_details
-- This script drops the existing view and recreates it with security_invoker = true
-- This ensures that RLS policies on underlying tables (shifts, staff, locations, etc.) are enforced
-- based on the querying user, not the view owner.

DROP VIEW IF EXISTS shifts_with_details;

CREATE VIEW shifts_with_details WITH (security_invoker = true) AS
SELECT 
  s.id,
  s.staff_id,
  s.location_id,
  s.start_time,
  s.end_time,
  s.recurrence_rule,
  s.is_recurring,
  s.parent_shift_id,
  s.exception_date,
  s.priority,
  s.notes,
  s.is_active,
  s.created_at,
  s.updated_at,
  
  -- Staff information
  st.first_name as staff_first_name,
  st.last_name as staff_last_name,
  st.email as staff_email,
  
  -- Location information
  l.name as location_name,
  l.address as location_address,
  
  -- Aggregated services
  COALESCE(
    json_agg(
      json_build_object(
        'id', ss.id,
        'service_id', ss.service_id,
        'service_name', srv.name,
        'max_concurrent_bookings', ss.max_concurrent_bookings
      )
    ) FILTER (WHERE ss.id IS NOT NULL),
    '[]'
  ) as services
  
FROM shifts s
INNER JOIN staff st ON s.staff_id = st.id
INNER JOIN locations l ON s.location_id = l.id
LEFT JOIN shift_services ss ON s.id = ss.shift_id
LEFT JOIN services srv ON ss.service_id = srv.id
GROUP BY 
  s.id, s.staff_id, s.location_id, s.start_time, s.end_time,
  s.recurrence_rule, s.is_recurring, s.parent_shift_id, s.exception_date,
  s.priority, s.notes, s.is_active, s.created_at, s.updated_at,
  st.first_name, st.last_name, st.email,
  l.name, l.address;

-- Grant permissions explicitly
GRANT SELECT ON shifts_with_details TO authenticated;
GRANT SELECT ON shifts_with_details TO service_role;
