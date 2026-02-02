-- Fix for Security Definer View Warning
-- This script drops the existing view and recreates it with security_invoker = true
-- This ensures that RLS policies on underlying tables (staff, users, etc.) are enforced
-- based on the querying user, not the view owner.

DROP VIEW IF EXISTS staff_with_details;

CREATE VIEW staff_with_details WITH (security_invoker = true) AS
SELECT 
    s.*,
    u.email as user_email,
    u.role as user_role,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'id', l.id,
                'name', l.name,
                'address', l.address,
                'is_primary', sl.is_primary
            )
        ) FILTER (WHERE l.id IS NOT NULL),
        '[]'::json
    ) as locations,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'id', svc.id,
                'name', svc.name,
                'duration', svc.duration,
                'is_qualified', ss.is_qualified,
                'qualification_date', ss.qualification_date
            )
        ) FILTER (WHERE svc.id IS NOT NULL),
        '[]'::json
    ) as services
FROM staff s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN staff_locations sl ON s.id = sl.staff_id
LEFT JOIN locations l ON sl.location_id = l.id
LEFT JOIN staff_services ss ON s.id = ss.staff_id
LEFT JOIN services svc ON ss.service_id = svc.id
GROUP BY s.id, u.email, u.role;

-- Grant permissions explicitly
GRANT SELECT ON staff_with_details TO authenticated;
GRANT SELECT ON staff_with_details TO service_role;
