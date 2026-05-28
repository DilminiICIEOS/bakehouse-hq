#!/bin/bash
# Entrypoint script for Docker container

set -e

echo "Running database migrations..."
python manage.py migrate

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Creating superuser if needed..."
python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@bakery.com').exists():
    User.objects.create_superuser('admin@bakery.com', 'demo1234', name='Admin User')
    print("Superuser created")
else:
    print("Superuser already exists")
END

echo "Seeding initial data..."
python manage.py seed_data

echo "Starting Gunicorn..."
exec gunicorn \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --worker-class sync \
    --worker-tmp-dir /dev/shm \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    bakery_hq.wsgi:application
