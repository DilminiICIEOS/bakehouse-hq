import os
import sys
import django
import json

# Ensure backend package directory is on sys.path so `bakery_hq` is importable
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root not in sys.path:
    sys.path.insert(0, root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bakery_hq.settings')
django.setup()

from rest_framework.test import APIClient
from django.conf import settings

# Ensure the testserver host is allowed when using the test client
try:
    if 'testserver' not in list(settings.ALLOWED_HOSTS):
        settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ['testserver']
except Exception:
    pass


def pretty(obj):
    try:
        return json.dumps(obj, indent=2, default=str)
    except Exception:
        return str(obj)


def run():
    client = APIClient()
    base = '/api/v1/auth/'

    print('\n=== HEALTH CHECK ===')
    r = client.post(base + 'health/')
    try:
        data = r.data
    except Exception:
        try:
            data = json.loads(r.content.decode())
        except Exception:
            data = r.content.decode()
    print(r.status_code, data)

    print('\n=== REGISTER ===')
    email = 'e2e_test_user@example.com'
    payload = {
        'email': email,
        'name': 'E2E Tester',
        'password': 'demo1234',
        'password_confirm': 'demo1234',
        'phone': '0710000000',
    }
    r = client.post(base + 'register/', payload, format='json')
    print('REGISTER ->', r.status_code)
    try:
        reg_data = r.data
    except Exception:
        try:
            reg_data = json.loads(r.content.decode())
        except Exception:
            reg_data = r.content.decode()
    print(pretty(reg_data))

    print('\n=== LOGIN ===')
    r = client.post(base + 'login/', {'email': email, 'password': 'demo1234'}, format='json')
    print('LOGIN ->', r.status_code)
    try:
        login_data = r.data
    except Exception:
        try:
            login_data = json.loads(r.content.decode())
        except Exception:
            login_data = r.content.decode()
    print(pretty(login_data))
    if r.status_code != 200 or not (isinstance(login_data, dict) and login_data.get('success')):
        print('Login failed; aborting.')
        return

    access = login_data['data']['access']
    refresh = login_data['data']['refresh']

    print('\n=== ME ===')
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
    r = client.get(base + 'me/')
    try:
        me_data = r.data
    except Exception:
        try:
            me_data = json.loads(r.content.decode())
        except Exception:
            me_data = r.content.decode()
    print('ME ->', r.status_code)
    print(pretty(me_data))

    print('\n=== REFRESH ===')
    client = APIClient()
    r = client.post(base + 'refresh/', {'refresh': refresh}, format='json')
    try:
        refresh_data = r.data
    except Exception:
        try:
            refresh_data = json.loads(r.content.decode())
        except Exception:
            refresh_data = r.content.decode()
    print('REFRESH ->', r.status_code)
    print(pretty(refresh_data))

    print('\n=== LOGOUT ===')
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
    r = client.post(base + 'logout/')
    try:
        logout_data = r.data
    except Exception:
        try:
            logout_data = json.loads(r.content.decode())
        except Exception:
            logout_data = r.content.decode()
    print('LOGOUT ->', r.status_code)
    print(pretty(logout_data))


if __name__ == '__main__':
    run()
