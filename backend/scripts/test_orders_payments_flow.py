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
from apps.products.models import ProductCategory, Product
from apps.sales.models import Order, Payment


def pretty(obj):
    try:
        return json.dumps(obj, indent=2, default=str)
    except Exception:
        return str(obj)


def ensure_user(email='e2e_order@example.com', password='demo1234', role='manager'):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={'name': 'E2E Order User', 'role': role},
    )
    if created:
        user.set_password(password)
        user.save()
    else:
        if user.role != role:
            user.role = role
            user.save(update_fields=['role'])
    return user


def ensure_customer(email='e2e_customer@example.com', password='demo1234'):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={'name': 'E2E Customer', 'role': 'customer'},
    )
    if created:
        user.set_password(password)
        user.save()
    else:
        if user.role != 'customer':
            user.role = 'customer'
            user.save(update_fields=['role'])
    return user


def ensure_product():
    category, _ = ProductCategory.objects.get_or_create(
        name='E2E Order Category',
        defaults={'description': 'Order/payment test category', 'display_order': 2},
    )

    product, created = Product.objects.get_or_create(
        sku='E2E-ORDER-001',
        defaults={
            'name': 'E2E Muffin',
            'category': category,
            'price': '200.00',
            'cost_price': '90.00',
            'stock': 50,
            'shelf_life_days': 3,
        },
    )
    if created:
        product.save()
    return product


def run():
    try:
        if 'testserver' not in list(settings.ALLOWED_HOSTS):
            settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ['testserver']
    except Exception:
        pass

    user = ensure_user()
    customer = ensure_customer()
    product = ensure_product()

    client = APIClient()
    auth = client.post('/api/v1/auth/login/', {'email': user.email, 'password': 'demo1234'}, format='json')
    print('LOGIN ->', auth.status_code)
    print(pretty(auth.data))
    if auth.status_code != 200:
        return

    access = auth.data['data']['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    print('Existing orders for customer:', Order.objects.filter(customer=customer).count())
    print('Existing payments for customer:', Payment.objects.filter(order__customer=customer).count())

    order_payload = {
        'customer': customer.id,
        'pickup_date': timezone.now().date().isoformat(),
        'payment_method': 'card',
        'tax_amount': '20.00',
        'discount_amount': '10.00',
        'notes': 'E2E order testing',
        'items': [
            {
                'product': product.id,
                'quantity': 2,
                'unit_price': '200.00',
                'discount_amount': '0.00',
            },
            {
                'product': product.id,
                'quantity': 1,
                'unit_price': '200.00',
                'discount_amount': '0.00',
            },
        ],
    }

    print('\n=== CREATING ORDER VIA API ===')
    order_resp = client.post('/api/v1/sales/orders/', order_payload, format='json')
    print('ORDER POST ->', order_resp.status_code)
    print(pretty(order_resp.data))
    if order_resp.status_code != 201:
        print('Order creation failed; aborting.')
        return

    order_data = order_resp.data['data']
    order_id = order_data['id']
    print('Created order ID:', order_id)

    print('\n=== CREATING PAYMENT VIA API ===')
    payment_payload = {
        'order': order_id,
        'amount': str(order_data['total']),
        'method': 'card',
        'transaction_reference': 'E2E-ORDER-PAY-001',
        'status': 'completed',
    }
    pay_resp = client.post('/api/v1/sales/payments/', payment_payload, format='json')
    print('PAYMENT POST ->', pay_resp.status_code)
    print(pretty(pay_resp.data))
    if pay_resp.status_code != 201:
        print('Payment creation failed; aborting.')
        return

    payment_data = pay_resp.data['data']
    print('Created payment ID:', payment_data['id'])

    order = Order.objects.get(pk=order_id)
    print('\n=== DB VERIFICATION ===')
    print('Order status:', order.status)
    print('Order payment_status:', order.payment_status)
    print('Order total:', order.total)
    print('Total payments:', order.payments.count())
    print('Payment record status:', order.payments.first().status)
    print('Due amount property:', order.due_amount)

    if order.payment_status != 'paid':
        print('ERROR: order.payment_status not updated to paid')
    else:
        print('Order payment status updated correctly.')

    if order.due_amount != 0:
        print('ERROR: due amount not zero after completed payment')
    else:
        print('Order due amount is zero after completed payment.')

if __name__ == '__main__':
    run()
