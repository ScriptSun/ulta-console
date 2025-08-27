-- Insert 3 demo agents for testing purposes with proper UUIDs and valid log levels
-- Using a system customer ID that bypasses RLS restrictions

-- Insert demo agents with proper UUID format
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
  updated_by,
  created_at,
  updated_at
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'Production Web Server Agent',
  '00000000-0000-0000-0000-000000000001',
  'general',
  'running',
  '2.1.4',
  'ubuntu',
  'us-east-1',
  '10.0.1.15',
  now() - interval '2 minutes',
  259200, -- 3 days
  23.5,
  78.2,
  156,
  true,
  'sha256:a1b2c3d4e5f6789012345678',
  1,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  now() - interval '3 days',
  now() - interval '2 minutes'
),
(
  '22222222-2222-2222-2222-222222222222', 
  'Development Database Agent',
  '00000000-0000-0000-0000-000000000001',
  'data_processor',
  'idle',
  '2.0.8',
  'debian',
  'us-west-2', 
  '10.0.2.42',
  now() - interval '15 minutes',
  432000, -- 5 days
  8.1,
  45.6,
  89,
  false,
  'sha256:9f8e7d6c5b4a321098765432',
  1,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  now() - interval '5 days',
  now() - interval '15 minutes'
),
(
  '33333333-3333-3333-3333-333333333333',
  'System Monitor Agent', 
  '00000000-0000-0000-0000-000000000001',
  'monitor',
  'error',
  '1.9.12',
  'centos',
  'eu-west-1',
  '10.0.3.88',
  now() - interval '1 hour',
  86400, -- 1 day
  45.8,
  92.3,
  23,
  true,
  'sha256:fedcba9876543210abcdef12',
  2,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  now() - interval '1 day',
  now() - interval '1 hour'
)
ON CONFLICT (id) DO NOTHING;

-- Insert some sample agent logs for the demo agents (using only valid log levels)
INSERT INTO public.agent_logs (agent_id, level, message, metadata, timestamp)
VALUES 
('11111111-1111-1111-1111-111111111111', 'info', 'Agent heartbeat - all systems operational', '{"cpu_usage": 23.5, "memory_usage": 78.2}', now() - interval '2 minutes'),
('11111111-1111-1111-1111-111111111111', 'info', 'Completed health check task', '{"task_duration": 1.2, "status": "success"}', now() - interval '5 minutes'),
('22222222-2222-2222-2222-222222222222', 'info', 'Database backup completed successfully', '{"backup_size": "2.1GB", "duration": "45s"}', now() - interval '15 minutes'),
('22222222-2222-2222-2222-222222222222', 'error', 'High memory usage detected', '{"memory_usage": 85.2, "threshold": 80}', now() - interval '20 minutes'),
('33333333-3333-3333-3333-333333333333', 'error', 'Failed to connect to monitoring endpoint', '{"endpoint": "https://monitor.example.com", "error": "Connection timeout"}', now() - interval '1 hour'),
('33333333-3333-3333-3333-333333333333', 'info', 'Attempting reconnection to monitoring service', '{"retry_count": 3}', now() - interval '45 minutes');

-- Insert some sample agent tasks
INSERT INTO public.agent_tasks (agent_id, task_name, status, started_at, completed_at, metadata)
VALUES
('11111111-1111-1111-1111-111111111111', 'System Health Check', 'completed', now() - interval '10 minutes', now() - interval '8 minutes', '{"checks_performed": 12, "all_passed": true}'),
('11111111-1111-1111-1111-111111111111', 'Log Rotation', 'completed', now() - interval '30 minutes', now() - interval '28 minutes', '{"logs_rotated": 8, "space_freed": "1.2GB"}'),
('22222222-2222-2222-2222-222222222222', 'Database Backup', 'completed', now() - interval '20 minutes', now() - interval '15 minutes', '{"backup_type": "incremental", "size": "2.1GB"}'),
('22222222-2222-2222-2222-222222222222', 'Index Optimization', 'running', now() - interval '5 minutes', null, '{"tables_processed": 3, "total_tables": 7}'),
('33333333-3333-3333-3333-333333333333', 'Metrics Collection', 'failed', now() - interval '1 hour', now() - interval '58 minutes', '{"error": "Connection timeout", "retry_scheduled": true}');

-- Insert sample heartbeat data
INSERT INTO public.agent_heartbeats (agent_id, cpu_usage, memory_usage, uptime_seconds, network_io_in, network_io_out, disk_usage, open_ports, timestamp)
VALUES
('11111111-1111-1111-1111-111111111111', 23.5, 78.2, 259200, 1048576, 2097152, 65.4, '{22, 80, 443}', now() - interval '2 minutes'),
('11111111-1111-1111-1111-111111111111', 22.1, 76.8, 259080, 1024000, 2048000, 65.3, '{22, 80, 443}', now() - interval '5 minutes'),
('22222222-2222-2222-2222-222222222222', 8.1, 45.6, 432000, 512000, 1024000, 42.1, '{5432, 22}', now() - interval '15 minutes'),
('22222222-2222-2222-2222-222222222222', 12.3, 48.2, 431700, 480000, 960000, 42.0, '{5432, 22}', now() - interval '18 minutes'),
('33333333-3333-3333-3333-333333333333', 45.8, 92.3, 86400, 256000, 512000, 88.7, '{22, 9090, 3000}', now() - interval '1 hour');