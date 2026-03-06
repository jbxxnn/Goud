-- Migration to add hidden_checkout_fields to services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS hidden_checkout_fields text[] DEFAULT '{}';
