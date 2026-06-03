import os
import sys
import django
import json
from datetime import timedelta

# Ensure backend package directory is on sys.path so `bakery_hq` is importable
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root not in sys.path:
    sys.path.insert(0, root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bakery_hq.settings')
django.setup()

from django.utils import timezone
from rest_framework.test import APIClient
from django.conf import settings

from apps.accounts.models import User
from apps.products.models import ProductCategory, Product, ProductBatch, Outlet
from apps.products.models import DispatchRequest, Dispatch


def pretty(obj):
    try:
        return json.dumps(obj, indent=2, default=str)
    except Exception:
        return str(obj)


def ensure_user(email, name, role):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={'name': name, 'role': role},
    )
    if created:
        user.set_password('demo1234')
        user.save()
    else:
        if user.role != role:
            user.role = role
            user.save(update_fields=['role'])
    return user


def ensure_product():
    category, _ = ProductCategory.objects.get_or_create(
        name='E2E Dispatch Category',
        defaults={'description': 'Dispatch test category', 'display_order': 3},
    )
    product, created = Product.objects.get_or_create(
        sku='E2E-DISPATCH-001',
        defaults={
            'name': 'E2E Donut',
            'category': category,
            'price': '100.00',
            'cost_price': '40.00',
            'stock': 0,
            'shelf_life_days': 3,
        },
    )
    if created:
        product.save()
    return product


def ensure_outlet():
    outlet, _ = Outlet.objects.get_or_create(
        name='E2E Dispatch Outlet',
        defaults={'address': '123 Test Lane', 'contact_phone': '0700000000'},
    )
    return outlet


def ensure_batch(product):
    today = timezone.now().date()
    batch, created = ProductBatch.objects.get_or_create(
        product=product,
        batch_number='E2E-DISPATCH-BATCH',
        defaults={
            'production_date': today - timedelta(days=1),
            'expiry_date': today + timedelta(days=2),
            'quantity_produced': 20,
            'current_quantity': 20,
        },
    )
    batch.refresh_from_db()
    product.refresh_from_db()
    return batch


def login(client, user):
    r = client.post('/api/v1/auth/login/', {'email': user.email, 'password': 'demo1234'}, format='json')
    if r.status_code != 200:
        raise RuntimeError(f'Login failed for {user.email}: {r.status_code} {r.data}')
    token = r.data['data']['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return r.data


def run():
    try:
        if 'testserver' not in list(settings.ALLOWED_HOSTS):
            settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ['testserver']
    except Exception:
        pass

    manager = ensure_user('e2e_dispatch_manager@example.com', 'E2E Dispatch Manager', 'manager')
    distributor = ensure_user('e2e_dispatch_fd@example.com', 'E2E Dispatch Distributor', 'factory_distributor')
    product = ensure_product()
    outlet = ensure_outlet()
    batch = ensure_batch(product)

    print('Initial batch current_quantity:', batch.current_quantity)
    print('Initial product stock:', product.stock)

    client = APIClient()
    login(client, manager)

    print('\n=== CREATE DISPATCH REQUEST AS MANAGER ===')
    request_payload = {
        'outlet': outlet.id,
        'product': product.id,
        'quantity_requested': 5,
        'notes': 'E2E dispatch request',
    }
    r = client.post('/api/v1/products/dispatch_requests/', request_payload, format='json')
    print('DISPATCH REQUEST POST ->', r.status_code)
    print(pretty(r.data))
    if r.status_code not in (200, 201):
        return
    request_id = r.data['data']['id']

    print('\n=== APPROVE DISPATCH REQUEST AS MANAGER ===')
    r = client.post(f'/api/v1/products/dispatch_requests/{request_id}/approve/')
    print('APPROVE POST ->', r.status_code)
    print(pretty(r.data))
    if r.status_code not in (200, 201):
        return

    print('\n=== CREATE DISPATCH AS DISTRIBUTOR ===')
    client = APIClient()
    login(client, distributor)
    dispatch_payload = {
        'request': request_id,
        'batch': batch.id,
        'quantity_dispatched': 5,
    }
    r = client.post('/api/v1/products/dispatches/', dispatch_payload, format='json')
    print('DISPATCH POST ->', r.status_code)
    print(pretty(r.data))
    if r.status_code not in (200, 201):
        return

    batch.refresh_from_db()
    product.refresh_from_db()
    request_obj = DispatchRequest.objects.get(pk=request_id)

    print('\n=== VERIFICATION ===')
    print('Batch after dispatch current_quantity:', batch.current_quantity)
    print('Product after dispatch stock:', product.stock)
    print('Dispatch request status:', request_obj.status)
    print('Dispatch request approved_by:', request_obj.approved_by.email if request_obj.approved_by else None)
    print('Dispatch record exists:', Dispatch.objects.filter(request=request_obj).count())

    if batch.current_quantity == 20:
        print('WARNING: batch quantity did not change on dispatch creation')
    else:
        print('Batch quantity changed on dispatch creation.')

    if product.stock == batch.current_quantity:
        print('Product stock updated to reflect batch consumption.')
    else:
        print('Product stock does not reflect batch consumption; current_stock=', product.stock)

if __name__ == '__main__':
    run()
