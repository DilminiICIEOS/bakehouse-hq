import requests

BASE = 'http://127.0.0.1:8000/api/v1'

# Verify unauthenticated access
for path in ['/products/', '/reports/dashboard/', '/users/']:
    url = BASE + path
    try:
        r = requests.get(url, timeout=10)
        print('GET', path, r.status_code)
        print(r.text[:400])
    except Exception as e:
        print('GET', path, 'ERROR', e)

# Verify login with known admin credentials
cred = {'email': 'tester2@example.com', 'password': 'Password123!'}
print('\nTesting login with admin credentials:')
try:
    r = requests.post(BASE + '/auth/login/', json=cred, timeout=10)
    print('POST /auth/login/', r.status_code)
    print(r.text[:400])
    token = None
    if r.ok:
        data = r.json().get('data', {})
        token = data.get('access')

    if token:
        headers = {'Authorization': f'Bearer {token}'}
        for path in ['/products/', '/reports/dashboard/', '/users/']:
            url = BASE + path
            r = requests.get(url, headers=headers, timeout=10)
            print('AUTH GET', path, r.status_code)
            print(r.text[:400])
except Exception as e:
    print('Login test ERROR', e)
