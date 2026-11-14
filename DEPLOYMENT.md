# Render Free + Neon Free deployment guide

This guide prepares the existing demo app for one Render Docker Web Service and one Neon PostgreSQL project. It does not deploy the app. Checkout, offers, and delivered keys remain fictional demo data; no real payment processing is configured.

## 1. Prepare the Neon project

1. In Neon, open the existing PostgreSQL 18 project and choose the intended branch and database.
2. Use **Connect** to copy the pooled connection string (the hostname contains `-pooler`). Keep it private. The Laravel migration creates `pg_trgm`, which Neon documents as enabled with `CREATE EXTENSION IF NOT EXISTS pg_trgm`.
3. Keep the connection string for the Render `DB_URL` environment variable. Ensure it includes `sslmode=require`; set `DB_SSLMODE=require` as well. Do not place the URL in this repository or a command literal.

The project migration `2026_11_13_000007_add_product_title_trigram_search.php` enables `pg_trgm` and creates the title trigram index. The application does not need a separate extension setup command. If migration reports an extension permission error, stop and check that Neon supports/enables `pg_trgm` for this PostgreSQL version and role; do not bypass the migration.

## 2. Create the Render Web Service

1. In Render, create a **Web Service** connected to `Shirirudesu/playvault-marketplace`.
2. Select the repository root as the root directory, **Docker** as the runtime, `Dockerfile` as the Dockerfile path, and the **Free** instance plan.
3. Copy the exact HTTPS service URL shown in Render Settings. The URL is assigned by Render; do not assume the suggested example name is available.
4. Before the first successful start, configure the variables below in Render's environment settings. Substitute the actual service hostname and the Neon pooled URL locally in the dashboard; do not share either secret in chat or commit it.

| Variable | Value |
| --- | --- |
| `APP_NAME` | `PlayVault` |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_URL` | `https://<your-render-service>.onrender.com` |
| `APP_KEY` | One persistent value generated as described below |
| `DB_CONNECTION` | `pgsql` |
| `DB_URL` | `<Neon pooled PostgreSQL URL including sslmode=require>` |
| `DB_SSLMODE` | `require` |
| `SESSION_DRIVER` | `database` |
| `SESSION_ENCRYPT` | `true` |
| `SESSION_SECURE_COOKIE` | `true` |
| `SESSION_HTTP_ONLY` | `true` |
| `SESSION_SAME_SITE` | `lax` |
| `SESSION_DOMAIN` | Leave unset (host-only cookie) |
| `CACHE_STORE` | `database` |
| `SANCTUM_STATEFUL_DOMAINS` | `<your-render-service>.onrender.com` (hostname only, no scheme) |
| `FRONTEND_URL` | `https://<your-render-service>.onrender.com` |

Render terminates public TLS and forwards traffic to the container. Laravel trusts the proxy headers so it recognizes the original HTTPS request. Frontend requests are built with the same-origin path `/api`; `VITE_API_BASE_URL` is set to `/api` during the Docker build. Do not set a production frontend URL or secret as a Vite variable.

Generate `APP_KEY` from a local project checkout, then paste it directly into Render's protected environment settings:

```powershell
Set-Location C:\Projects\eneba-marketplace\backend
php artisan key:generate --show
```

Keep the same key across deploys. Do not add it to either `.env.example`, a Docker build argument, a Dockerfile, or Git. If rotated, existing encrypted sessions will no longer be usable.

The Docker entrypoint runs `php artisan migrate --force` before starting FrankenPHP. Laravel applies only pending migrations; it does not reset the schema. This is repeated on container starts/redeploys. The entrypoint never runs seeders.

## 3. Initialize the empty Neon database once

Render Free Web Services do not provide SSH/shell access or one-off jobs. Run the migrations and demo seeders from your Windows project checkout, before sharing the service with users. This connects only when you run the commands below; it does not modify any local `.env` file. The Neon URL is requested as hidden PowerShell input and is not included in shell history as a command literal.

In a PowerShell terminal:

```powershell
Set-Location C:\Projects\eneba-marketplace\backend
$secureDbUrl = Read-Host 'Paste the Neon pooled URL (sslmode=require)' -AsSecureString
$env:DB_URL = [System.Net.NetworkCredential]::new('', $secureDbUrl).Password
$env:DB_CONNECTION = 'pgsql'
$env:DB_SSLMODE = 'require'
$env:APP_ENV = 'production'
$env:APP_DEBUG = 'false'

try {
    php artisan migrate --force
    if ($LASTEXITCODE -ne 0) { throw 'Neon migrations failed; stop and inspect the error before continuing.' }

    php artisan db:seed --force
    if ($LASTEXITCODE -ne 0) { throw 'Catalog seeding failed; stop and inspect the error before continuing.' }

    php artisan db:seed --class=ProductInformationSeeder --force
    if ($LASTEXITCODE -ne 0) { throw 'Product information seeding failed; stop and inspect the error before continuing.' }
}
finally {
    Remove-Item Env:DB_URL, Env:DB_CONNECTION, Env:DB_SSLMODE, Env:APP_ENV, Env:APP_DEBUG -ErrorAction SilentlyContinue
    Remove-Variable secureDbUrl -ErrorAction SilentlyContinue
}
```

