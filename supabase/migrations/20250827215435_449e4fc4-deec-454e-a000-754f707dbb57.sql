-- Insert demo agents for testing
INSERT INTO public.agents (
  id,
  customer_id,
  name,
  created_by,
  updated_by,
  status,
  agent_type,
  os,
  version,
  ip_address,
  region,
  last_seen,
  uptime_seconds,
  cpu_usage,
  memory_usage,
  tasks_completed,
  certificate_fingerprint
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Production Web Server',
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  'online',
  'web',
  'linux',
  '2.1.0',
  '192.168.1.100',
  'us-east-1',
  NOW() - INTERVAL '2 minutes',
  3600,
  15.5,
  68.2,
  142,
  'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567'
),
(
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  'Database Server',
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  'online',
  'database',
  'linux',
  '2.0.8',
  '192.168.1.101',
  'us-east-1',
  NOW() - INTERVAL '5 minutes',
  7200,
  32.1,
  82.5,
  89,
  'def456ghi789jkl012mno345pqr678stu901vwx234yz567abc123'
),
(
  '55555555-5555-5555-5555-555555555555',
  '22222222-2222-2222-2222-222222222222',
  'Backup Agent',
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  'offline',
  'backup',
  'windows',
  '1.9.5',
  '192.168.1.102',
  'us-west-2',
  NOW() - INTERVAL '25 minutes',
  14400,
  8.3,
  45.1,
  256,
  'ghi789jkl012mno345pqr678stu901vwx234yz567abc123def456'
);

-- Create a demo customer and user role to ensure visibility
INSERT INTO public.user_roles (
  id,
  user_id,
  customer_id,
  role
) VALUES (
  '77777777-7777-7777-7777-777777777777',
  '00000000-0000-0000-0000-000000000000'::uuid,
  '22222222-2222-2222-2222-222222222222',
  'admin'
) ON CONFLICT DO NOTHING;