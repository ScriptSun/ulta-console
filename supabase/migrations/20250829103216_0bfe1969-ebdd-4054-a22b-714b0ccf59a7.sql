-- Update script batch descriptions for ChatGPT context
UPDATE public.script_batches SET description = 
  CASE 
    WHEN name = 'Database Backup Script' THEN 'Automated database backup utility that creates scheduled backups, manages retention policies, and ensures data integrity. Supports multiple database engines including MySQL, PostgreSQL, and MongoDB. Includes compression, encryption, and remote storage upload capabilities for disaster recovery scenarios.'
    
    WHEN name = 'Install and Configure Redis Cache' THEN 'Sets up Redis in-memory data structure store as a caching layer for web applications. Configures optimal memory settings, persistence options, and security measures. Improves application performance by reducing database load and speeding up data retrieval operations.'
    
    WHEN name = 'Install Docker and Docker Compose' THEN 'Complete containerization platform installation including Docker Engine and Docker Compose. Configures container runtime, sets up proper permissions, and creates initial docker-compose configurations. Essential for modern application deployment and microservices architecture.'
    
    WHEN name = 'Install n8n Workflow Automation' THEN 'Deploys n8n workflow automation platform for creating and managing automated workflows between different applications and services. Includes database setup, authentication configuration, and basic workflow templates for common integration scenarios.'
    
    WHEN name = 'Install Node.js and PM2' THEN 'Installs latest stable Node.js runtime environment and PM2 process manager for production JavaScript applications. Configures PM2 for automatic application restarts, load balancing, and monitoring. Sets up proper logging and error handling mechanisms.'
    
    WHEN name = 'Security Audit Tool' THEN 'Comprehensive security assessment tool that performs vulnerability scanning, compliance checking, and penetration testing. Analyzes system configurations, network security, user permissions, and installed software for potential security risks and compliance violations.'
    
    WHEN name = 'Setup SSL Certificate with Let''s Encrypt' THEN 'Automated SSL/TLS certificate installation using Let''s Encrypt free certificates. Configures web servers (Apache/Nginx) for HTTPS, sets up automatic certificate renewal, and implements security headers for enhanced web security and SEO benefits.'
    
    WHEN name = 'System Health Check' THEN 'Comprehensive system monitoring and health assessment tool that checks CPU usage, memory consumption, disk space, network connectivity, and running services. Provides detailed reports and alerts for proactive system maintenance and troubleshooting.'
    
    WHEN name = 'System Security Hardening' THEN 'Implements enterprise-grade security hardening measures including firewall configuration, user access controls, SSH security, password policies, and system auditing. Follows industry best practices and compliance standards for maximum security posture.'
    
    WHEN name = 'Upgrade PHP Version' THEN 'Safely upgrades PHP to the latest stable version while maintaining application compatibility. Includes dependency updates, configuration migration, and thorough testing procedures. Minimizes downtime during critical PHP version transitions for web applications.'
    
    WHEN name = 'WordPress Installer' THEN 'Automated WordPress installation and configuration script that sets up complete WordPress environment including database creation, user accounts, security configurations, and essential plugins. Streamlines WordPress deployment process for multiple sites.'
    
    ELSE description
  END
WHERE name IN (
  'Database Backup Script',
  'Install and Configure Redis Cache', 
  'Install Docker and Docker Compose',
  'Install n8n Workflow Automation',
  'Install Node.js and PM2',
  'Security Audit Tool',
  'Setup SSL Certificate with Let''s Encrypt',
  'System Health Check',
  'System Security Hardening',
  'Upgrade PHP Version',
  'WordPress Installer'
);