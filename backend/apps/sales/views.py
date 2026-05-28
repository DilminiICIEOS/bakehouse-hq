"""
Views for sales management.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q, Sum, Count
from django.utils import timezone

from apps.sales.models import Sale, SaleItem
from apps.sales.serializers import (
    SaleSerializer,
    SaleCreateSerializer,
    SaleVoidSerializer,
)
from apps.core.permissions import IsSalesperson


class SaleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for sales management.
    
    GET /api/sales/ - List all sales
    POST /api/sales/ - Create new sale (salesperson+)
    GET /api/sales/{id}/ - Get sale details
    """
    queryset = Sale.objects.select_related('cashier').prefetch_related('items').order_by('-date')
    permission_classes = [IsAuthenticated, IsSalesperson]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['date', 'cashier', 'payment_method', 'is_void']
    search_fields = ['reference_number', 'notes']
    ordering_fields = ['date', 'total', 'created_at']
    ordering = ['-date', '-created_at']

    def get_serializer_class(self):
        """Use different serializer for create."""
        if self.action == 'create':
            return SaleCreateSerializer
        return SaleSerializer

    def get_queryset(self):
        """Filter based on user role."""
        user = self.request.user
        queryset = Sale.objects.select_related('cashier').prefetch_related('items')
        
        # Salesperson can only see their own sales
        if not user.is_manager:
            queryset = queryset.filter(cashier=user)
        
        return queryset.order_by('-date')

    def create(self, request, *args, **kwargs):
        """Create a new sale."""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        try:
            sale = serializer.save()
            return Response(
                {
                    'success': True,
                    'message': 'Sale recorded successfully',
                    'data': SaleSerializer(sale).data,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response(
                {
                    'success': False,
                    'error': {'message': str(e)},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def void(self, request, pk=None):
        """
        Void a sale (admin/manager only).
        
        POST /api/sales/{id}/void/
        {
            "reason": "Customer request"
        }
        """
        if not request.user.is_manager:
            return Response(
                {
                    'success': False,
                    'error': {'message': 'Manager access required.'},
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        
        sale = self.get_object()
        if sale.is_void:
            return Response(
                {
                    'success': False,
                    'error': {'message': 'Sale is already voided.'},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        serializer = SaleVoidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        sale.void_sale(request.user, serializer.validated_data['reason'])
        
        return Response(
            {
                'success': True,
                'message': 'Sale voided successfully',
                'data': SaleSerializer(sale).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def today(self, request):
        """
        Get today's sales.
        
        GET /api/sales/today/
        """
        today = timezone.now().date()
        sales = self.get_queryset().filter(date=today)
        
        serializer = SaleSerializer(sales, many=True)
        return Response(
            {
                'success': True,
                'data': serializer.data,
                'count': len(serializer.data),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def summary(self, request):
        """
        Get sales summary with statistics.
        
        GET /api/sales/summary/
        """
        queryset = self.get_queryset()
        
        # Get date range from query params
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Aggregate data
        summary = queryset.aggregate(
            total_sales=Sum('total'),
            total_transactions=Count('id'),
            average_transaction=Sum('total') / Count('id'),
        )
        
        return Response(
            {
                'success': True,
                'data': summary,
            },
            status=status.HTTP_200_OK,
        )
