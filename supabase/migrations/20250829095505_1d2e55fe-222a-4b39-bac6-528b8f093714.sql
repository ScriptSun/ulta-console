-- Add key column to script_batches table
ALTER TABLE script_batches ADD COLUMN IF NOT EXISTS key text;

-- Add a unique constraint to ensure keys are unique within a customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_script_batches_customer_key 
ON script_batches (customer_id, key) 
WHERE key IS NOT NULL;

-- Update existing batches with appropriate keys
UPDATE script_batches 
SET key = CASE 
  WHEN name = 'Install n8n Workflow Automation' THEN 'install_n8n_automation'
  WHEN name = 'Upgrade PHP Version' THEN 'upgrade_php_version'
  WHEN name = 'Install Docker and Docker Compose' THEN 'install_docker_compose'
  WHEN name = 'Setup SSL Certificate with Let''s Encrypt' THEN 'setup_ssl_letsencrypt'
  WHEN name = 'Install and Configure Redis Cache' THEN 'install_redis_cache'
  WHEN name = 'System Security Hardening' THEN 'system_security_hardening'
  WHEN name = 'Install Node.js and PM2' THEN 'install_nodejs_pm2'
  WHEN name = 'WordPress Installer' THEN 'wordpress_installer'
  WHEN name = 'Database Backup Script' THEN 'database_backup_script'
  WHEN name = 'Security Audit Tool' THEN 'security_audit_tool'
  WHEN name = 'System Health Check' THEN 'system_health_check'
  ELSE lower(replace(replace(replace(name, ' ', '_'), '.', '_'), '-', '_'))
END
WHERE key IS NULL;