Run these only against the intended empty Neon branch. The catalog seeder uses upserts and initializes offer quantities and fictional keys. It does not truncate or delete users or orders, but it updates demo products/offers and is **not a production reseed command**: do not run it again after users can purchase. Redeploys run migrations only, so they cannot re-seed or replenish inventory, rewrite order records, or reset users. The separate product information seeder updates descriptive metadata only.

If a seed command fails, do not make the service available for checkout. Inspect the failure first; on a still-empty demo database, resolve the cause and complete initialization before users create orders.

## 4. Confirm the deployment

After Render finishes building and starting the service, copy its assigned URL from **Settings**. Update `APP_URL`, `FRONTEND_URL`, and `SANCTUM_STATEFUL_DOMAINS` if the actual hostname differs, then save and redeploy. Confirm:

- `/` and refreshed SPA routes such as `/store`, `/products/cyberpunk-2077`, `/login`, and `/orders` serve the React app.
- `/api/health` returns JSON and `/api/homepage` returns database-backed data.
- `/sanctum/csrf-cookie` responds and registration/login/logout preserve the same-origin session cookie.
- Product images and offers load; no browser API request points to localhost.

Use the Render dashboard's **Logs** for build and runtime output. Never add the Neon URL or `APP_KEY` to diagnostic commands or shared logs.

## Troubleshooting

- **Build/startup fails:** inspect Render build/runtime logs. Check the Docker build context is the repository root, all lockfiles are present, the runtime can write Laravel `storage/` and `bootstrap/cache/`, and Render provides the `PORT` value. The container binds Caddy/FrankenPHP to `0.0.0.0:$PORT` (default 10000).
- **PostgreSQL SSL or connection error:** verify the Neon host/database/user/password copied from the Neon Connect dialog, use its pooled URL, preserve URL encoding, set `DB_SSLMODE=require`, and confirm the Neon project is awake and within its quotas. Do not print `DB_URL` while debugging.
- **`pg_trgm` migration error:** check Neon extension availability and the role's permission to create the extension. The migration uses `CREATE EXTENSION IF NOT EXISTS`; do not delete migration records or reset the database.
- **419 CSRF response:** confirm the frontend and API are the same exact HTTPS origin, `SESSION_SECURE_COOKIE=true`, `SESSION_SAME_SITE=lax`, `SESSION_DOMAIN` unset, `APP_URL`/`FRONTEND_URL` match Render's assigned URL, and `SANCTUM_STATEFUL_DOMAINS` contains only its hostname. Clear that site's cookies and retry.
- **500 response:** inspect Laravel runtime logs in Render. Confirm `APP_KEY` is set, `APP_DEBUG=false`, migrations completed, and Neon credentials/SSL are valid. Keep `APP_DEBUG=false`; do not expose stack traces publicly.
- **SPA refresh gives 404 or API returns HTML:** check that the deployed image uses the root Caddyfile. `/api/*`, `/sanctum/*`, and `/up` are routed to Laravel; other paths use `index.html` for React Router. The frontend must be built with `/api`.

## Free-tier limitations and persistence

Render Free web services have 512 MB RAM and 0.1 CPU, spin down after 15 minutes without inbound traffic, may take about a minute to wake, can restart, and have an ephemeral filesystem with no persistent disk or shell/one-off jobs. Build the frontend in a separate Docker stage and keep all durable app/session data in PostgreSQL. The image uses a lean FrankenPHP runtime; monitor memory and startup logs.

Neon Free currently includes 100 CU-hours per project monthly, 1 GB PostgreSQL storage per project, 5 GB public network transfer per project monthly, and scales compute to zero after 5 minutes idle. Both services can therefore have cold starts. Free plans are intended for demos and prototypes; neither provider's free tier should be treated as a durable production guarantee. Check current plan limits before use because quotas can change.

### References

- [Render Docker services](https://render.com/docs/docker)
- [Render web services and port binding](https://render.com/docs/web-services)
- [Render Free instance limitations](https://render.com/docs/free)
- [Render compute plans](https://render.com/docs/compute-plans)
- [Neon `pg_trgm` extension](https://neon.com/docs/extensions/pg_trgm)
- [Neon plans and Free limits](https://neon.com/docs/introduction/plans)
- [Neon connection troubleshooting](https://neon.com/docs/connect/connection-errors)
