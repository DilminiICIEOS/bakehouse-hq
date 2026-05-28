"""
Views for reports and analytics.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import datetime, timedelta

from apps.reports.analytics import DashboardAnalytics, SalesAnalytics, WastageAnalytics
from apps.core.permissions import IsManager


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    """
    Get dashboard analytics and KPIs.
    
    GET /api/reports/dashboard/
    """
    try:
        analytics = DashboardAnalytics()
        
        data = {
            'today_stats': analytics.get_today_stats(),
            'period_comparison': analytics.get_period_comparison(days=1),
            'top_products': analytics.get_top_products(limit=5),
            'low_stock_alerts': analytics.get_low_stock_alert(),
            'wastage_breakdown': analytics.get_wastage_breakdown(),
        }
        
        return Response(
            {
                'success': True,
                'data': data,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response(
            {
                'success': False,
                'error': {'message': str(e)},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManager])
def sales_report_view(request):
    """
    Get detailed sales report.
    
    GET /api/reports/sales/?start_date=2024-01-01&end_date=2024-01-31
    """
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date:
            start_date = (timezone.now().date() - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = timezone.now().date().isoformat()
        
        # Convert to date objects
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        analytics = SalesAnalytics()
        
        data = {
            'period': {
                'start_date': start_date,
                'end_date': end_date,
            },
            'by_date': analytics.get_sales_by_date(start, end),
            'by_payment': analytics.get_sales_by_payment_method(start, end),
            'by_category': analytics.get_sales_by_category(start, end),
        }
        
        return Response(
            {
                'success': True,
                'data': data,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response(
            {
                'success': False,
                'error': {'message': str(e)},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManager])
def wastage_report_view(request):
    """
    Get detailed wastage report.
    
    GET /api/reports/wastage/?start_date=2024-01-01&end_date=2024-01-31
    """
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date:
            start_date = (timezone.now().date() - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = timezone.now().date().isoformat()
        
        # Convert to date objects
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        analytics = WastageAnalytics()
        
        data = {
            'period': {
                'start_date': start_date,
                'end_date': end_date,
            },
            'trend': analytics.get_wastage_trend(start, end),
            'by_product': analytics.get_wastage_by_product(start, end, limit=10),
            'by_reason': analytics.get_wastage_breakdown(start, end),
        }
        
        return Response(
            {
                'success': True,
                'data': data,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response(
            {
                'success': False,
                'error': {'message': str(e)},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
