import requests
import sys

BASE = 'http://127.0.0.1:8000/api/v1'
EMAIL = 'tester2@example.com'
PASSWORD = 'Password123!'


def data_or_direct(r):
    try:
        j = r.json()
    except Exception:
        return None
    if isinstance(j, dict) and 'data' in j:
        return j['data']
    if isinstance(j, dict) and 'results' in j:
        return j['results']
    return j


def main():
    # Login
    r = requests.post(f'{BASE}/auth/login/', json={'email': EMAIL, 'password': PASSWORD})
    print('login', r.status_code, r.text)
    if not r.ok:
        sys.exit(1)

    j = r.json()
    access = j.get('data', {}).get('access') or j.get('access') or j.get('token')
    if not access:
        print('Failed to get access token', j)
        sys.exit(1)

    headers = {'Authorization': f'Bearer {access}'}

    # Create category
    r = requests.post(f'{BASE}/products/categories/', json={'name': 'Test Category'}, headers=headers)
    print('create category', r.status_code, r.text)
    cat = data_or_direct(r)
    cat_id = None
    if isinstance(cat, dict):
        cat_id = cat.get('id')
    elif isinstance(cat, list) and len(cat):
        cat_id = cat[0].get('id')

    if not cat_id:
        print('Failed to create category')
        sys.exit(1)

    # Create product
    product_payload = {
        'name': 'Test Product',
        'category': cat_id,
        'cost_price': '5.00',
        'price': '10.00',
        'unit': 'piece',
        'stock': 0,
        'min_stock': 1,
        'sku': 'TP-1',
    }
    r = requests.post(f'{BASE}/products/', json=product_payload, headers=headers)
    print('create product', r.status_code, r.text)
    prod = data_or_direct(r)
    prod_id = prod.get('id') if isinstance(prod, dict) else None
    if not prod_id:
        print('Failed to create product')
        sys.exit(1)

    # Create batch
    batch_payload = {
        'product': prod_id,
        'batch_number': 'B-TEST-001',
        'production_date': '2026-06-03',
        'expiry_date': '2026-12-31',
        'quantity_produced': 100,
        'current_quantity': 100,
    }
    r = requests.post(f'{BASE}/products/batches/', json=batch_payload, headers=headers)
    print('create batch', r.status_code, r.text)
    batch = data_or_direct(r)
    batch_id = batch.get('id') if isinstance(batch, dict) else None
    if not batch_id:
        print('Failed to create batch')
        sys.exit(1)

    # Create sale
    sale_payload = {
        'date': '2026-06-03',
        'items': [
            {
                'product': prod_id,
                'batch': batch_id,
                'quantity': 2,
                'unit_price': '10.00',
                'discount_amount': '0',
            }
        ],
        'payment_method': 'cash',
        'tax_amount': '0',
        'discount_amount': '0',
    }
    r = requests.post(f'{BASE}/sales/', json=sale_payload, headers=headers)
    print('create sale', r.status_code, r.text)

    # Check batch quantity
    r = requests.get(f'{BASE}/products/batches/?product={prod_id}', headers=headers)
    print('batches after sale', r.status_code, r.text)

    print('TEST COMPLETE')


if __name__ == '__main__':
    main()
