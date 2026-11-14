# syntax=docker/dockerfile:1

FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM dunglas/frankenphp:1-php8.4-bookworm AS php-base
RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && install-php-extensions pdo_pgsql bcmath curl mbstring opcache xml zip

FROM php-base AS backend-build
WORKDIR /app/backend
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
COPY backend/ ./
RUN mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs \
    && COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --no-interaction --prefer-dist --no-progress --optimize-autoloader

FROM php-base AS runtime
WORKDIR /app/backend
ENV GOMEMLIMIT=300MiB
COPY backend/ ./
COPY --from=backend-build /app/backend/vendor ./vendor
COPY --from=frontend-build /app/frontend/dist ./public
COPY docker/Caddyfile /etc/frankenphp/Caddyfile
COPY docker/entrypoint.sh /usr/local/bin/playvault-entrypoint
RUN chmod +x /usr/local/bin/playvault-entrypoint \
    && setcap -r /usr/local/bin/frankenphp \
    && mkdir -p bootstrap/cache storage/app/private storage/framework/cache/data storage/framework/sessions storage/framework/testing storage/framework/views storage/logs /config/caddy /data/caddy \
    && chown -R www-data:www-data bootstrap/cache storage /config/caddy /data/caddy

USER www-data
EXPOSE 10000
ENTRYPOINT ["/usr/local/bin/playvault-entrypoint"]
