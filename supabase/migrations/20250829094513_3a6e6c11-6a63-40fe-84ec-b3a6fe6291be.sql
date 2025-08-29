-- Insert popular server management batches for demonstration
INSERT INTO public.script_batches (
  id, 
  customer_id, 
  name, 
  os_targets, 
  risk, 
  max_timeout_sec, 
  active_version, 
  auto_version, 
  per_agent_concurrency, 
  per_tenant_concurrency, 
  preflight, 
  inputs_schema, 
  inputs_defaults, 
  created_by, 
  updated_by
) VALUES 
(
  '01000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001', -- System batches available to all tenants
  'Install n8n Workflow Automation',
  ARRAY['ubuntu', 'debian', 'centos'],
  'medium',
  1800, -- 30 minutes
  1,
  false,
  1,
  2,
  jsonb_build_object(
    'checks', jsonb_build_array(
      jsonb_build_object('type', 'min_disk', 'min_free_gb', 5),
      jsonb_build_object('type', 'max_memory', 'max_percent', 80),
      jsonb_build_object('type', 'require_open_ports_free', 'port', 5678)
    )
  ),
  jsonb_build_object(
    'type', 'object',
    'required', jsonb_build_array('domain', 'admin_email'),
    'properties', jsonb_build_object(
      'domain', jsonb_build_object(
        'type', 'string',
        'description', 'Domain name for n8n instance',
        'format', 'hostname'
      ),
      'admin_email', jsonb_build_object(
        'type', 'string',
        'description', 'Administrator email for n8n setup',
        'format', 'email'
      ),
      'enable_ssl', jsonb_build_object(
        'type', 'boolean',
        'description', 'Enable SSL certificate via Let''s Encrypt',
        'default', true
      )
    ),
    'additionalProperties', false
  ),
  jsonb_build_object(
    'domain', 'n8n.example.com',
    'admin_email', 'admin@example.com',
    'enable_ssl', true
  ),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
),
(
  '02000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Upgrade PHP Version',
  ARRAY['ubuntu', 'debian'],
  'high',
  900, -- 15 minutes
  1,
  false,
  1,
  3,
  jsonb_build_object(
    'checks', jsonb_build_array(
      jsonb_build_object('type', 'min_disk', 'min_free_gb', 2),
      jsonb_build_object('type', 'max_cpu', 'max_percent', 70)
    )
  ),
  jsonb_build_object(
    'type', 'object',
    'required', jsonb_build_array('target_version'),
    'properties', jsonb_build_object(
      'target_version', jsonb_build_object(
        'type', 'string',
        'description', 'Target PHP version to upgrade to',
        'enum', jsonb_build_array('8.1', '8.2', '8.3'),
        'default', '8.2'
      ),
      'backup_config', jsonb_build_object(
        'type', 'boolean',
        'description', 'Create backup of PHP configuration files',
        'default', true
      ),
      'restart_services', jsonb_build_object(
        'type', 'boolean',
        'description', 'Restart web server and PHP-FPM after upgrade',
        'default', true
      )
    ),
    'additionalProperties', false
  ),
  jsonb_build_object(
    'target_version', '8.2',
    'backup_config', true,
    'restart_services', true
  ),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
),
(
  '03000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Install Docker and Docker Compose',
  ARRAY['ubuntu', 'debian', 'centos', 'almalinux'],
  'medium',
  1200, -- 20 minutes
  1,
  false,
  1,
  5,
  jsonb_build_object(
    'checks', jsonb_build_array(
      jsonb_build_object('type', 'min_disk', 'min_free_gb', 10),
      jsonb_build_object('type', 'max_memory', 'max_percent', 85)
    )
  ),
  jsonb_build_object(
    'type', 'object',
    'required', jsonb_build_array(),
    'properties', jsonb_build_object(
      'docker_compose_version', jsonb_build_object(
        'type', 'string',
        'description', 'Docker Compose version to install',
        'default', 'latest'
      ),
      'add_user_to_docker_group', jsonb_build_object(
        'type', 'boolean',
        'description', 'Add current user to docker group',
        'default', true
      ),
      'enable_docker_service', jsonb_build_object(
        'type', 'boolean',
        'description', 'Enable Docker service on boot',
        'default', true
      )
    ),
    'additionalProperties', false
  ),
  jsonb_build_object(
    'docker_compose_version', 'latest',
    'add_user_to_docker_group', true,
    'enable_docker_service', true
  ),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
),
(
  '04000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'Setup SSL Certificate with Let''s Encrypt',
  ARRAY['ubuntu', 'debian', 'centos'],
  'low',
  600, -- 10 minutes
  1,
  false,
  1,
  3,
  jsonb_build_object(
    'checks', jsonb_build_array(
      jsonb_build_object('type', 'require_ports_open', 'port', 80),
      jsonb_build_object('type', 'require_ports_open', 'port', 443)
    )
  ),
  jsonb_build_object(
    'type', 'object',
    'required', jsonb_build_array('domain', 'email'),
    'properties', jsonb_build_object(
      'domain', jsonb_build_object(
        'type', 'string',
        'description', 'Domain name for SSL certificate',
        'format', 'hostname'
      ),
      'email', jsonb_build_object(
        'type', 'string',
        'description', 'Email for Let''s Encrypt registration',
        'format', 'email'
      ),
      'webserver', jsonb_build_object(
        'type', 'string',
        'description', 'Web server to configure',
        'enum', jsonb_build_array('nginx', 'apache2'),
        'default', 'nginx'
      ),
      'auto_renew', jsonb_build_object(
        'type', 'boolean',
        'description', 'Setup automatic certificate renewal',
        'default', true
      )
    ),
    'additionalProperties', false
  ),
  jsonb_build_object(
    'domain', 'example.com',
    'email', 'admin@example.com',
    'webserver', 'nginx',
    'auto_renew', true
  ),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
),
(
  '05000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'Install and Configure Redis Cache',
  ARRAY['ubuntu', 'debian', 'centos'],
  'low',
  600, -- 10 minutes
  1,
  false,
  1,
  3,
  jsonb_build_object(
    'checks', jsonb_build_array(
      jsonb_build_object('type', 'min_disk', 'min_free_gb', 1),
      jsonb_build_object('type', 'max_memory', 'max_percent', 70),
      jsonb_build_object('type', 'require_open_ports_free', 'port', 6379)
    )
  ),
  jsonb_build_object(
    'type', 'object',
    'required', jsonb_build_array(),
    'properties', jsonb_build_object(
      'max_memory', jsonb_build_object(
        'type', 'string',
        'description', 'Maximum memory for Redis (e.g., 256mb, 1gb)',
        'default', '256mb'
      ),
      'enable_persistence', jsonb_build_object(
        'type', 'boolean',
        'description', 'Enable Redis data persistence',
        'default', true
      ),
      'bind_localhost_only', jsonb_build_object(
        'type', 'boolean',
        'description', 'Bind Redis to localhost only for security',
        'default', true
      ),
      'set_password', jsonb_build_object(
        'type', 'boolean',
        'description', 'Set a random password for Redis',
        'default', true
      )
    ),
    'additionalProperties', false
  ),
  jsonb_build_object(
    'max_memory', '256mb',
    'enable_persistence', true,
    'bind_localhost_only', true,
    'set_password', true
  ),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
),
(
  '06000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'System Security Hardening',
  ARRAY['ubuntu', 'debian', 'centos'],
  'high',
  1800, -- 30 minutes
  1,
  false,
  1,
  1, -- Only one at a time due to security nature
  jsonb_build_object(
    'checks', jsonb_build_array(
      jsonb_build_object('type', 'min_uptime', 'min_seconds', 300)
    )
  ),
  jsonb_build_object(
    'type', 'object',
    'required', jsonb_build_array(),
    'properties', jsonb_build_object(
      'setup_firewall', jsonb_build_object(
        'type', 'boolean',
        'description', 'Configure UFW firewall with basic rules',
        'default', true
      ),
      'disable_root_ssh', jsonb_build_object(
        'type', 'boolean',
        'description', 'Disable root SSH login for security',
        'default', true
      ),
      'setup_fail2ban', jsonb_build_object(
        'type', 'boolean',
        'description', 'Install and configure Fail2Ban',
        'default', true
      ),
      'update_system', jsonb_build_object(
        'type', 'boolean',
        'description', 'Update system packages before hardening',
        'default', true
      ),
      'ssh_port', jsonb_build_object(
        'type', 'integer',
        'description', 'Custom SSH port (leave empty to keep default)',
        'minimum', 1024,
        'maximum', 65535
      )
    ),
    'additionalProperties', false
  ),
  jsonb_build_object(
    'setup_firewall', true,
    'disable_root_ssh', true,
    'setup_fail2ban', true,
    'update_system', true
  ),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
),
(
  '07000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'Install Node.js and PM2',
  ARRAY['ubuntu', 'debian', 'centos'],
  'low',
  900, -- 15 minutes
  1,
  false,
  1,
  3,
  jsonb_build_object(
    'checks', jsonb_build_array(
      jsonb_build_object('type', 'min_disk', 'min_free_gb', 3),
      jsonb_build_object('type', 'max_cpu', 'max_percent', 70)
    )
  ),
  jsonb_build_object(
    'type', 'object',
    'required', jsonb_build_array(),
    'properties', jsonb_build_object(
      'node_version', jsonb_build_object(
        'type', 'string',
        'description', 'Node.js version to install',
        'enum', jsonb_build_array('18', '20', '21', 'lts'),
        'default', 'lts'
      ),
      'install_pm2', jsonb_build_object(
        'type', 'boolean',
        'description', 'Install PM2 process manager',
        'default', true
      ),
      'setup_pm2_startup', jsonb_build_object(
        'type', 'boolean',
        'description', 'Configure PM2 to start on system boot',
        'default', true
      ),
      'install_yarn', jsonb_build_object(
        'type', 'boolean',
        'description', 'Install Yarn package manager',
        'default', false
      )
    ),
    'additionalProperties', false
  ),
  jsonb_build_object(
    'node_version', 'lts',
    'install_pm2', true,
    'setup_pm2_startup', true,
    'install_yarn', false
  ),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
);

