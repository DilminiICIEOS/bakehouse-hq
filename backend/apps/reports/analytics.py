"""
Analytics and reporting logic.
Enhanced with date-range filtering, period comparison, growth calculation, hourly data.
"""
 
from django.db.models import Sum, Count, Avg, F
from django.db.models.functions import ExtractHour
from django.utils import timezone
from datetime import timedelta
from apps.sales.models import Sale, SaleItem
from apps.wastage.models import Wastage
from apps.products.models import Product
 
 
class DashboardAnalytics:
    """Analytics for dashboard KPIs — all methods accept optional start/end dates."""
 
    @staticmethod
    def _parse_dates(start_date=None, end_date=None):
        """Return (start, end) as date objects, defaulting to today."""
        today = timezone.now().date()
        if isinstance(end_date, str):
            from datetime import datetime
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        if isinstance(start_date, str):
            from datetime import datetime
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        return start_date or today, end_date or today
 
    @staticmethod
    def get_today_stats(start_date=None, end_date=None):
        """Get key statistics for the given date range (defaults to today)."""
        start, end = DashboardAnalytics._parse_dates(start_date, end_date)
 
        today_sales = Sale.objects.filter(date__gte=start, date__lte=end, is_void=False)
        total_sales = today_sales.aggregate(
            total=Sum('total'),
            count=Count('id'),
        )
        # Compute average from sum ÷ count to avoid field-name alias clash with Avg('total')
        _rev = float(total_sales.get('total') or 0)
        _cnt = total_sales.get('count') or 0
        total_sales['avg'] = (_rev / _cnt) if _cnt > 0 else 0
 
        # Items sold from SaleItems in that period
        items_agg = SaleItem.objects.filter(
            sale__date__gte=start,
            sale__date__lte=end,
            sale__is_void=False,
        ).aggregate(total_qty=Sum('quantity'))
 
        today_wastage = Wastage.objects.filter(date__gte=start, date__lte=end)
        total_wastage = today_wastage.aggregate(
            loss=Sum('loss'),
            items=Sum('quantity'),
        )
 
        low_stock = Product.objects.filter(
            stock__gt=0,
            stock__lte=F('min_stock'),
            is_active=True,
        ).count()
        out_of_stock = Product.objects.filter(stock=0, is_active=True).count()
 
        items_sold = items_agg.get('total_qty') or 0
        wastage_qty = total_wastage.get('items') or 0
        wastage_rate = round((wastage_qty / items_sold * 100) if items_sold > 0 else 0, 1)
 
        return {
            'sales': {
                'total_revenue': float(total_sales.get('total') or 0),
                'transaction_count': total_sales.get('count') or 0,
                'average_sale': float(total_sales.get('avg') or 0),
            },
            'items': {
                'total_sold': int(items_sold),
            },
            'wastage': {
                'total_loss': float(total_wastage.get('loss') or 0),
                'total_items': int(wastage_qty),
                'wastage_rate': wastage_rate,
            },
            'stock': {
                'low_stock_count': low_stock,
                'out_of_stock_count': out_of_stock,
            },
        }
 
    @staticmethod
    def get_period_comparison(start_date=None, end_date=None):
        """
        Compare current period vs prior equivalent period.
        Returns growth percentage and both period totals.
        """
        start, end = DashboardAnalytics._parse_dates(start_date, end_date)
        delta = (end - start).days + 1  # length of current period in days
 
        prev_end = start - timedelta(days=1)
        prev_start = prev_end - timedelta(days=delta - 1)
 
        current_sales = Sale.objects.filter(
            date__gte=start, date__lte=end, is_void=False
        ).aggregate(total=Sum('total'), count=Count('id'))
 
        prev_sales = Sale.objects.filter(
            date__gte=prev_start, date__lte=prev_end, is_void=False
        ).aggregate(total=Sum('total'), count=Count('id'))
 
        current_total = float(current_sales.get('total') or 0)
        prev_total = float(prev_sales.get('total') or 0)
 
        if prev_total == 0:
            change_percent = 0 if current_total == 0 else 100.0
        else:
            change_percent = round(((current_total - prev_total) / prev_total) * 100, 1)
 
        return {
            'current_period': {
                'start_date': start.isoformat(),
                'end_date': end.isoformat(),
                'total': current_total,
                'transactions': current_sales.get('count') or 0,
            },
            'previous_period': {
                'start_date': prev_start.isoformat(),
                'end_date': prev_end.isoformat(),
                'total': prev_total,
                'transactions': prev_sales.get('count') or 0,
            },
            'change_percent': change_percent,
        }
 
    @staticmethod
    def get_top_products(limit=10, start_date=None, end_date=None):
        """Get top selling products by quantity."""
        start, end = DashboardAnalytics._parse_dates(start_date, end_date)
 
        queryset = SaleItem.objects.filter(
            sale__is_void=False,
            sale__date__gte=start,
            sale__date__lte=end,
        ).select_related('product')
 
        top_products = queryset.values('product__id', 'product__name').annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('line_total'),
        ).order_by('-total_qty')[:limit]
 
        return list(top_products)
 
    @staticmethod
    def get_low_stock_alert():
        """Get low-stock and out-of-stock products."""
        products = Product.objects.filter(
            stock__lte=F('min_stock'),
            is_active=True,
        ).select_related('category').values(
            'id', 'name', 'stock', 'min_stock', 'category__name', 'sku',
        ).order_by('stock')
        return list(products)
 
    @staticmethod
    def get_wastage_breakdown(start_date=None, end_date=None):
        """Wastage breakdown by reason for the given date range."""
        start, end = DashboardAnalytics._parse_dates(start_date, end_date)
 
        breakdown = Wastage.objects.filter(
            date__gte=start, date__lte=end,
        ).values('reason').annotate(
            count=Count('id'),
            total_quantity=Sum('quantity'),
            total_loss=Sum('loss'),
        ).order_by('-total_loss')
 
        return list(breakdown)
 
    @staticmethod
    def get_hourly_sales(target_date=None):
        """Hourly sales breakdown for a single day (for the Daily view)."""
        if not target_date:
            target_date = timezone.now().date()
 
        rows = (
            Sale.objects.filter(date=target_date, is_void=False)
            .annotate(hour=ExtractHour('created_at'))
            .values('hour')
            .annotate(total=Sum('total'), count=Count('id'))
            .order_by('hour')
        )
 
        # Fill all 24 hours so chart has a continuous x-axis
        hour_map = {r['hour']: r for r in rows}
        result = []
        for h in range(24):
            label = f"{h:02d}:00"
            row = hour_map.get(h, {})
            result.append({
                'hour': label,
                'revenue': float(row.get('total') or 0),
                'transactions': row.get('count') or 0,
            })
        return result
 
    @staticmethod
    def get_daily_sales(start_date, end_date):
        """Daily sales for line/area chart."""
        rows = Sale.objects.filter(
            date__gte=start_date, date__lte=end_date, is_void=False,
        ).values('date').annotate(
            revenue=Sum('total'),
            transactions=Count('id'),
        ).order_by('date')
 
        return [
            {
                'date': str(r['date']),
                'revenue': float(r['revenue'] or 0),
                'transactions': r['transactions'] or 0,
            }
            for r in rows
        ]
 
    @staticmethod
    def get_sales_vs_wastage(start_date, end_date):
        """Side-by-side sales quantity vs wastage quantity per day."""
        sales_rows = (
            SaleItem.objects.filter(
                sale__date__gte=start_date,
                sale__date__lte=end_date,
                sale__is_void=False,
            )
            .values('sale__date')
            .annotate(sold=Sum('quantity'))
            .order_by('sale__date')
        )
        wastage_rows = (
            Wastage.objects.filter(date__gte=start_date, date__lte=end_date)
            .values('date')
            .annotate(wasted=Sum('quantity'))
            .order_by('date')
        )
 
        sales_map = {str(r['sale__date']): r['sold'] or 0 for r in sales_rows}
        wastage_map = {str(r['date']): r['wasted'] or 0 for r in wastage_rows}
 
        all_dates = sorted(set(list(sales_map.keys()) + list(wastage_map.keys())))
        return [
            {
                'date': d,
                'sold': sales_map.get(d, 0),
                'wasted': wastage_map.get(d, 0),
            }
            for d in all_dates
        ]
 
 
