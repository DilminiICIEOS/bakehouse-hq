import json
import urllib.request
from urllib.error import HTTPError

url = 'http://127.0.0.1:8000/api/v1/auth/login/'
creds = {'email': 'tester2@example.com', 'password': 'Password123!'}
data = json.dumps(creds).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print(resp.status)
        print(resp.read().decode('utf-8'))
except HTTPError as e:
    print('HTTP', e.code)
    print(e.read().decode('utf-8'))
except Exception as exc:
    print('ERROR', exc)
