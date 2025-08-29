-- Add heartbeat columns to agents table
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS heartbeat JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;

-- Helper function to set heartbeat
CREATE OR REPLACE FUNCTION set_agent_heartbeat(p_id UUID, p_json JSONB)
RETURNS VOID AS $$
BEGIN
  UPDATE public.agents 
  SET heartbeat = p_json, last_heartbeat = NOW() 
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Seed sample heartbeat data for existing agents
SELECT set_agent_heartbeat('11111111-1111-1111-1111-111111111111', '{
"agent_id": "GENERIC_0001",
"os": "linux",
"os_version": "5.x",
"architecture": "x86_64",
"ip": "192.168.1.100",
"uptime": "1h",
"cpu_cores": 2,
"cpu_usage_percent": 15.5,
"ram_mb": 4096,
"ram_free_mb": 3100,
"swap_mb": 1024,
"swap_used_mb": 0,
"disk_total_gb": 60,
"disk_free_gb": 40,
"open_ports": [22, 80],
"closed_ports": [25, 443],
"running_services": ["ssh"],
"detected_web_roots": ["/var/www/html"],
"current_user_ownership": {"/var/www/html": "www-data"},
"virtualization": "kvm",
"package_manager": "apt",
"timezone": "Asia/Dubai",
"extended_info": {
"installed_packages": ["openssh-server"],
"firewall_rules": {"ufw": {"enabled": true, "allow": [22, 80], "deny": [25, 443]}},
"ssl_certificates": {"enabled": false, "domains": []}
}
}'::jsonb);

SELECT set_agent_heartbeat('406398b1-12d6-419e-bff5-7e1efb1717e2', '{
"agent_id": "WEB_01",
"os": "ubuntu",
"os_version": "22.04",
"architecture": "x86_64",
"ip": "10.0.1.101",
"uptime": "4h",
"cpu_cores": 4,
"cpu_usage_percent": 15.2,
"ram_mb": 8192,
"ram_free_mb": 5200,
"swap_mb": 2048,
"swap_used_mb": 180,
"disk_total_gb": 120,
"disk_free_gb": 77,
"open_ports": [22, 80, 443],
"closed_ports": [25],
"running_services": ["nginx", "php8.1-fpm"],
"detected_web_roots": ["/var/www/html", "/home/www/site"],
"current_user_ownership": {"/var/www/html": "www-data", "/home/www/site": "www-data"},
"virtualization": "kvm",
"package_manager": "apt",
"timezone": "Asia/Dubai",
"extended_info": {
"installed_packages": ["nginx", "php8.1", "fail2ban"],
"firewall_rules": {"ufw": {"enabled": true, "allow": [22, 80, 443], "deny": [25]}},
"ssl_certificates": {"enabled": true, "domains": ["example.com"], "expiry_days_remaining": {"example.com": 55}}
}
}'::jsonb);

SELECT set_agent_heartbeat('44444444-4444-4444-4444-444444444444', '{
"agent_id": "DB_01",
"os": "linux",
"os_version": "5.x",
"architecture": "x86_64",
"ip": "192.168.1.101",
"uptime": "2h",
"cpu_cores": 8,
"cpu_usage_percent": 32.1,
"ram_mb": 16384,
"ram_free_mb": 2800,
"swap_mb": 4096,
"swap_used_mb": 900,
"disk_total_gb": 500,
"disk_free_gb": 210,
"open_ports": [22, 3306],
"closed_ports": [80, 443, 25],
"running_services": ["mysql"],
"detected_web_roots": [],
"current_user_ownership": {},
"virtualization": "kvm",
"package_manager": "apt",
"extended_info": {
"installed_packages": ["mysql-server"],
"firewall_rules": {"ufw": {"enabled": true, "allow": [22, 3306], "deny": [25, 80, 443]}},
"ssl_certificates": {"enabled": false, "domains": []}
}
}'::jsonb);

SELECT set_agent_heartbeat('54da12f1-1be1-445c-8bd6-fb8ae94f326e', '{
"agent_id": "BACKUP_01",
"os": "ubuntu",
"os_version": "22.04",
"architecture": "x86_64",
"ip": "10.0.5.105",
"uptime": "0m",
"cpu_cores": 4,
"cpu_usage_percent": 0.0,
"ram_mb": 8192,
"ram_free_mb": 8100,
"swap_mb": 4096,
"swap_used_mb": 0,
"disk_total_gb": 2000,
"disk_free_gb": 1990,
"open_ports": [22],
"closed_ports": [25, 80, 443],
"running_services": ["rsync", "restic"],
"detected_web_roots": [],
"current_user_ownership": {},
"virtualization": "kvm",
"package_manager": "apt",
"extended_info": {
"backup_targets": ["/var/lib/mysql", "/var/www"],
"backup_window": "02:00-04:00",
"firewall_rules": {"ufw": {"enabled": true, "allow": [22], "deny": [25, 80, 443]}}
}
}'::jsonb);

