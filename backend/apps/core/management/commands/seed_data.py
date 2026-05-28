"""
Core management command for database seeding.
"""

from django.core.management.base import BaseCommand
from apps.accounts.models import User
from apps.products.models import ProductCategory, Product
from decimal import Decimal


class Command(BaseCommand):
    help = 'Seed initial data for development'

    def handle(self, *args, **options):
        self.stdout.write('Starting data seeding...')
        
        # Create users
        self.stdout.write('Creating users...')
        users = [
            {
                'email': 'admin@bakery.com',
                'name': 'Aarav Mehta',
                'role': 'admin',
                'password': 'demo1234',
            },
            {
                'email': 'manager@bakery.com',
                'name': 'Priya Sharma',
                'role': 'manager',
                'password': 'demo1234',
            },
            {
                'email': 'sales@bakery.com',
                'name': 'Rohan Patel',
                'role': 'salesperson',
                'password': 'demo1234',
            },
        ]
        
        for user_data in users:
            password = user_data.pop('password')
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults=user_data,
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f"  Created user: {user.email}")
            else:
                self.stdout.write(f"  User already exists: {user.email}")
        
        # Create product categories
        self.stdout.write('Creating product categories...')
        categories = [
            {'name': 'Bread', 'display_order': 1},
            {'name': 'Pastry', 'display_order': 2},
            {'name': 'Cake', 'display_order': 3},
            {'name': 'Beverage', 'display_order': 4},
        ]
        
        category_map = {}
        for cat_data in categories:
            cat, created = ProductCategory.objects.get_or_create(
                name=cat_data['name'],
                defaults={'display_order': cat_data['display_order']},
            )
            category_map[cat.name] = cat
            if created:
                self.stdout.write(f"  Created category: {cat.name}")
            else:
                self.stdout.write(f"  Category already exists: {cat.name}")
        
        # Create products
        self.stdout.write('Creating products...')
        products = [
            {'name': 'Sourdough Loaf', 'category': 'Bread', 'price': 180, 'stock': 24, 'min_stock': 10},
            {'name': 'Croissant', 'category': 'Pastry', 'price': 90, 'stock': 38, 'min_stock': 15},
            {'name': 'Chocolate Muffin', 'category': 'Pastry', 'price': 70, 'stock': 6, 'min_stock': 12},
            {'name': 'Blueberry Cheesecake', 'category': 'Cake', 'price': 320, 'stock': 4, 'min_stock': 5},
            {'name': 'Garlic Baguette', 'category': 'Bread', 'price': 140, 'stock': 18, 'min_stock': 10},
            {'name': 'Almond Danish', 'category': 'Pastry', 'price': 95, 'stock': 22, 'min_stock': 12},
            {'name': 'Tiramisu Slice', 'category': 'Cake', 'price': 220, 'stock': 9, 'min_stock': 6},
            {'name': 'Whole Wheat Bun', 'category': 'Bread', 'price': 35, 'stock': 60, 'min_stock': 25},
            {'name': 'Cinnamon Roll', 'category': 'Pastry', 'price': 110, 'stock': 14, 'min_stock': 10},
            {'name': 'Red Velvet Cupcake', 'category': 'Cake', 'price': 80, 'stock': 2, 'min_stock': 8},
            {'name': 'Cold Brew Coffee', 'category': 'Beverage', 'price': 150, 'stock': 30, 'min_stock': 12},
            {'name': 'Masala Chai', 'category': 'Beverage', 'price': 60, 'stock': 0, 'min_stock': 10},
        ]
        
        for prod_data in products:
            category_name = prod_data.pop('category')
            product, created = Product.objects.get_or_create(
                name=prod_data['name'],
                defaults={
                    **prod_data,
                    'category': category_map[category_name],
                    'price': Decimal(str(prod_data['price'])),
                },
            )
            if created:
                self.stdout.write(f"  Created product: {product.name}")
            else:
                self.stdout.write(f"  Product already exists: {product.name}")
        
        self.stdout.write(self.style.SUCCESS('✓ Data seeding completed successfully!'))