-- Insert corresponding batch versions for each batch
INSERT INTO public.script_batch_versions (
  batch_id,
  version,
  sha256,
  source,
  size_bytes,
  status,
  notes,
  created_by
) VALUES 
('01000000-0000-0000-0000-000000000001', 1, '66d54b5717e9d4bcc3e8a0578e570cbfb3ea1ade7f0efa7d73951bfd23837d76', 'system', 2048, 'active', 'Initial n8n installer script', '00000000-0000-0000-0000-000000000001'),
('02000000-0000-0000-0000-000000000002', 1, '77e65c6828fa5e5dd4f9b1689e681def4c6fb2be8e1fed8e84a62cfe34948e87', 'system', 1536, 'active', 'PHP version upgrade script with backup', '00000000-0000-0000-0000-000000000001'),
('03000000-0000-0000-0000-000000000003', 1, '88f76d7939fb6f6ee5fa2789af792e0f5d7fc3cf9f2fee9f95b73dff45a59f98', 'system', 1792, 'active', 'Docker and Docker Compose installation', '00000000-0000-0000-0000-000000000001'),
('04000000-0000-0000-0000-000000000004', 1, '99087e8a40fc7f7ff6f387a0b08a3f1f6e8fd4d0a03fea0a06c84e005b6a00a9', 'system', 1280, 'active', 'Let''s Encrypt SSL certificate setup', '00000000-0000-0000-0000-000000000001'),
('05000000-0000-0000-0000-000000000005', 1, 'aa198f9b51fd8f8007f498b1c19b4f2f7f9fe5e1b14feb1b17d95f116c7b11ba', 'system', 1024, 'active', 'Redis cache server installation and config', '00000000-0000-0000-0000-000000000001'),
('06000000-0000-0000-0000-000000000006', 1, 'bb2a90ac62fe9f9118f5a9c2d2ac5f3f80afe6f2c25fec2c28ea60227d8c22cb', 'system', 3072, 'active', 'Comprehensive security hardening script', '00000000-0000-0000-0000-000000000001'),
('07000000-0000-0000-0000-000000000007', 1, 'cc3ba1bd73fd0a0229f6bac3e3bd6f40901fe703d36fed3d39fb71338e9d33dc', 'system', 1664, 'active', 'Node.js and PM2 setup script', '00000000-0000-0000-0000-000000000001');