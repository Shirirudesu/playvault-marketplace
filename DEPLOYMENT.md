# Deployment readiness notes

This project is a browser SPA and a separate Laravel API. The current checkout is simulated and seeded digital keys are fictional `DEMO-` values; this repository is not ready to accept real payments or distribute real keys. `digital_keys.key_code` is currently stored as plaintext in PostgreSQL. Do not import real keys until application-level at-rest encryption and a safe data migration are added and tested.

## A practical hosting layout

For a low-traffic public demo, a low-ops option is Cloudflare Pages for the static Vite build, Laravel Cloud Starter for the Laravel API, and PostgreSQL managed by Laravel Cloud or a separately managed PostgreSQL 18 provider. Cloudflare Pages lists React/Vite's build output as `dist`; its Free plan currently permits custom domains. Laravel Cloud Starter is pay-as-you-go, not free: new organizations currently get $5 usage credit for 14 days. Check live rates, data retention, restore options, PHP 8.3+ availability, PostgreSQL 18 availability, and `pg_trgm` support before choosing database resources.

Cloudflare Pages deploy settings:

- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Build environment variable: `VITE_API_BASE_URL=https://api.example.com/api`

Use one registrable domain for both apps, for example `shop.example.com` on Pages and `api.example.com` for Laravel. Sanctum SPA cookie authentication requires a shared top-level domain. The default `*.pages.dev` and `*.laravel.cloud` hostnames do not meet that requirement. Keep the API and database in the same region where possible. Configure the Vite production API URL at build time; it is public client configuration, never a secret.

Other providers are possible. Render documents that PHP requires its Docker runtime, and its free web services spin down and have ephemeral filesystems; its free PostgreSQL database expires after 30 days and has no backups. That combination is for previews, not durable production data. Vercel Hobby is restricted to personal, non-commercial use, so it is not a general marketplace deployment recommendation.

## Production environment settings

Set these in each host's protected environment-variable/secrets UI. Do not put production values in this repository or send credentials in chat.

Laravel API environment:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.example.com
APP_KEY=<generate once with php artisan key:generate --show; store as a host secret>
LOG_LEVEL=warning

DB_CONNECTION=pgsql
DB_HOST=<managed PostgreSQL host>
DB_PORT=5432
DB_DATABASE=<database name>
DB_USERNAME=<database role>
DB_PASSWORD=<managed secret>
DB_SSLMODE=require

FRONTEND_URL=https://shop.example.com
SANCTUM_STATEFUL_DOMAINS=shop.example.com,api.example.com
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=.example.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
SESSION_HTTP_ONLY=true
SESSION_ENCRYPT=true
```

The existing migrations create Laravel's `sessions` table. Run the additive migrations once on the production database with `php artisan migrate --force` after taking a provider-supported backup/snapshot. Never run `migrate:fresh`, `db:wipe`, or the demo seeder in production. Seed data contains publicly known, non-redeemable sample keys and is for local/demo use only. The digital-key model does not currently encrypt codes at rest; use only demo key values until a tested encryption migration exists.

Vite frontend build environment:

```dotenv
VITE_API_BASE_URL=https://api.example.com/api
```

Set `FRONTEND_URL` to the exact SPA origin; `config/cors.php` allows that exact origin with credentials and does not use a wildcard. Keep `SANCTUM_STATEFUL_DOMAINS` as hostnames (no scheme), including ports only when applicable. For sibling HTTPS subdomains, a parent-domain cookie, `Secure`, `HttpOnly`, and `SameSite=Lax` support session and CSRF cookies. Do not use separate unrelated registrable domains for SPA and API: modern browsers restrict the cross-site cookies Sanctum needs. Keep local `SESSION_DOMAIN` unset and local `SESSION_SECURE_COOKIE=false`.

Generate `APP_KEY` once, store it as a secret, and retain it across deploys; rotating it logs out users and invalidates encrypted application data. Keep `APP_DEBUG=false` in production. Use only HTTPS, exact CORS origins, a least-privilege database role, database TLS, provider backups, and a tested restore procedure. Set `VITE_API_BASE_URL` only at build time; Vite variables are bundled into public JavaScript and must never contain credentials.

## Release checklist

1. Review and push the source yourself; this task did not publish or push anything.
2. Create separate production and staging database resources. Confirm PostgreSQL 18 and `pg_trgm` are supported; migration `2026_11_13_000007` creates the trigram extension for typo-tolerant search.
3. Configure the secrets above; never copy local `.env` files to the host or image.
4. Configure the `shop` and `api` subdomains on the same parent domain, TLS, exact CORS origin, and Sanctum stateful host list.
5. Build the frontend with the production API URL and deploy the Laravel app from `backend/`.
6. Take a database backup, run `php artisan migrate --force` once, and check `/api/health`, registration, login, logout, order ownership, and checkout replay behavior.
7. Verify logs do not include credentials, session values, or key codes. Confirm provider backup schedule and perform a restore test before relying on customer data.

Pricing and free-tier constraints change. These pages were checked on 2026-11-14: [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Laravel Cloud pricing](https://marketing.cloud.laravel.com/pricing), [Render free service limits](https://render.com/docs/free), [Render PHP deployment requirements](https://render.com/docs/language-support), and [Vercel Hobby use limits](https://vercel.com/docs/plans/hobby).
