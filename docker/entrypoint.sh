#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    php artisan migrate --force
fi

exec frankenphp run --config /etc/frankenphp/Caddyfile --adapter caddyfile
