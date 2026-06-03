import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bakery_hq.settings')
import django
django.setup()

from apps.accounts.models import User
# Ensure backend root is on sys.path (when script run from other cwd)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


email = 'tester@example.com'
password = 'Password123!'
name = 'Test Admin'
# Ensure backend root is on sys.path (when script run from other cwd)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

if User.objects.filter(email=email).exists():
    print('Superuser already exists')
    sys.exit(0)

User.objects.create_superuser(email=email, password=password, name=name)
print('Superuser created:', email)
