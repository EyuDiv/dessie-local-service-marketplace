#!/bin/sh
set -e

echo "Starting deployment checks..."

# Ensure storage directories exist
mkdir -p /var/www/storage/framework/cache/data \
         /var/www/storage/framework/sessions \
         /var/www/storage/framework/views \
         /var/www/storage/logs

chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache
chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# Adapt Nginx listen port to Render/cloud $PORT if provided (defaults to 80)
LISTEN_PORT="${PORT:-80}"
sed -i "s/listen 80;/listen ${LISTEN_PORT};/g; s/listen \[::\]:80;/listen [::]:${LISTEN_PORT};/g" /etc/nginx/http.d/default.conf || true

# Link storage
php artisan storage:link || true

# Run migrations if enabled
if [ "$RUN_MIGRATIONS" = "true" ] || [ "$RUN_MIGRATIONS" = "1" ]; then
    echo "Running database migrations..."
    php artisan migrate --force || true
fi

# Optimization caches
echo "Optimizing Laravel configuration and routes..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "Starting Nginx and PHP-FPM..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
