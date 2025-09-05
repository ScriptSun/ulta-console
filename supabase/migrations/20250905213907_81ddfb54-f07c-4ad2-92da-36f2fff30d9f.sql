-- Activate all draft email templates to enable testing
UPDATE event_email_templates 
SET status = 'active', updated_at = now() 
WHERE status = 'draft' AND customer_id = '00000000-0000-0000-0000-000000000001';