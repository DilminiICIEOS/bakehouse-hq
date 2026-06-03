import os
import sys
import django
import json
from datetime import date, timedelta

# Ensure backend package directory is on sys.path so `bakery_hq` is importable
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root not in sys.path:
    sys.path.insert(0, root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bakery_hq.settings')
django.setup()

from rest_framework.test import APIClient
from django.conf import settings

# Models
from apps.accounts.models import User
from apps.products.models import ProductCategory, Product, ProductBatch


def pretty(obj):
    try:
        return json.dumps(obj, indent=2, default=str)
    except Exception:
        return str(obj)


def ensure_fd_user(email='e2e_fd@example.com', password='demo1234'):
    user, created = User.objects.get_or_create(email=email, defaults={'name': 'E2E FD', 'role': 'factory_distributor'})
    if created:
        user.set_password(password)
        user.save()
    else:
        # ensure role and password
        if user.role != 'factory_distributor':
            user.role = 'factory_distributor'
            user.save()
    return user


def run():
    # Ensure testserver allowed
    try:
        if 'testserver' not in list(settings.ALLOWED_HOSTS):
            settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ['testserver']
    except Exception:
        pass

    client = APIClient()

    print('\n=== PREPARE USER (factory_distributor) ===')
    fd_user = ensure_fd_user()
    print('User:', fd_user.email, 'role=', fd_user.role)

    # Login to obtain tokens
    base_auth = '/api/v1/auth/'
    r = client.post(base_auth + 'login/', {'email': fd_user.email, 'password': 'demo1234'}, format='json')
    if r.status_code != 200:
        print('Login failed; status', r.status_code, 'response=', r.data)
        print('You may need to create the user manually in admin.')
        return
    data = r.data
    access = data['data']['access']

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    base = '/api/v1/products/'

    print('\n=== CREATE CATEGORY ===')
    cat_payload = {'name': 'E2E Bakery Items', 'description': 'Test category', 'display_order': 10}
    r = client.post(base + 'categories/', cat_payload, format='json')
    print('CREATE CATEGORY ->', r.status_code)
    print(pretty(r.data))
    if r.status_code not in (200, 201):
        print('Category API create failed; status=', r.status_code, 'response=', r.data)
        # Fallback to ORM creation when API disallows POST
        cat, _ = ProductCategory.objects.get_or_create(name=cat_payload['name'], defaults={'description': cat_payload['description'], 'display_order': cat_payload['display_order']})
        cat_id = cat.id
    else:
        cat_id = r.data.get('data', {}).get('id') or r.data.get('id')
    if not cat_id:
        # final fallback: try to get first category
        cat = ProductCategory.objects.first()
        cat_id = cat.id

    print('\n=== CREATE PRODUCT ===')
    prod_payload = {
        'name': 'E2E Croissant',
        'category': cat_id,
        'price': '120.00',
        'cost_price': '60.00',
        'stock': 0,
        'shelf_life_days': 3,
    }
    r = client.post(base, prod_payload, format='json')
    print('CREATE PRODUCT ->', r.status_code)
    print(pretty(r.data))
    if r.status_code not in (200, 201):
        print('Product creation failed; aborting test')
        return
    prod_id = r.data.get('data', {}).get('id') or r.data.get('id')
    product = Product.objects.get(pk=prod_id)

    print('\n=== CREATE BATCHES ===')
    from django.utils import timezone
    today = timezone.now().date()

    batches = [
        # expired batch
        {
            'product': prod_id,
            'batch_number': 'BATCH-EXPIRED',
            'production_date': (today - timedelta(days=10)).isoformat(),
            'expiry_date': (today - timedelta(days=1)).isoformat(),
            'quantity_produced': 50,
            'current_quantity': 50,
        },
        # older valid batch
        {
            'product': prod_id,
            'batch_number': 'BATCH-OLD',
            'production_date': (today - timedelta(days=4)).isoformat(),
            # expiry left in future
            'expiry_date': (today + timedelta(days=2)).isoformat(),
            'quantity_produced': 30,
            'current_quantity': 30,
        },
        # newest batch
        {
            'product': prod_id,
            'batch_number': 'BATCH-NEW',
            'production_date': (today - timedelta(days=1)).isoformat(),
            'quantity_produced': 20,
            'current_quantity': 20,
        },
    ]

    created_batch_ids = []
    for payload in batches:
        r = client.post(base + 'batches/', payload, format='json')
        print('CREATE BATCH', payload['batch_number'], '->', r.status_code)
        try:
            print(pretty(r.data))
        except Exception:
            print('No JSON response')
        if r.status_code in (200, 201):
            bid = r.data.get('data', {}).get('id') or r.data.get('id')
            created_batch_ids.append(bid)
        else:
            # Fallback: create batch via ORM when API disallows POST
            print('Falling back to ORM create for batch', payload['batch_number'])
            # Parse dates if strings
            prod_date = payload.get('production_date')
            exp_date = payload.get('expiry_date')
            if isinstance(prod_date, str):
                prod_date = date.fromisoformat(prod_date)
            if isinstance(exp_date, str):
                exp_date = date.fromisoformat(exp_date)
            pb = ProductBatch.objects.create(
                product=product,
                batch_number=payload['batch_number'],
                production_date=prod_date,
                expiry_date=exp_date,
                quantity_produced=payload.get('quantity_produced', 0),
                current_quantity=payload.get('current_quantity', 0),
            )
            created_batch_ids.append(pb.id)

    print('\n=== LIST BATCHES (API) ===')
    r = client.get(base + 'batches/?product=' + str(prod_id))
    print('LIST BATCHES ->', getattr(r, 'status_code', 'no response'))
    try:
        print(pretty(r.data))
    except Exception:
        print('API listing failed; will list batches via ORM')
        orm_batches = ProductBatch.objects.filter(product=product)
        print('ORM batches:')
        for b in orm_batches:
            print('-', b.batch_number, 'current=', b.current_quantity, 'expiry=', b.expiry_date, 'expired=', b.is_expired)

    print('\n=== VERIFY FIFO & EXPIRY (MODEL) ===')
    product = Product.objects.get(pk=prod_id)
    print('Product stock (from batches):', product.stock)

    print('Available batches (model.available_batches):')
    for b in product.available_batches():
        print('-', b.batch_number, 'current=', b.current_quantity, 'expiry=', b.expiry_date, 'expired=', b.is_expired)

    print('\nRequesting FIFO batch for quantity=5')
    fifo = product.get_fifo_batch(quantity=5)
    print('FIFO batch ->', fifo.batch_number if fifo else None)

    print('\nConsume 5 from FIFO batch')
    if fifo:
        before = fifo.current_quantity
        fifo.consume(5)
        fifo.refresh_from_db()
        print('Batch', fifo.batch_number, 'before=', before, 'after=', fifo.current_quantity)
        product.refresh_from_db()
        print('Product.stock after consume (recalculated):', product.stock)

    print('\nAttempting to consume expired batch should raise')
    expired = ProductBatch.objects.filter(batch_number='BATCH-EXPIRED').order_by('-id').first()
    if not expired:
        print('No expired batch found; skipping expired consume test')
    else:
        try:
            expired.consume(1)
            # If no exception, check is_expired flag to explain
            print('expired.consume did not raise; is_expired=', expired.is_expired)
        except Exception as e:
            print('Expected error from expired.consume ->', repr(e))


if __name__ == '__main__':
    run()
