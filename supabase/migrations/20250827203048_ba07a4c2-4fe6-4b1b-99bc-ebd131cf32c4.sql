-- Seed default command policies
-- Note: Using a placeholder customer_id that should be replaced in production

-- Auto policies for safe monitoring commands
INSERT INTO public.command_policies (policy_name, mode, match_type, match_value, os_whitelist, risk, timeout_sec, confirm_message, active, customer_id, created_by, updated_by) VALUES
('Allow Uptime Check', 'auto', 'exact', 'uptime', ARRAY['ubuntu', 'debian', 'centos', 'rhel', 'alpine'], 'low', 30, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Allow Disk Usage Check', 'auto', 'regex', '^df(\s+.*)?$', ARRAY['ubuntu', 'debian', 'centos', 'rhel', 'alpine'], 'low', 30, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Allow Memory Check', 'auto', 'exact', 'free', ARRAY['ubuntu', 'debian', 'centos', 'rhel', 'alpine'], 'low', 30, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Allow Free with Options', 'auto', 'regex', '^free\s+(-[hbkmgt]+|\s)*$', ARRAY['ubuntu', 'debian', 'centos', 'rhel', 'alpine'], 'low', 30, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Allow CPU Info Check', 'auto', 'regex', '^(cat\s+/proc/cpuinfo|lscpu)$', ARRAY['ubuntu', 'debian', 'centos', 'rhel', 'alpine'], 'low', 30, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Allow Socket Statistics', 'auto', 'regex', '^ss(\s+.*)?$', ARRAY['ubuntu', 'debian', 'centos', 'rhel', 'alpine'], 'low', 30, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

-- Confirm policies for system modification commands
INSERT INTO public.command_policies (policy_name, mode, match_type, match_value, os_whitelist, risk, timeout_sec, confirm_message, active, customer_id, created_by, updated_by) VALUES
('Confirm Package Installation', 'confirm', 'regex', '^apt-get\s+install\s+.*', ARRAY['ubuntu', 'debian'], 'medium', 600, 'This will install new packages on the system. Continue?', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Confirm Package Upgrade', 'confirm', 'regex', '^apt-get\s+upgrade(\s+.*)?$', ARRAY['ubuntu', 'debian'], 'medium', 1200, 'This will upgrade system packages. This may affect system stability. Continue?', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Confirm Service Restart', 'confirm', 'regex', '^systemctl\s+restart\s+.*', ARRAY['ubuntu', 'debian', 'centos', 'rhel'], 'medium', 300, 'This will restart a system service. This may cause service interruption. Continue?', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Confirm Docker Run', 'confirm', 'regex', '^docker\s+run\s+.*', NULL, 'medium', 600, 'This will run a new Docker container. Review the command parameters carefully. Continue?', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Confirm YUM Package Install', 'confirm', 'regex', '^(yum|dnf)\s+install\s+.*', ARRAY['centos', 'rhel', 'fedora'], 'medium', 600, 'This will install new packages on the system. Continue?', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Confirm YUM Package Update', 'confirm', 'regex', '^(yum|dnf)\s+update(\s+.*)?$', ARRAY['centos', 'rhel', 'fedora'], 'medium', 1200, 'This will update system packages. This may affect system stability. Continue?', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

-- Forbid policies for dangerous commands
INSERT INTO public.command_policies (policy_name, mode, match_type, match_value, os_whitelist, risk, timeout_sec, confirm_message, active, customer_id, created_by, updated_by) VALUES
('Block Recursive Root Delete', 'forbid', 'regex', '.*rm\s+.*-rf?\s*(/|\s*/\s*).*', NULL, 'critical', NULL, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Block Filesystem Creation', 'forbid', 'regex', '^mkfs\.[a-z0-9]+\s+.*', NULL, 'critical', NULL, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Block DD to Devices', 'forbid', 'regex', '^dd\s+.*of=/dev/.*', NULL, 'critical', NULL, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Block Shell Metacharacters - Pipes', 'forbid', 'regex', '.*[|&;`$(){}[\]\\].*', NULL, 'high', NULL, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Block Command Injection', 'forbid', 'regex', '.*(&&|\|\||;;).*', NULL, 'critical', NULL, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Block Format Commands', 'forbid', 'regex', '^(fdisk|parted|mkfs|mkswap)\s+.*', NULL, 'critical', NULL, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Block System Shutdown', 'forbid', 'regex', '^(shutdown|reboot|halt|poweroff|init\s+[06])\s*.*', NULL, 'high', NULL, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Block Chmod 777', 'forbid', 'regex', '^chmod\s+(777|a\+rwx)\s+.*', NULL, 'high', NULL, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Block Root Password Change', 'forbid', 'regex', '^(passwd|chpasswd)(\s+root)?$', NULL, 'critical', NULL, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

-- Add some additional useful auto policies
INSERT INTO public.command_policies (policy_name, mode, match_type, match_value, os_whitelist, risk, timeout_sec, confirm_message, active, customer_id, created_by, updated_by) VALUES
('Allow Process List', 'auto', 'regex', '^ps(\s+.*)?$', NULL, 'low', 30, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Allow Top Command', 'auto', 'regex', '^(top|htop)(\s+.*)?$', NULL, 'low', 60, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Allow Network Interface Info', 'auto', 'regex', '^(ip\s+(addr|link)|ifconfig)(\s+.*)?$', NULL, 'low', 30, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Allow Directory Listing', 'auto', 'regex', '^ls(\s+.*)?$', NULL, 'low', 30, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Allow File Content View', 'auto', 'regex', '^(cat|less|more|head|tail)(\s+[^|;&`$(){}[\]\\].*)?$', NULL, 'low', 60, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Allow Date and Time', 'auto', 'regex', '^(date|timedatectl)(\s+.*)?$', NULL, 'low', 30, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Allow Hostname Check', 'auto', 'regex', '^(hostname|hostnamectl)(\s+.*)?$', NULL, 'low', 30, NULL, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

-- Create a sample history entry for one of the policies
INSERT INTO public.policy_history (policy_id, action, changes, actor_id) 
SELECT id, 'created', '{"initial_seed": true, "version": "1.0"}'::jsonb, '00000000-0000-0000-0000-000000000001'
FROM public.command_policies 
WHERE policy_name = 'Allow Uptime Check' 
LIMIT 1;