class SalesAnalytics:
    """Detailed sales analytics."""
 
    @staticmethod
    def get_sales_by_date(start_date, end_date):
        sales = Sale.objects.filter(
            date__gte=start_date, date__lte=end_date, is_void=False,
        ).values('date').annotate(
            total_revenue=Sum('total'),
            transaction_count=Count('id'),
            average_transaction=Avg('total'),
        ).order_by('date')
        return list(sales)
 
    @staticmethod
    def get_sales_by_payment_method(start_date, end_date):
        sales = Sale.objects.filter(
            date__gte=start_date, date__lte=end_date, is_void=False,
        ).values('payment_method').annotate(
            total_revenue=Sum('total'),
            transaction_count=Count('id'),
        ).order_by('-total_revenue')
        return list(sales)
 
    @staticmethod
    def get_sales_by_category(start_date, end_date):
        sales = SaleItem.objects.filter(
            sale__date__gte=start_date,
            sale__date__lte=end_date,
            sale__is_void=False,
        ).values('product__category__name').annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('line_total'),
        ).order_by('-total_revenue')
        return list(sales)
 
 
class WastageAnalytics:
    """Detailed wastage analytics."""
 
    @staticmethod
    def get_wastage_breakdown(start_date=None, end_date=None):
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
 
    @staticmethod
    def get_wastage_trend(start_date, end_date):
        wastage = Wastage.objects.filter(
            date__gte=start_date, date__lte=end_date,
        ).values('date').annotate(
            total_loss=Sum('loss'),
            total_items=Sum('quantity'),
            record_count=Count('id'),
        ).order_by('date')
        return list(wastage)
 
    @staticmethod
    def get_wastage_by_product(start_date, end_date, limit=10):
        wastage = Wastage.objects.filter(
            date__gte=start_date, date__lte=end_date,
        ).values('product__id', 'product__name').annotate(
            total_qty=Sum('quantity'),
            total_loss=Sum('loss'),
        ).order_by('-total_loss')[:limit]
        return list(wastage)
 