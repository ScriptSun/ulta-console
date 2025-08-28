-- Create WordPress installation batch script for Ubuntu
DO $$
DECLARE
  customer_uuid UUID := '00000000-0000-0000-0000-000000000001'; -- Default system customer
  batch_uuid UUID;
  version_uuid UUID;
  variant_uuid UUID;
  wordpress_script TEXT;
  script_hash TEXT;
BEGIN
  -- Generate UUIDs
  batch_uuid := gen_random_uuid();
  version_uuid := gen_random_uuid();
  variant_uuid := gen_random_uuid();

  -- WordPress installation script
  wordpress_script := '#!/bin/bash
set -euo pipefail

# WordPress Installation Script for Ubuntu
# This script installs WordPress with LAMP stack on Ubuntu

# Configuration
DOMAIN="${DOMAIN:-localhost}"
DB_NAME="${DB_NAME:-wordpress}"
DB_USER="${DB_USER:-wp_user}"
DB_PASS="${DB_PASS:-$(openssl rand -base64 32)}"
WP_ADMIN_USER="${WP_ADMIN_USER:-admin}"
WP_ADMIN_PASS="${WP_ADMIN_PASS:-$(openssl rand -base64 16)}"
WP_ADMIN_EMAIL="${WP_ADMIN_EMAIL:-admin@${DOMAIN}}"
WP_TITLE="${WP_TITLE:-My WordPress Site}"

echo "Starting WordPress installation for domain: $DOMAIN"

# Update system
echo "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install LAMP stack
echo "Installing Apache, MySQL, and PHP..."
apt-get install -y apache2 mysql-server php php-mysql php-curl php-gd php-mbstring php-xml php-xmlrpc php-soap php-intl php-zip

# Enable Apache modules
a2enmod rewrite
a2enmod ssl

# Start and enable services
systemctl start apache2
systemctl enable apache2
systemctl start mysql
systemctl enable mysql

# Secure MySQL installation
echo "Configuring MySQL..."
mysql -e "ALTER USER ''root''@''localhost'' IDENTIFIED WITH mysql_native_password BY ''${DB_PASS}'';"
mysql -e "DELETE FROM mysql.user WHERE User='''';"
mysql -e "DELETE FROM mysql.db WHERE Db=''test'' OR Db=''test\\_%'';"
mysql -e "FLUSH PRIVILEGES;"

# Create WordPress database and user
echo "Creating WordPress database..."
mysql -u root -p"${DB_PASS}" -e "CREATE DATABASE ${DB_NAME} DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci;"
mysql -u root -p"${DB_PASS}" -e "CREATE USER ''${DB_USER}''@''localhost'' IDENTIFIED BY ''${DB_PASS}'';"
mysql -u root -p"${DB_PASS}" -e "GRANT ALL ON ${DB_NAME}.* TO ''${DB_USER}''@''localhost'';"
mysql -u root -p"${DB_PASS}" -e "FLUSH PRIVILEGES;"

# Download and install WordPress
echo "Downloading WordPress..."
cd /tmp
curl -O https://wordpress.org/latest.tar.gz
tar xzvf latest.tar.gz

