"""
Pytest configuration for tests.
"""

import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bakery_hq.settings')

# Setup Django
django.setup()

# Configure pytest-django
def pytest_configure():
    """Configure pytest with Django."""
    if not settings.configured:
        settings.configure(
            DATABASES={
                'default': {
                    'ENGINE': 'django.db.backends.sqlite3',
                    'NAME': ':memory:',
                }
            }
        )
