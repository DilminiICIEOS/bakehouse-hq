"""
WSGI config for production with Gunicorn.
"""

import os
from django.core.wsgi import get_wsgi_application
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bakery_hq.settings')

application = get_wsgi_application()

# Ensure logs directory exists
import logging
os.makedirs(os.path.join(settings.BASE_DIR, 'logs'), exist_ok=True)

# Configure logging
logging.config.dictConfig(settings.LOGGING)
