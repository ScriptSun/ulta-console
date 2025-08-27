-- Assign admin role to the current user
INSERT INTO public.user_roles (
  id,
  user_id,
  customer_id,
  role
) VALUES (
  gen_random_uuid(),
  'dc9972f5-4d89-46a1-8ddb-14f60dc2b001', -- Your user ID
  '22222222-2222-2222-2222-222222222222', -- Demo customer
  'admin'
);

-- Delete existing demo agents to recreate them fresh
DELETE FROM public.agents WHERE customer_id = '22222222-2222-2222-2222-222222222222';

-- Create realistic demo agents with proper timestamps and data
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
  certificate_fingerprint,
  auto_updates_enabled
) VALUES 
-- Production Web Server (Online)
(
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'prod-web-01',
  'dc9972f5-4d89-46a1-8ddb-14f60dc2b001',
  'dc9972f5-4d89-46a1-8ddb-14f60dc2b001',
  'offline', -- Using valid status
  'web',
  'ubuntu-22.04',
  '2.1.3',
  '10.0.1.15',
  'us-east-1',
  NOW() - INTERVAL '3 minutes',
  86400, -- 1 day uptime
  12.5,
  68.2,
  1247,
  'sha256:a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
  true
),
-- Database Server (Online)
(
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  'prod-db-01',
  'dc9972f5-4d89-46a1-8ddb-14f60dc2b001',
  'dc9972f5-4d89-46a1-8ddb-14f60dc2b001',
  'offline',
  'database',
  'centos-8',
  '2.0.8',
  '10.0.1.23',
  'us-east-1',
  NOW() - INTERVAL '1 minute',
  172800, -- 2 days uptime
  28.7,
  84.1,
  892,
  'sha256:def456ghi789jkl012mno345pqr678stu901vwx234yz567abc123def456ghi',
  true
),
-- Backup Agent (Recently Offline)
(
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'backup-agent-02',
  'dc9972f5-4d89-46a1-8ddb-14f60dc2b001',
  'dc9972f5-4d89-46a1-8ddb-14f60dc2b001',
  'offline',
  'backup',
  'windows-server-2022',
  '1.9.7',
  '10.0.2.45',
  'us-west-2',
  NOW() - INTERVAL '25 minutes',
  43200, -- 12 hours uptime before going offline
  5.2,
  41.8,
  156,
  'sha256:ghi789jkl012mno345pqr678stu901vwx234yz567abc123def456ghi789jkl',
  false
);

-- Add some recent heartbeats for the online agents
INSERT INTO public.agent_heartbeats (
  id,
  agent_id,
  timestamp,
  cpu_usage,
  memory_usage,
  uptime_seconds,
  network_io_in,
  network_io_out,
  disk_usage,
  open_ports
) VALUES 
-- Web server heartbeats
(
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  NOW() - INTERVAL '1 minute',
  12.5,
  68.2,
  86400,
  15728640, -- 15MB in
  8388608,  -- 8MB out
  45.2,
  ARRAY[80, 443, 22]
),
(
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  NOW() - INTERVAL '2 minutes',
  14.1,
  67.8,
  86340,
  15204864,
  8126464,
  45.2,
  ARRAY[80, 443, 22]
),
-- Database server heartbeats
(
  gen_random_uuid(),
  '22222222-2222-2222-2222-222222222222',
  NOW() - INTERVAL '30 seconds',
  28.7,
  84.1,
  172800,
  5242880,  -- 5MB in
  2097152,  -- 2MB out
  72.1,
  ARRAY[3306, 22, 33060]
),
(
  gen_random_uuid(),
  '22222222-2222-2222-2222-222222222222',
  NOW() - INTERVAL '1 minute 30 seconds',
  26.3,
  83.7,
  172740,
  5111808,
  2048000,
  72.0,
  ARRAY[3306, 22, 33060]
);

-- Add some recent tasks
INSERT INTO public.agent_tasks (
  id,
  agent_id,
  task_name,
  status,
  created_at,
  started_at,
  completed_at,
  metadata
) VALUES 
(
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'deploy_webapp_v2.1.0',
  'completed',
  NOW() - INTERVAL '15 minutes',
  NOW() - INTERVAL '14 minutes',
  NOW() - INTERVAL '12 minutes',
  '{"deployment_id": "dep-789", "version": "2.1.0", "rollback_available": true}'::jsonb
),
(
  gen_random_uuid(),
  '22222222-2222-2222-2222-222222222222',
  'backup_database_daily',
  'completed',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour 45 minutes',
  '{"backup_size": "2.3GB", "compression": "gzip", "retention_days": 30}'::jsonb
),
(
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'security_scan',
  'running',
  NOW() - INTERVAL '5 minutes',
  NOW() - INTERVAL '4 minutes',
  NULL,
  '{"scan_type": "vulnerability", "progress": 65}'::jsonb
);

-- Add some recent logs
INSERT INTO public.agent_logs (
  id,
  agent_id,
  timestamp,
  level,
  message,
  metadata
) VALUES 
(
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  NOW() - INTERVAL '2 minutes',
  'info',
  'Web application deployment completed successfully',
  '{"deployment_id": "dep-789", "response_time": "1.2s"}'::jsonb
),
(
  gen_random_uuid(),
  '22222222-2222-2222-2222-222222222222',
  NOW() - INTERVAL '10 minutes',
  'info',
  'Database backup completed: backup_20250827_115423.sql.gz',
  '{"backup_size": 2451891200, "duration": "8m32s"}'::jsonb
),
(
  gen_random_uuid(),
  '33333333-3333-3333-3333-333333333333',
  NOW() - INTERVAL '30 minutes',
  'warn',
  'Agent connection timeout, retrying...',
  '{"retry_count": 3, "last_success": "2025-08-27T10:15:00Z"}'::jsonb
);