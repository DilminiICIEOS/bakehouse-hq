from django.test import TestCase
from decimal import Decimal
from types import SimpleNamespace

from apps.accounts.models import User
from apps.products.models import ProductCategory, Product, ProductBatch
from apps.sales.serializers import SaleCreateSerializer


class SaleTotalSoldTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='tester3@example.com', password='Password123!', name='Tester3')
        self.cat = ProductCategory.objects.create(name='Test Cat')
        self.prod = Product.objects.create(
            name='Test Prod',
            category=self.cat,
            cost_price=Decimal('2.00'),
            price=Decimal('5.00'),
            unit='piece',
            stock=0,
            min_stock=1,
            sku='TST-1',
        )
        self.batch = ProductBatch.objects.create(
            product=self.prod,
            batch_number='TST-B1',
            production_date='2026-06-03',
            expiry_date='2026-12-31',
            quantity_produced=50,
            current_quantity=50,
        )

    def test_total_sold_persists_on_sale(self):
        payload = {
            'date': '2026-06-03',
            'items': [
                {'product': self.prod.id, 'batch': self.batch.id, 'quantity': 3, 'unit_price': '5.00', 'discount_amount': '0'}
            ],
            'payment_method': 'cash',
            'tax_amount': '0',
            'discount_amount': '0',
        }
        serializer = SaleCreateSerializer(data=payload, context={'request': SimpleNamespace(user=self.user)})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        sale = serializer.save()

        self.batch.refresh_from_db()
        self.prod.refresh_from_db()

        self.assertEqual(self.batch.current_quantity, 47)
        self.assertEqual(self.prod.stock, 47)
        self.assertEqual(self.prod.total_sold, 3)
