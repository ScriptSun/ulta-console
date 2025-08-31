-- Find and fix any views with security definer properties

-- Query to find views that might have security definer properties
-- This will help identify what needs to be fixed

-- First, let's see what views exist in the public schema
SELECT schemaname, viewname, viewowner, definition 
FROM pg_views 
WHERE schemaname = 'public';

-- Check for any security definer functions or views
SELECT proname, prosecdef 
FROM pg_proc 
WHERE prosecdef = true 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- If there are any problematic views, we'll drop and recreate them
-- without security definer properties