release: cd backend && python manage.py migrate --noinput
web: cd backend && gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers ${WEB_CONCURRENCY:-3}
scheduler: cd backend && python manage.py run_notification_scheduler