# Copy WordPress files
echo "Installing WordPress files..."
cp -R /tmp/wordpress/* /var/www/html/
chown -R www-data:www-data /var/www/html/
chmod -R 755 /var/www/html/

# Configure WordPress
echo "Configuring WordPress..."
cd /var/www/html
cp wp-config-sample.php wp-config.php

# Update wp-config.php with database settings
sed -i "s/database_name_here/${DB_NAME}/g" wp-config.php
sed -i "s/username_here/${DB_USER}/g" wp-config.php
sed -i "s/password_here/${DB_PASS}/g" wp-config.php

# Generate salt keys
SALT=$(curl -L https://api.wordpress.org/secret-key/1.1/salt/)
printf "%s\n" "g?put your unique phrase here?d" | sed "s?put your unique phrase here?$SALT?g" -i wp-config.php

# Configure Apache virtual host
echo "Configuring Apache virtual host..."
cat > /etc/apache2/sites-available/${DOMAIN}.conf << EOF
<VirtualHost *:80>
    ServerName ${DOMAIN}
    DocumentRoot /var/www/html
    ErrorLog \${APACHE_LOG_DIR}/${DOMAIN}_error.log
    CustomLog \${APACHE_LOG_DIR}/${DOMAIN}_access.log combined
    
    <Directory /var/www/html>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF

# Enable the site and disable default
a2ensite ${DOMAIN}.conf
a2dissite 000-default.conf

# Restart Apache
systemctl restart apache2

# Install WP-CLI
echo "Installing WP-CLI..."
curl -O https://raw.githubusercontent.com/wp-cli/wp-cli/v2.8.1/bin/wp-cli.phar
chmod +x wp-cli.phar
mv wp-cli.phar /usr/local/bin/wp

# Complete WordPress installation via WP-CLI
echo "Completing WordPress installation..."
cd /var/www/html
wp core install --url="http://${DOMAIN}" --title="${WP_TITLE}" --admin_user="${WP_ADMIN_USER}" --admin_password="${WP_ADMIN_PASS}" --admin_email="${WP_ADMIN_EMAIL}" --allow-root

# Install recommended plugins
echo "Installing essential plugins..."
wp plugin install wordfence --activate --allow-root
wp plugin install updraftplus --activate --allow-root
wp plugin install yoast-seo --activate --allow-root

# Set up basic security
echo "Applying security settings..."
# Remove default plugins
wp plugin delete akismet hello --allow-root

# Update default theme
wp theme update --all --allow-root

# Set proper file permissions
chown -R www-data:www-data /var/www/html/
find /var/www/html/ -type d -exec chmod 755 {} \;
find /var/www/html/ -type f -exec chmod 644 {} \;
chmod 600 /var/www/html/wp-config.php

# Configure firewall (if ufw is available)
if command -v ufw >/dev/null 2>&1; then
    echo "Configuring firewall..."
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
fi

# Output installation details
echo "
=============================================================
WordPress Installation Complete!
=============================================================
Site URL: http://${DOMAIN}
Admin URL: http://${DOMAIN}/wp-admin
Admin Username: ${WP_ADMIN_USER}
Admin Password: ${WP_ADMIN_PASS}
Admin Email: ${WP_ADMIN_EMAIL}

Database Name: ${DB_NAME}
Database User: ${DB_USER}
Database Password: ${DB_PASS}

Next Steps:
1. Configure your domain DNS to point to this server
2. Install SSL certificate (recommended: Let''s Encrypt)
3. Configure backups
4. Review security settings
=============================================================
"

# Output success contract for UltaAI
echo ''{"ultaai_contract": {"status": "success", "message": "WordPress installed successfully", "site_url": "http://''${DOMAIN}''", "admin_url": "http://''${DOMAIN}''/wp-admin", "admin_user": "''${WP_ADMIN_USER}''", "admin_email": "''${WP_ADMIN_EMAIL}''", "db_name": "''${DB_NAME}''", "timestamp": "''$(date -Iseconds)''"}}''
';

  -- Calculate hash using digest function
  script_hash := encode(digest(wordpress_script, 'sha256'), 'hex');

  -- Insert the batch script
  INSERT INTO script_batches (
    id,
    name,
    customer_id,
    os_targets,
    risk,
    max_timeout_sec,
    per_agent_concurrency,
    per_tenant_concurrency,
    auto_version,
    active_version,
    inputs_schema,
    inputs_defaults,
    created_by,
    updated_by
  ) VALUES (
    batch_uuid,
    'WordPress Installer',
    customer_uuid,
    ARRAY['ubuntu'],
    'medium',
    1800, -- 30 minutes timeout
    1, -- One installation per agent at a time
    3, -- Up to 3 installations per tenant
    false,
    1, -- Set version 1 as active
    '{
      "type": "object",
      "properties": {
        "DOMAIN": {
          "type": "string",
          "title": "Domain Name",
          "description": "The domain name for the WordPress site",
          "default": "example.com",
          "pattern": "^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\\.[a-zA-Z]{2,}$"
        },
        "WP_TITLE": {
          "type": "string",
          "title": "Site Title",
          "description": "The title of your WordPress site",
          "default": "My WordPress Site"
        },
        "WP_ADMIN_USER": {
          "type": "string",
          "title": "Admin Username",
          "description": "WordPress admin username",
          "default": "admin",
          "minLength": 3,
          "maxLength": 60
        },
        "WP_ADMIN_EMAIL": {
          "type": "string",
          "title": "Admin Email",
          "description": "WordPress admin email address",
          "format": "email"
        },
        "DB_NAME": {
          "type": "string",
          "title": "Database Name",
          "description": "MySQL database name for WordPress",
          "default": "wordpress",
          "pattern": "^[a-zA-Z0-9_]+$"
        }
      },
      "required": ["DOMAIN", "WP_ADMIN_EMAIL"]
    }',
    '{
      "DOMAIN": "example.com",
      "WP_TITLE": "My WordPress Site",
      "WP_ADMIN_USER": "admin",
      "WP_ADMIN_EMAIL": "admin@example.com",
      "DB_NAME": "wordpress"
    }',
    customer_uuid,
    customer_uuid
  );

  -- Insert the script version
  INSERT INTO script_batch_versions (
    id,
    batch_id,
    version,
    source,
    sha256,
    size_bytes,
    status,
    notes,
    created_by
  ) VALUES (
    version_uuid,
    batch_uuid,
    1,
    wordpress_script,
    script_hash,
    length(wordpress_script),
    'active',
    'Initial WordPress installer for Ubuntu with LAMP stack, security hardening, and essential plugins',
    customer_uuid
  );

  -- Insert the Ubuntu variant
  INSERT INTO script_batch_variants (
    id,
    batch_id,
    version,
    os,
    source,
    sha256,
    size_bytes,
    active,
    min_os_version,
    notes,
    created_by
  ) VALUES (
    variant_uuid,
    batch_uuid,
    1,
    'ubuntu',
    wordpress_script,
    script_hash,
    length(wordpress_script),
    true,
    '18.04',
    'WordPress installer optimized for Ubuntu 18.04+ with Apache, MySQL 8.0, PHP 8.x',
    customer_uuid
  );

  RAISE NOTICE 'WordPress batch script created successfully with ID: %', batch_uuid;
END $$;