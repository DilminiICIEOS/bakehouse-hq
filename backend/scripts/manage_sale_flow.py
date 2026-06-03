import os
import sys
from types import SimpleNamespace

# Ensure settings import works
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bakery_hq.settings')
import django
django.setup()

from decimal import Decimal
from apps.accounts.models import User
from apps.products.models import ProductCategory, Product, ProductBatch
from apps.sales.serializers import SaleCreateSerializer

# Use test superuser as cashier
user = User.objects.filter(email='tester2@example.com').first()
if not user:
    print('Test user not found')
    sys.exit(1)

# Create category
cat, _ = ProductCategory.objects.get_or_create(name='Integration Test Category')

# Create product
prod, _ = Product.objects.get_or_create(
    name='Integration Test Product',
    defaults={
        'category': cat,
        'cost_price': Decimal('5.00'),
        'price': Decimal('10.00'),
        'unit': 'piece',
        'stock': 0,
        'min_stock': 1,
        'sku': 'ITP-1',
    }
)

# Create batch
batch, _ = ProductBatch.objects.get_or_create(
    product=prod,
    batch_number='IT-BATCH-001',
    defaults={
        'production_date': '2026-06-03',
        'expiry_date': '2026-12-31',
        'quantity_produced': 100,
        'current_quantity': 100,
    }
)

# Prepare payload
payload = {
    'date': '2026-06-03',
    'items': [
        {'product': prod.id, 'batch': batch.id, 'quantity': 2, 'unit_price': '10.00', 'discount_amount': '0'}
    ],
    'payment_method': 'cash',
    'tax_amount': '0',
    'discount_amount': '0',
}

serializer = SaleCreateSerializer(data=payload, context={'request': SimpleNamespace(user=user)})
if not serializer.is_valid():
    print('Serializer errors:', serializer.errors)
    sys.exit(1)

sale = serializer.save()
print('Sale created:', sale.id)

# Show batch current quantity after sale
batch.refresh_from_db()
prod.refresh_from_db()
print('Batch current_quantity:', batch.current_quantity)
print('Product stock:', prod.stock)
print('Product total_sold:', prod.total_sold)
