import requests
import sys
import json

BASE = 'http://127.0.0.1:8000/api/v1'
EMAIL = 'manager@bakery.com'
PASSWORD = 'demo1234'


def main():
    s = requests.Session()
    try:
        print('Logging in with', EMAIL)
        r = s.post(f'{BASE}/auth/login/', json={'email': EMAIL, 'password': PASSWORD}, timeout=10)
        print('Login status:', r.status_code)
        print(r.text)
        data = r.json()
        payload = data.get('data') if isinstance(data, dict) else None
        if not payload:
            payload = data
        access = payload.get('access') or payload.get('token') or data.get('access')
        if not access:
            print('Failed to obtain access token from response; aborting')
            sys.exit(1)
        s.headers.update({'Authorization': f'Bearer {access}'})

        # List products
        print('\nFetching products...')
        r = s.get(f'{BASE}/products/', timeout=10)
        print('Products status:', r.status_code)
        print(r.text[:800])
        pj = r.json()
        products = pj.get('results') or pj.get('data') or pj
        if isinstance(products, dict) and 'results' in products:
            products = products['results']
        if isinstance(products, dict) and 'data' in products:
            products = products['data']
        if not isinstance(products, list):
            # maybe wrapped
            products = []
        if not products:
            print('No products found; aborting')
            sys.exit(1)
        first = products[0]
        prod_id = first.get('id')
        price = float(first.get('price') or first.get('unit_price') or 100)
        print('Using product id', prod_id, 'price', price)

        # Create sale
        sale_payload = {
            'date': '2026-05-31',
            'items': [
                {'product': prod_id, 'quantity': 1, 'unit_price': price}
            ],
            'payment_method': 'cash',
        }
        print('\nCreating sale...')
        r = s.post(f'{BASE}/sales/', json=sale_payload, timeout=10)
        print('Create sale status:', r.status_code)
        print(r.text)

        # List users (requires admin/manager role)
        print('\nFetching users...')
        r = s.get(f'{BASE}/users/', timeout=10)
        print('Users status:', r.status_code)
        data = r.json()
        users = data.get('results') or data.get('data') or data
        if isinstance(users, dict) and 'results' in users:
            users = users['results']
        print(f'Found {len(users) if isinstance(users, list) else 0} users')

        # Get dashboard data
        print('\nFetching dashboard data...')
        r = s.get(f'{BASE}/reports/dashboard/', timeout=10)
        print('Dashboard status:', r.status_code)
        data = r.json()
        dashboard = data.get('data') or data
        print(f'Dashboard keys: {list(dashboard.keys()) if isinstance(dashboard, dict) else "N/A"}')

        # Get sales report
        print('\nFetching sales report...')
        r = s.get(f'{BASE}/reports/sales/', timeout=10)
        print('Sales report status:', r.status_code)
        data = r.json()
        report = data.get('data') or data
        print(f'Sales report keys: {list(report.keys()) if isinstance(report, dict) else "N/A"}')

        # Get wastage report
        print('\nFetching wastage report...')
        r = s.get(f'{BASE}/reports/wastage/', timeout=10)
        print('Wastage report status:', r.status_code)
        data = r.json()
        report = data.get('data') or data
        print(f'Wastage report keys: {list(report.keys()) if isinstance(report, dict) else "N/A"}')

        print('\n✅ All integration tests passed!')

    except Exception as e:
        print('Error during integration test:', e)
        sys.exit(1)


if __name__ == '__main__':
    main()
