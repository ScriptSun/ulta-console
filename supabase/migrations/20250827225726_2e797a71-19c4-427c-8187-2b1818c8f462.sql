-- Add hostname column to agents table
ALTER TABLE public.agents ADD COLUMN hostname text;

-- Insert 6 additional agents with varied statuses and realistic data
INSERT INTO public.agents (
  customer_id,
  hostname,
  agent_type,
  status,
  version,
  os,
  region,
  ip_address,
  uptime_seconds,
  cpu_usage,
  memory_usage,
  tasks_completed,
  certificate_fingerprint,
  last_seen
) VALUES
-- Agent 1: Error status
(
  '22222222-2222-2222-2222-222222222222',
  'srv-web-01.ultahost.com',
  'web-server',
  'error',
  '2.1.4',
  'ubuntu',
  'us-east-1',
  '10.0.1.101'::inet,
  14400,
  15.2,
  45.8,
  127,
  'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
  now() - interval '2 minutes'
),
-- Agent 2: Running status
(
  '22222222-2222-2222-2222-222222222222',
  'srv-api-02.ultahost.com',
  'api-server',
  'running',
  '2.1.5',
  'debian',
  'us-west-2',
  '10.0.2.102'::inet,
  86400,
  28.7,
  62.3,
  445,
  'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3',
  now() - interval '30 seconds'
),
-- Agent 3: Running status
(
  '22222222-2222-2222-2222-222222222222',
  'srv-db-01.ultahost.com',
  'database',
  'running',
  '2.1.3',
  'centos',
  'eu-west-1',
  '10.0.3.103'::inet,
  172800,
  42.1,
  78.9,
  892,
  'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4',
  now() - interval '15 seconds'
),
-- Agent 4: Running status
(
  '22222222-2222-2222-2222-222222222222',
  'srv-cache-01.ultahost.com',
  'cache-server',
  'running',
  '2.1.5',
  'alpine',
  'ap-southeast-1',
  '10.0.4.104'::inet,
  43200,
  18.5,
  34.7,
  256,
  'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5',
  now() - interval '45 seconds'
),
-- Agent 5: Offline status
(
  '22222222-2222-2222-2222-222222222222',
  'srv-backup-01.ultahost.com',
  'backup-server',
  'offline',
  '2.0.8',
  'ubuntu',
  'us-central-1',
  '10.0.5.105'::inet,
  0,
  0.0,
  0.0,
  89,
  'e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6',
  now() - interval '2 hours'
),
-- Agent 6: Offline status
(
  '22222222-2222-2222-2222-222222222222',
  'srv-monitor-01.ultahost.com',
  'monitoring',
  'offline',
  '2.1.1',
  'fedora',
  'eu-central-1',
  '10.0.6.106'::inet,
  0,
  0.0,
  0.0,
  23,
  'f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7',
  now() - interval '4 hours'
);