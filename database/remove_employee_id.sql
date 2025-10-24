-- Migration: Remove employee_id column from staff table
-- This migration removes the employee_id field which is no longer needed

-- Remove the employee_id column
ALTER TABLE staff DROP COLUMN IF EXISTS employee_id;

