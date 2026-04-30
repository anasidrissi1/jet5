# JET5 Deployment Guide

This checklist documents everything required to ship the Django + Vite stack to production.

## 1. Prerequisites
- Python 3.12+ and Node 18+ installed on the build host.
- Managed PostgreSQL (or other `DATABASE_URL` compatible database).
- Object storage bucket (AWS S3 compatible) for static and media files.
- Reverse proxy capable of terminating TLS (Nginx, Caddy, CloudFront, etc.).

## 2. Backend setup
1. Copy `backend/.env.example` to `.env` and fill in:
   - `DJANGO_SECRET_KEY`, `ALLOWED_HOSTS`, `DATABASE_URL`.
   - `SENTRY_DSN`, Twilio credentials, AWS bucket settings when `USE_S3_STORAGE=1`.
   - `START_NOTIFICATION_SCHEDULER=0` for web dynos, `1` only on the scheduler worker.
2. Create and activate the virtual environment:
   ```powershell
   cd backend
   py -3 -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Apply migrations and collect static assets:
   ```powershell
   python manage.py migrate --no-input
   python manage.py collectstatic --no-input
   ```
4. Validate settings before deployment:
   ```powershell
   python manage.py check --deploy
   ```

## 3. Frontend build
1. Copy `frontend/.env.example` to `.env` and set `VITE_API_URL`, `VITE_MEDIA_URL`, etc.
2. Install dependencies and build:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
3. Upload `frontend/dist` to your CDN, or leave it for Django to serve via the S3 bucket (the backend automatically includes `frontend/dist` in `STATICFILES_DIRS`).

## 4. Process layout
The repository includes a `Procfile` suitable for PaaS platforms:
```
release: cd backend && python manage.py migrate --no-input
web: cd backend && gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers ${WEB_CONCURRENCY:-3}
scheduler: cd backend && START_NOTIFICATION_SCHEDULER=1 python manage.py run_notification_scheduler
```
- Run `scheduler` only once; the command blocks while APScheduler is alive.
- Provide `PORT`, `WEB_CONCURRENCY`, and memory limits via platform variables.

## 5. Reverse proxy checklist
- Terminate TLS and forward `X-Forwarded-Proto` / `X-Forwarded-For`.
- Cache static assets aggressively (long `Cache-Control`) and enable gzip/brotli.
- Enforce HTTPS redirects and HSTS at the edge.
- Expose `/metrics` only to your monitoring network if Prometheus scraping is enabled.

## 6. Observability & maintenance
- Configure Sentry, Prometheus, and log aggregation (e.g., CloudWatch, ELK).
- Monitor the scheduler worker; it should log `Notification scheduler started.` at boot.
- Run `npm audit` and `pip list --outdated` on a schedule to keep dependencies patched.
- Back up the PostgreSQL database and S3 bucket regularly.

## 7. Smoke test before go-live
1. `python manage.py createsuperuser` (if none exists) and log in via the frontend.
2. Create a client/car, upload media, and verify files land in the bucket.
3. Trigger a notification to ensure Twilio credentials work.
4. Confirm HTTPS, CORS, CSRF, and JWT flows in the browser devtools.

Keep this document versioned with the code so ops changes travel with releases.
