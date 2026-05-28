"""
Analytics and reporting logic.
"""

from django.db.models import Sum, Count, Avg, F, DecimalField, Value
from django.db.models.functions import TruncDate, Coalesce
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from apps.sales.models import Sale
from apps.wastage.models import Wastage
from apps.products.models import Product


class DashboardAnalytics:
    """Analytics for dashboard KPIs."""

    @staticmethod
    def get_today_stats():
        """Get today's key statistics."""
        today = timezone.now().date()
        
        # Sales
        today_sales = Sale.objects.filter(date=today, is_void=False)
        total_sales = today_sales.aggregate(
            total=Sum('total'),
            count=Count('id'),
        )
        
        # Wastage
        today_wastage = Wastage.objects.filter(date=today)
        total_wastage = today_wastage.aggregate(
            loss=Sum('loss'),
            items=Sum('quantity'),
        )
        
        # Stock
        low_stock = Product.objects.filter(stock__lte=F('min_stock'), is_active=True).count()
        out_of_stock = Product.objects.filter(stock=0, is_active=True).count()
        
        return {
            'sales': {
                'total_revenue': float(total_sales.get('total') or 0),
                'transaction_count': total_sales.get('count') or 0,
            },
            'wastage': {
                'total_loss': float(total_wastage.get('loss') or 0),
                'total_items': total_wastage.get('items') or 0,
            },
            'stock': {
                'low_stock_count': low_stock,
                'out_of_stock_count': out_of_stock,
            },
        }

    @staticmethod
    def get_period_comparison(days=1):
        """
        Get period-over-period comparison.
        
        Args:
            days: Number of days to compare
        """
        today = timezone.now().date()
        current_start = today - timedelta(days=days - 1)
        current_end = today
        
        prev_start = current_start - timedelta(days=days)
        prev_end = current_start - timedelta(days=1)
        
        # Current period
        current_sales = Sale.objects.filter(
            date__gte=current_start,
            date__lte=current_end,
            is_void=False
        ).aggregate(total=Sum('total'), count=Count('id'))
        
        prev_sales = Sale.objects.filter(
            date__gte=prev_start,
            date__lte=prev_end,
            is_void=False
        ).aggregate(total=Sum('total'), count=Count('id'))
        
        current_total = float(current_sales.get('total') or 0)
        prev_total = float(prev_sales.get('total') or 0)
        
        # Calculate change
        if prev_total == 0:
            change_percent = 0 if current_total == 0 else 100
        else:
            change_percent = ((current_total - prev_total) / prev_total) * 100
        
        return {
            'current_period': {
                'start_date': current_start.isoformat(),
                'end_date': current_end.isoformat(),
                'total': current_total,
                'transactions': current_sales.get('count') or 0,
            },
            'previous_period': {
                'start_date': prev_start.isoformat(),
                'end_date': prev_end.isoformat(),
                'total': prev_total,
                'transactions': prev_sales.get('count') or 0,
            },
            'change_percent': round(change_percent, 2),
        }

    @staticmethod
    def get_top_products(limit=10, start_date=None, end_date=None):
        """Get top selling products."""
        from apps.sales.models import SaleItem
        
        queryset = SaleItem.objects.filter(sale__is_void=False).select_related('product')
        
        if start_date:
            queryset = queryset.filter(sale__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(sale__date__lte=end_date)
        
        top_products = queryset.values('product__id', 'product__name').annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('line_total'),
        ).order_by('-total_qty')[:limit]
        
        return list(top_products)

    @staticmethod
    def get_low_stock_alert():
        """Get low stock products for alerting."""
        low_stock = Product.objects.filter(
            stock__lte=F('min_stock'),
            is_active=True
        ).select_related('category').values(
            'id', 'name', 'stock', 'min_stock', 'category__name'
        ).order_by('stock')
        
        return list(low_stock)

    @staticmethod
    def get_wastage_breakdown(start_date=None, end_date=None):
        """Get wastage breakdown by reason."""
        queryset = Wastage.objects.all()
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        breakdown = queryset.values('reason').annotate(
            count=Count('id'),
            total_quantity=Sum('quantity'),
            total_loss=Sum('loss'),
        ).order_by('-total_loss')
        
        return list(breakdown)


class SalesAnalytics:
    """Detailed sales analytics."""

    @staticmethod
    def get_sales_by_date(start_date, end_date):
        """Get sales aggregated by date."""
        sales = Sale.objects.filter(
            date__gte=start_date,
            date__lte=end_date,
            is_void=False
        ).values('date').annotate(
            total_revenue=Sum('total'),
            transaction_count=Count('id'),
            average_transaction=Avg('total'),
        ).order_by('date')
        
        return list(sales)

    @staticmethod
    def get_sales_by_payment_method(start_date, end_date):
        """Get sales breakdown by payment method."""
        sales = Sale.objects.filter(
            date__gte=start_date,
            date__lte=end_date,
            is_void=False
        ).values('payment_method').annotate(
            total_revenue=Sum('total'),
            transaction_count=Count('id'),
        ).order_by('-total_revenue')
        
        return list(sales)

    @staticmethod
    def get_sales_by_category(start_date, end_date):
        """Get sales breakdown by product category."""
        from apps.sales.models import SaleItem
        
        sales = SaleItem.objects.filter(
            sale__date__gte=start_date,
            sale__date__lte=end_date,
            sale__is_void=False
        ).values('product__category__name').annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('line_total'),
        ).order_by('-total_revenue')
        
        return list(sales)


class WastageAnalytics:
    """Detailed wastage analytics."""

    @staticmethod
    def get_wastage_trend(start_date, end_date):
        """Get wastage trend by date."""
        wastage = Wastage.objects.filter(
            date__gte=start_date,
            date__lte=end_date
        ).values('date').annotate(
            total_loss=Sum('loss'),
            total_items=Sum('quantity'),
            record_count=Count('id'),
        ).order_by('date')
        
        return list(wastage)

    @staticmethod
    def get_wastage_by_product(start_date, end_date, limit=10):
        """Get products with highest wastage."""
        wastage = Wastage.objects.filter(
            date__gte=start_date,
            date__lte=end_date
        ).values('product__id', 'product__name').annotate(
            total_qty=Sum('quantity'),
            total_loss=Sum('loss'),
        ).order_by('-total_loss')[:limit]
        
        return list(wastage)
