-- Create demo agents directly in the database (bypassing RLS)
-- This allows the app to work without authentication

-- First, ensure we have a system customer for demo purposes
INSERT INTO public.user_roles (user_id, customer_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT DO NOTHING;

-- Insert demo agents
INSERT INTO public.agents (
  id,
  name,
  customer_id,
  agent_type,
  status,
  version,
  os,
  region,
  ip_address,
  last_seen,
  uptime_seconds,
  cpu_usage,
  memory_usage,
  tasks_completed,
  auto_updates_enabled,
  certificate_fingerprint,
  signature_key_version,
  created_by,
  updated_by
) VALUES 
(
  'demo-agent-alpha-001',
  'Demo Agent Alpha',
  '00000000-0000-0000-0000-000000000001',
  'general',
  'running',
  '1.2.3',
  'ubuntu',
  'us-east-1',
  '192.168.1.100',
  now(),
  86400,
  15.5,
  85.2,
  42,
  true,
  'sha256:1234567890abcdef',
  1,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
),
(
  'demo-agent-beta-002',
  'Demo Agent Beta',
  '00000000-0000-0000-0000-000000000001',
  'data_processor',
  'idle',
  '1.2.1',
  'debian',
  'us-west-2',
  '192.168.1.101',
  now() - interval '5 minutes',
  172800,
  8.2,
  64.8,
  128,
  false,
  'sha256:fedcba0987654321',
  1,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;