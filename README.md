# Timofey Portfolio

Modern Dark Tech portfolio with an Express API, SQLite project storage, and a protected administration panel.

## Local start

```powershell
npm.cmd install
npm.cmd start
```

Public site: `http://127.0.0.1:3000/`

The login page is intentionally absent from navigation. Click the `TZ` brand mark seven times within three seconds to open it.

## Security

- Passwords are verified only through bcrypt hashes.
- Authenticated sessions are stored server-side and referenced by `HttpOnly`, `SameSite=Strict` cookies.
- Protected changes require a session-bound CSRF token and same-origin request.
- Failed login attempts are rate-limited.
- Project CRUD uses SQLite prepared statements and server-side validation.
- Project screenshots are accepted only as verified JPEG, PNG, or WebP uploads.
- Uploads are limited to 8 MB per file, 20 files per request, and 64 MB total.
- Admin actions are recorded without passwords or project payloads.

For deployment, copy `.env.example` to `.env`, provide a stable random `SESSION_SECRET`, and set `ADMIN_INITIAL_PASSWORD_HASH` before the first database initialization. The initial hash seeds a fresh database only; plaintext passwords must never be committed.

## Production deployment

The included `compose.yaml` runs the application as a non-root Node.js container on internal port `3001`, persists SQLite in `./database`, persists uploaded project screenshots in `./uploads`, and attaches only the application container to the existing reverse-proxy network.

```bash
cp .env.example .env
mkdir -p database uploads
docker compose up -d --build
docker compose ps
```

The nginx templates in `deploy/nginx` provide an HTTP-only configuration for ACME issuance and the final HTTPS reverse proxy configuration.
