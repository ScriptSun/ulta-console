-- Add preflight column to script_batches for preflight checks configuration
ALTER TABLE public.script_batches 
ADD COLUMN preflight jsonb DEFAULT '{}'::jsonb;

-- Insert WordPress Install batch with specified configuration
INSERT INTO public.script_batches (
  customer_id,
  name,
  os_targets,
  risk,
  max_timeout_sec,
  per_agent_concurrency,
  per_tenant_concurrency,
  inputs_schema,
  inputs_defaults,
  preflight,
  created_by,
  updated_by
) VALUES (
  '22222222-2222-2222-2222-222222222222', -- Default Customer
  'WordPress Install',
  ARRAY['ubuntu', 'almalinux'],
  'medium',
  1800, -- 30 minutes timeout for WordPress installation
  1, -- per_agent_concurrency
  10, -- per_tenant_concurrency
  '{
    "type": "object",
    "required": ["domain", "admin_email", "db_name", "db_user", "db_pass", "php_version"],
    "properties": {
      "domain": {
        "type": "string",
        "title": "Domain",
        "description": "Fully qualified domain name for the WordPress site",
        "pattern": "^([a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?\\.)+(([a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?\\.))*[a-zA-Z]{2,}$",
        "examples": ["example.com", "blog.mysite.org", "wordpress.demo.app"]
      },
      "admin_email": {
        "type": "string",
        "format": "email",
        "title": "Admin Email",
        "description": "Administrator email address for WordPress",
        "examples": ["admin@example.com", "webmaster@mysite.org"]
      },
      "db_name": {
        "type": "string",
        "title": "Database Name",
        "description": "MySQL database name for WordPress",
        "pattern": "^[a-zA-Z0-9_]+$",
        "minLength": 1,
        "maxLength": 64,
        "examples": ["wordpress", "wp_blog", "site_db"]
      },
      "db_user": {
        "type": "string",
        "title": "Database User",
        "description": "MySQL username for WordPress database access",
        "pattern": "^[a-zA-Z0-9_]+$",
        "minLength": 1,
        "maxLength": 32,
        "examples": ["wpuser", "dbadmin", "webapp"]
      },
      "db_pass": {
        "type": "string",
        "format": "password",
        "title": "Database Password",
        "description": "MySQL password for WordPress database user",
        "minLength": 8,
        "maxLength": 64
      },
      "php_version": {
        "type": "string",
        "title": "PHP Version",
        "description": "PHP version to install and configure",
        "enum": ["8.1", "8.2", "8.3"],
        "default": "8.2"
      }
    }
  }'::jsonb,
  '{
    "domain": "example.com",
    "admin_email": "admin@example.com", 
    "db_name": "wordpress",
    "db_user": "wpuser",
    "db_pass": "",
    "php_version": "8.2"
  }'::jsonb,
  '{
    "checks": [
      {
        "type": "min_ram_mb",
        "value": 2048,
        "description": "Minimum 2GB RAM required for WordPress installation"
      },
      {
        "type": "min_disk_free_gb", 
        "mount": "/",
        "value": 5,
        "description": "Minimum 5GB free disk space required on root filesystem"
      },
      {
        "type": "require_package_manager",
        "ubuntu": "apt",
        "almalinux": "dnf",
        "description": "Package manager must be available for OS"
      }
    ]
  }'::jsonb,
  '22222222-2222-2222-2222-222222222222', -- created_by (system user)
  '22222222-2222-2222-2222-222222222222'  -- updated_by (system user)
)
ON CONFLICT (customer_id, name) DO UPDATE SET
  os_targets = EXCLUDED.os_targets,
  risk = EXCLUDED.risk,
  max_timeout_sec = EXCLUDED.max_timeout_sec,
  per_agent_concurrency = EXCLUDED.per_agent_concurrency,
  per_tenant_concurrency = EXCLUDED.per_tenant_concurrency,
  inputs_schema = EXCLUDED.inputs_schema,
  inputs_defaults = EXCLUDED.inputs_defaults,
  preflight = EXCLUDED.preflight,
  updated_by = EXCLUDED.updated_by,
  updated_at = now();

-- Add comment to document the expected exit contract format
COMMENT ON COLUMN public.script_batches.preflight IS 'Preflight checks configuration - scripts should print final JSON: {"ultaai_contract":{"status":"ok","message":"WordPress installed","metrics":{"duration_sec":<n>}}}';