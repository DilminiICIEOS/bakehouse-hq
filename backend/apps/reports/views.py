"""
Views for reports and analytics.
"""
 
import io
from datetime import datetime, timedelta
 
from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
 
from apps.reports.analytics import DashboardAnalytics, SalesAnalytics, WastageAnalytics
from apps.core.permissions import IsManager
 
 
def _resolve_date_range(request):
    """
    Resolve start_date / end_date from query params.
    Supports period shortcuts: today, yesterday, last7, last30, this_month, last_month.
    Falls back to today if nothing supplied.
    """
    period = request.query_params.get('period', 'today')
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    today = timezone.now().date()
 
    if start_date and end_date:
        # Custom range supplied directly
        return start_date, end_date
 
    if period == 'yesterday':
        d = today - timedelta(days=1)
        return d.isoformat(), d.isoformat()
    elif period == 'last7':
        return (today - timedelta(days=6)).isoformat(), today.isoformat()
    elif period == 'last30':
        return (today - timedelta(days=29)).isoformat(), today.isoformat()
    elif period == 'this_month':
        start = today.replace(day=1)
        return start.isoformat(), today.isoformat()
    elif period == 'last_month':
        first_this = today.replace(day=1)
        last_prev = first_this - timedelta(days=1)
        start = last_prev.replace(day=1)
        return start.isoformat(), last_prev.isoformat()
    elif period == 'week':
        return (today - timedelta(days=6)).isoformat(), today.isoformat()
    elif period == 'month':
        return (today - timedelta(days=29)).isoformat(), today.isoformat()
    else:  # 'today' or default
        return today.isoformat(), today.isoformat()
 
 
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    """
    Dashboard analytics and KPIs.
 
    GET /api/reports/dashboard/
    Query params:
      period   — today | yesterday | last7 | last30 | this_month | last_month | week | month
      start_date / end_date — YYYY-MM-DD (overrides period)
    """
    try:
        start_date, end_date = _resolve_date_range(request)
        analytics = DashboardAnalytics()
 
        # Hourly data only makes sense for a single-day view
        start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_dt = datetime.strptime(end_date, '%Y-%m-%d').date()
        is_single_day = start_dt == end_dt
 
        data = {
            'period': {'start_date': start_date, 'end_date': end_date},
            'today_stats': analytics.get_today_stats(start_date, end_date),
            'period_comparison': analytics.get_period_comparison(start_date, end_date),
            'top_products': analytics.get_top_products(limit=8, start_date=start_date, end_date=end_date),
            'low_stock_alerts': analytics.get_low_stock_alert(),
            'wastage_breakdown': analytics.get_wastage_breakdown(start_date, end_date),
            'trend': (
                analytics.get_hourly_sales(start_dt)
                if is_single_day
                else analytics.get_daily_sales(start_dt, end_dt)
            ),
            'sales_vs_wastage': analytics.get_sales_vs_wastage(start_dt, end_dt),
        }
 
        return Response({'success': True, 'data': data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'success': False, 'error': {'message': str(e)}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
 
 
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManager])
def sales_report_view(request):
    """
    Detailed sales report.
    GET /api/reports/sales/?start_date=2024-01-01&end_date=2024-01-31
    """
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
 
        if not start_date:
            start_date = (timezone.now().date() - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = timezone.now().date().isoformat()
 
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
 
        analytics = SalesAnalytics()
 
        data = {
            'period': {'start_date': start_date, 'end_date': end_date},
            'by_date': analytics.get_sales_by_date(start, end),
            'by_payment': analytics.get_sales_by_payment_method(start, end),
            'by_category': analytics.get_sales_by_category(start, end),
        }
 
        return Response({'success': True, 'data': data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'success': False, 'error': {'message': str(e)}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
 
 
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManager])
def sales_report_pdf_view(request):
    """PDF sales report. GET /api/reports/sales/pdf/"""
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
 
        if not start_date:
            start_date = (timezone.now().date() - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = timezone.now().date().isoformat()
 
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
 
        analytics = SalesAnalytics()
        rows = analytics.get_sales_by_date(start, end)
        payments = analytics.get_sales_by_payment_method(start, end)
 
        total_revenue = sum(float(item.get('total_revenue') or 0) for item in rows)
        total_transactions = sum(int(item.get('transaction_count') or 0) for item in rows)
 
        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        margin = 40
        y = height - margin
 
        pdf.setFont('Helvetica-Bold', 16)
        pdf.drawString(margin, y, 'Bakery HQ Sales Report')
        y -= 24
        pdf.setFont('Helvetica', 10)
        pdf.drawString(margin, y, f'Period: {start_date} — {end_date}')
        y -= 16
        pdf.drawString(margin, y, f'Generated: {timezone.now().strftime("%Y-%m-%d %H:%M")}')
        y -= 24
        pdf.setFont('Helvetica-Bold', 11)
        pdf.drawString(margin, y, f'Total revenue: {total_revenue:,.2f}')
        y -= 16
        pdf.drawString(margin, y, f'Transactions: {total_transactions}')
        y -= 24
        pdf.setFont('Helvetica-Bold', 10)
        pdf.drawString(margin, y, 'Date')
        pdf.drawString(margin + 170, y, 'Revenue')
        pdf.drawString(margin + 300, y, 'Transactions')
        y -= 14
        pdf.line(margin, y, width - margin, y)
        y -= 20
        pdf.setFont('Helvetica', 10)
        for row in rows:
            if y < 80:
                pdf.showPage()
                y = height - margin
                pdf.setFont('Helvetica', 10)
            row_date = row.get('date')
            if hasattr(row_date, 'strftime'):
                row_date = row_date.strftime('%Y-%m-%d')
            else:
                row_date = str(row_date)
            pdf.drawString(margin, y, row_date)
            pdf.drawRightString(margin + 260, y, f'{float(row.get("total_revenue") or 0):,.2f}')
            pdf.drawRightString(width - margin, y, str(int(row.get('transaction_count') or 0)))
            y -= 16
 
        if payments:
            y -= 28
            pdf.setFont('Helvetica-Bold', 11)
            pdf.drawString(margin, y, 'Payment method breakdown')
            y -= 18
            pdf.setFont('Helvetica', 10)
            for payment in payments:
                if y < 80:
                    pdf.showPage()
                    y = height - margin
                    pdf.setFont('Helvetica', 10)
                method = str(payment.get('payment_method') or 'Unknown')
                pdf.drawString(margin, y, method.capitalize())
                pdf.drawRightString(
                    width - margin, y,
                    f"{float(payment.get('total_revenue') or 0):,.2f} / {int(payment.get('transaction_count') or 0)} tx",
                )
                y -= 16
 
        pdf.showPage()
        pdf.save()
        buffer.seek(0)
 
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="sales-report-{start_date}-{end_date}.pdf"'
        return response
    except Exception as e:
        return Response(
            {'success': False, 'error': {'message': str(e)}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
 
 
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManager])
def wastage_report_view(request):
    """Detailed wastage report. GET /api/reports/wastage/"""
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
 
        if not start_date:
            start_date = (timezone.now().date() - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = timezone.now().date().isoformat()
 
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
 
        analytics = WastageAnalytics()
 
        data = {
            'period': {'start_date': start_date, 'end_date': end_date},
            'trend': analytics.get_wastage_trend(start, end),
            'by_product': analytics.get_wastage_by_product(start, end, limit=10),
            'by_reason': analytics.get_wastage_breakdown(start, end),
        }
 
        return Response({'success': True, 'data': data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'success': False, 'error': {'message': str(e)}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )