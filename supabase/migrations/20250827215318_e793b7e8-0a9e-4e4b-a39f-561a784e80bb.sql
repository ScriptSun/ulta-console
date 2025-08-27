-- Insert demo script batches for testing
INSERT INTO public.script_batches (
  id,
  customer_id,
  name,
  created_by,
  updated_by,
  os_targets,
  risk,
  auto_version,
  max_timeout_sec,
  active_version
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'System Health Check',
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  ARRAY['linux', 'windows'],
  'low',
  false,
  600,
  1
),
(
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  'Database Backup Script',
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  ARRAY['linux'],
  'medium',
  true,
  1200,
  2
),
(
  '55555555-5555-5555-5555-555555555555',
  '22222222-2222-2222-2222-222222222222',
  'Security Audit Tool',
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  ARRAY['linux', 'windows', 'darwin'],
  'high',
  false,
  300,
  1
);

-- Insert demo script batch versions
INSERT INTO public.script_batch_versions (
  id,
  batch_id,
  version,
  source,
  created_by,
  status,
  sha256,
  size_bytes,
  notes
) VALUES 
-- System Health Check versions
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  1,
  '#!/bin/bash
# System Health Check Script
echo "Checking system health..."
df -h
free -m
uptime
echo "Health check complete"',
  '33333333-3333-3333-3333-333333333333',
  'active',
  'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
  156,
  'Initial version with basic health checks'
),
-- Database Backup Script versions
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '44444444-4444-4444-4444-444444444444',
  1,
  '#!/bin/bash
# Database Backup Script v1
echo "Starting database backup..."
mysqldump -u root -p database_name > backup_$(date +%Y%m%d).sql
echo "Backup completed successfully"',
  '33333333-3333-3333-3333-333333333333',
  'archived',
  'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567',
  198,
  'First version - basic backup functionality'
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '44444444-4444-4444-4444-444444444444',
  2,
  '#!/bin/bash
# Database Backup Script v2
echo "Starting enhanced database backup..."
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p --single-transaction database_name > backup_$DATE.sql
gzip backup_$DATE.sql
echo "Compressed backup completed: backup_$DATE.sql.gz"',
  '33333333-3333-3333-3333-333333333333',
  'active',
  'c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678',
  267,
  'Enhanced version with compression and timestamps'
),
-- Security Audit Tool versions
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '55555555-5555-5555-5555-555555555555',
  1,
  '#!/bin/bash
# Security Audit Tool
echo "Running security audit..."
# Check for unauthorized processes
ps aux | grep -v "^\[" | sort
# Check open ports
netstat -tulpn | grep LISTEN
# Check failed login attempts
grep "Failed password" /var/log/auth.log | tail -10
echo "Security audit complete"',
  '33333333-3333-3333-3333-333333333333',
  'active',
  'd4e5f6789012345678901234567890abcdef1234567890abcdef123456789',
  312,
  'Comprehensive security audit with process and network checks'
);

-- Insert demo customer and user role for testing
INSERT INTO public.user_roles (
  id,
  user_id,
  customer_id,
  role
) VALUES (
  '66666666-6666-6666-6666-666666666666',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'admin'
) ON CONFLICT DO NOTHING;