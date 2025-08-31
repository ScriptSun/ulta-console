-- Check for views with security definer properties and other security issues

-- Check for views that might be problematic
SELECT 
  schemaname, 
  viewname, 
  viewowner,
  definition
FROM pg_views 
WHERE schemaname = 'public'
  AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%');

-- Also check pg_class for views with special options
SELECT 
  n.nspname as schema_name,
  c.relname as view_name,
  c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v' -- views
  AND n.nspname = 'public'
  AND c.reloptions IS NOT NULL;

-- Check for functions that might be creating problematic views
SELECT 
  p.proname,
  p.prosrc
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosrc ILIKE '%create%view%'
  AND (p.prosrc ILIKE '%security definer%' OR p.prosrc ILIKE '%security_definer%');