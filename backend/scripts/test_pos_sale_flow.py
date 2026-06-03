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
from apps.products.models import ProductCategory, Product, ProductBatch
from apps.sales.models import Sale


def pretty(obj):
    try:
        return json.dumps(obj, indent=2, default=str)
    except Exception:
        return str(obj)


def ensure_user(email='e2e_sales@example.com', password='demo1234', role='salesperson'):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={'name': 'E2E Sales', 'role': role},
    )
    if created:
        user.set_password(password)
        user.save()
    else:
        if user.role != role:
            user.role = role
            user.save(update_fields=['role'])
    return user


def ensure_product():
    category, _ = ProductCategory.objects.get_or_create(
        name='E2E POS Category',
        defaults={'description': 'POS test category', 'display_order': 1},
    )

    product, created = Product.objects.get_or_create(
        sku='E2E-POS-001',
        defaults={
            'name': 'E2E Baguette',
            'category': category,
            'price': '150.00',
            'cost_price': '70.00',
            'stock': 0,
            'shelf_life_days': 3,
        },
    )
    if created:
        product.save()
    return product


def create_batches(product):
    today = timezone.now().date()
    expired_batch, _ = ProductBatch.objects.get_or_create(
        product=product,
        batch_number='E2E-POS-EXPIRED',
        defaults={
            'production_date': today - timedelta(days=10),
            'expiry_date': today - timedelta(days=1),
            'quantity_produced': 10,
            'current_quantity': 10,
        },
    )
    valid_batch_old, _ = ProductBatch.objects.get_or_create(
        product=product,
        batch_number='E2E-POS-OLD',
        defaults={
            'production_date': today - timedelta(days=2),
            'expiry_date': today + timedelta(days=1),
            'quantity_produced': 20,
            'current_quantity': 20,
        },
    )
    valid_batch_new, _ = ProductBatch.objects.get_or_create(
        product=product,
        batch_number='E2E-POS-NEW',
        defaults={
            'production_date': today - timedelta(days=1),
            'expiry_date': today + timedelta(days=2),
            'quantity_produced': 15,
            'current_quantity': 15,
        },
    )
    product.refresh_from_db()
    print('Product stock after batch creation:', product.stock)
    return expired_batch, valid_batch_old, valid_batch_new


def run():
    try:
        if 'testserver' not in list(settings.ALLOWED_HOSTS):
            settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ['testserver']
    except Exception:
        pass

    salesperson = ensure_user()
    product = ensure_product()
    expired_batch, old_batch, new_batch = create_batches(product)

    client = APIClient()
    login_data = client.post('/api/v1/auth/login/', {'email': salesperson.email, 'password': 'demo1234'}, format='json')
    print('LOGIN ->', login_data.status_code)
    print(pretty(login_data.data))
    if login_data.status_code != 200:
        return

    access = login_data.data['data']['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    # Ensure sale count before
    initial_sales = Sale.objects.filter(cashier=salesperson).count()
    print('Initial salesperson sales count:', initial_sales)

    payload = {
        'date': timezone.now().date().isoformat(),
        'payment_method': 'cash',
        'tax_amount': '0.00',
        'discount_amount': '0.00',
        'notes': 'E2E POS sale test',
        'items': [
            {
                'product': product.id,
                'quantity': 5,
                'unit_price': '150.00',
                'discount_amount': '0.00',
            },
            {
                'product': product.id,
                'quantity': 3,
                'unit_price': '150.00',
                'discount_amount': '0.00',
            },
        ],
    }

    print('\n=== CREATING SALE VIA API ===')
    response = client.post('/api/v1/sales/', payload, format='json')
    print('SALE POST ->', response.status_code)
    print(pretty(response.data))

    if response.status_code != 201:
        print('Sale API failed; aborting.')
        return

    sale_data = response.data.get('data')
    sale_id = sale_data.get('id')
    print('Created sale ID:', sale_id)

    product.refresh_from_db()
    print('Product stock after sale:', product.stock)

    print('Batch stock after sale:')
    for batch in [expired_batch, old_batch, new_batch]:
        batch.refresh_from_db()
        print('-', batch.batch_number, batch.current_quantity, 'expired=', batch.is_expired)

    final_sales = Sale.objects.filter(cashier=salesperson).count()
    print('Final salesperson sales count:', final_sales)
    print('Sale created successfully, DB updates verified.')

if __name__ == '__main__':
    run()
