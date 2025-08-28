-- Insert fake agent tasks for testing
INSERT INTO agent_tasks (
  agent_id,
  task_name,
  status,
  created_at,
  started_at,
  completed_at,
  error_message,
  metadata
) VALUES 
-- Completed task
(
  'ccd736b8-8ae6-4d58-9ad9-dc199c34657b',
  'System Health Check',
  'completed',
  now() - interval '2 hours',
  now() - interval '2 hours',
  now() - interval '1 hour 45 minutes',
  NULL,
  '{"duration_seconds": 900, "checks_passed": 15, "checks_failed": 0}'::jsonb
),
-- Failed task
(
  'ccd736b8-8ae6-4d58-9ad9-dc199c34657b',
  'Database Backup',
  'failed',
  now() - interval '6 hours',
  now() - interval '6 hours',
  now() - interval '5 hours 30 minutes',
  'Connection timeout: Unable to connect to backup server after 3 attempts',
  '{"backup_size_gb": 0, "retry_count": 3, "last_error_code": "TIMEOUT"}'::jsonb
),
-- Running task
(
  'ccd736b8-8ae6-4d58-9ad9-dc199c34657b',
  'Cache Optimization',
  'running',
  now() - interval '30 minutes',
  now() - interval '25 minutes',
  NULL,
  NULL,
  '{"progress_percent": 65, "cache_entries_processed": 15400, "estimated_completion": "5 minutes"}'::jsonb
),
-- Pending task
(
  'ccd736b8-8ae6-4d58-9ad9-dc199c34657b',
  'Security Scan',
  'pending',
  now() - interval '10 minutes',
  NULL,
  NULL,
  NULL,
  '{"scan_type": "vulnerability", "target_directories": ["/var/www", "/etc"], "priority": "medium"}'::jsonb
),
-- Another completed task (older)
(
  'ccd736b8-8ae6-4d58-9ad9-dc199c34657b',
  'Log Rotation',
  'completed',
  now() - interval '1 day',
  now() - interval '1 day',
  now() - interval '23 hours 55 minutes',
  NULL,
  '{"logs_rotated": 12, "disk_space_freed_mb": 450, "compression_ratio": 0.15}'::jsonb
);