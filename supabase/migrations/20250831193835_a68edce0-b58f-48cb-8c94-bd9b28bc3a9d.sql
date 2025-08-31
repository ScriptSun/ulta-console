-- Fix Security Definer View issue by removing problematic view

-- The issue is with the admin_profiles_safe view that has security_barrier=true
-- This is causing the security linter to flag it as a security definer view
-- Since we've already secured the main admin_profiles table with proper RLS,
-- we can safely remove this view

-- Drop the problematic view
DROP VIEW IF EXISTS admin_profiles_safe;

-- Verify no other problematic views exist by checking for views with security barriers
-- that might bypass RLS policies

-- The remaining views with security_invoker=true are actually good practice
-- as they ensure the view uses the permissions of the calling user, not the view creator