SELECT set_agent_heartbeat('55555555-5555-5555-5555-555555555555', '{
"agent_id": "BACKUP_WIN_01",
"os": "windows",
"os_version": "2019",
"architecture": "x86_64",
"ip": "192.168.1.102",
"uptime": "4h",
"cpu_cores": 4,
"cpu_usage_percent": 8.3,
"ram_mb": 16384,
"ram_free_mb": 12000,
"swap_mb": 8192,
"swap_used_mb": 500,
"disk_total_gb": 1000,
"disk_free_gb": 830,
"open_ports": [3389, 445],
"closed_ports": [25, 80, 443],
"running_services": ["WinRM", "VSS"],
"detected_web_roots": [],
"current_user_ownership": {},
"virtualization": "hyperv",
"package_manager": "choco",
"extended_info": {
"installed_packages": ["7zip", "git", "restic"],
"firewall_rules": {"windows_defender": {"allow": [3389, 445], "deny": [25, 80, 443]}}
}
}'::jsonb);

SELECT set_agent_heartbeat('56f30943-39e5-433b-b9f7-fad3ae7036b8', '{
"agent_id": "DB_02",
"os": "centos",
"os_version": "8",
"architecture": "x86_64",
"ip": "10.0.3.103",
"uptime": "2d",
"cpu_cores": 8,
"cpu_usage_percent": 42.1,
"ram_mb": 32768,
"ram_free_mb": 6000,
"swap_mb": 8192,
"swap_used_mb": 2200,
"disk_total_gb": 1000,
"disk_free_gb": 540,
"open_ports": [22, 5432],
"closed_ports": [25, 80, 443],
"running_services": ["postgresql"],
"detected_web_roots": [],
"current_user_ownership": {},
"virtualization": "kvm",
"package_manager": "yum",
"extended_info": {
"installed_packages": ["postgresql-server"],
"firewall_rules": {"firewalld": {"allow": [22, 5432], "deny": [25, 80, 443]}}
}
}'::jsonb);

SELECT set_agent_heartbeat('c2556b47-f1ae-4ec6-9eae-c7419a005b07', '{
"agent_id": "API_02",
"os": "debian",
"os_version": "12",
"architecture": "x86_64",
"ip": "10.0.2.102",
"uptime": "1d",
"cpu_cores": 8,
"cpu_usage_percent": 28.7,
"ram_mb": 16384,
"ram_free_mb": 9200,
"swap_mb": 4096,
"swap_used_mb": 700,
"disk_total_gb": 250,
"disk_free_gb": 130,
"open_ports": [22, 443, 8080],
"closed_ports": [25, 80],
"running_services": ["api", "nginx"],
"detected_web_roots": ["/srv/api/public"],
"current_user_ownership": {"/srv/api/public": "www-data"},
"virtualization": "kvm",
"package_manager": "apt",
"extended_info": {
"ssl_certificates": {"enabled": true, "domains": ["api.ultahost.com"], "expiry_days_remaining": {"api.ultahost.com": 88}}
}
}'::jsonb);

SELECT set_agent_heartbeat('ccd736b8-8ae6-4d58-9ad9-dc199c34657b', '{
"agent_id": "CACHE_01",
"os": "alpine",
"os_version": "3.19",
"architecture": "x86_64",
"ip": "10.0.4.104",
"uptime": "12h",
"cpu_cores": 4,
"cpu_usage_percent": 18.5,
"ram_mb": 4096,
"ram_free_mb": 2500,
"swap_mb": 0,
"swap_used_mb": 0,
"disk_total_gb": 100,
"disk_free_gb": 70,
"open_ports": [6379, 11211],
"closed_ports": [25, 80, 443],
"running_services": ["redis", "memcached"],
"detected_web_roots": [],
"current_user_ownership": {},
"virtualization": "kvm",
"package_manager": "apk",
"extended_info": {
"cache": {"redis_maxmemory_mb": 2048, "memcached_max_memory_mb": 512}
}
}'::jsonb);

SELECT set_agent_heartbeat('ec951bc9-c9b3-4bb7-a513-83503a0e86ed', '{
"agent_id": "MON_01",
"os": "fedora",
"os_version": "39",
"architecture": "x86_64",
"ip": "10.0.6.106",
"uptime": "0m",
"cpu_cores": 2,
"cpu_usage_percent": 0.0,
"ram_mb": 4096,
"ram_free_mb": 4000,
"swap_mb": 2048,
"swap_used_mb": 0,
"disk_total_gb": 80,
"disk_free_gb": 79,
"open_ports": [9090],
"closed_ports": [25, 80, 443],
"running_services": ["prometheus"],
"detected_web_roots": [],
"current_user_ownership": {},
"virtualization": "kvm",
"package_manager": "dnf",
"extended_info": {
"scrape_targets": ["http://srv-api-02.ultahost.com:8080/metrics"],
"firewall_rules": {"firewalld": {"allow": [9090], "deny": [25, 80, 443]}}
}
}'::jsonb);