"""
Views for wastage management.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Sum, Count
from django.utils import timezone

from apps.wastage.models import Wastage
from apps.wastage.serializers import (
    WastageSerializer,
    WastageCreateSerializer,
)
from apps.core.permissions import IsSalesperson, IsManager


class WastageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for wastage management.
    
    GET /api/wastage/ - List all wastages
    POST /api/wastage/ - Record wastage (salesperson+)
    GET /api/wastage/{id}/ - Get wastage details
    """
    queryset = Wastage.objects.select_related('product', 'recorded_by', 'approved_by').order_by('-date')
    permission_classes = [IsAuthenticated, IsSalesperson]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['date', 'product', 'reason', 'is_approved']
    search_fields = ['reference_number', 'notes', 'product__name']
    ordering_fields = ['date', 'loss', 'created_at']
    ordering = ['-date', '-created_at']

    def get_serializer_class(self):
        """Use different serializer for create."""
        if self.action == 'create':
            return WastageCreateSerializer
        return WastageSerializer

    def get_queryset(self):
        """Filter based on user role."""
        queryset = Wastage.objects.select_related('product', 'recorded_by', 'approved_by')
        
        # Salesperson can only see their own records (unless manager+)
        if not self.request.user.is_manager:
            queryset = queryset.filter(recorded_by=self.request.user)
        
        return queryset.order_by('-date')

    def create(self, request, *args, **kwargs):
        """Record wastage."""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        try:
            wastage = serializer.save()
            return Response(
                {
                    'success': True,
                    'message': 'Wastage recorded successfully',
                    'data': WastageSerializer(wastage).data,
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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsManager])
    def approve(self, request, pk=None):
        """
        Approve wastage record (manager+ only).
        
        POST /api/wastage/{id}/approve/
        """
        wastage = self.get_object()
        if wastage.is_approved:
            return Response(
                {
                    'success': False,
                    'error': {'message': 'Wastage already approved.'},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        wastage.approve(request.user)
        return Response(
            {
                'success': True,
                'message': 'Wastage approved successfully',
                'data': WastageSerializer(wastage).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def today(self, request):
        """
        Get today's wastage.
        
        GET /api/wastage/today/
        """
        today = timezone.now().date()
        wastages = self.get_queryset().filter(date=today)
        
        serializer = WastageSerializer(wastages, many=True)
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
        Get wastage summary with statistics.
        
        GET /api/wastage/summary/
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
            total_loss=Sum('loss'),
            total_items=Sum('quantity'),
            total_records=Count('id'),
        )
        
        # Breakdown by reason
        by_reason = {}
        for wastage in queryset:
            reason = wastage.get_reason_display()
            if reason not in by_reason:
                by_reason[reason] = {'count': 0, 'quantity': 0, 'loss': 0}
            by_reason[reason]['count'] += 1
            by_reason[reason]['quantity'] += wastage.quantity
            by_reason[reason]['loss'] += float(wastage.loss)
        
        return Response(
            {
                'success': True,
                'data': {
                    'summary': summary,
                    'by_reason': by_reason,
                },
            },
            status=status.HTTP_200_OK,
        )
