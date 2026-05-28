"""
Serializers for reports.
"""

from rest_framework import serializers


class DashboardSerializer(serializers.Serializer):
    """Dashboard analytics serializer."""
    
    today_stats = serializers.DictField()
    period_comparison = serializers.DictField()
    top_products = serializers.ListField()
    low_stock_alerts = serializers.ListField()
    wastage_breakdown = serializers.ListField()


class SalesReportSerializer(serializers.Serializer):
    """Sales report serializer."""
    
    period = serializers.DictField()
    by_date = serializers.ListField()
    by_payment = serializers.ListField()
    by_category = serializers.ListField()
    summary = serializers.DictField()


class WastageReportSerializer(serializers.Serializer):
    """Wastage report serializer."""
    
    period = serializers.DictField()
    trend = serializers.ListField()
    by_product = serializers.ListField()
    by_reason = serializers.ListField()
    summary = serializers.DictField()
