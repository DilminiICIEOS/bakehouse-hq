"""
Views for products management.
"""

from django.db import transaction
from django.db.models import F
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.products.models import Product, ProductCategory, ProductBatch, Outlet, DispatchRequest, Dispatch
from apps.products.serializers import (
    ProductSerializer,
    ProductCreateUpdateSerializer,
    ProductCategorySerializer,
    ProductStockUpdateSerializer,
    ProductBatchSerializer,
    ProductBatchCreateSerializer,
    OutletSerializer,
    DispatchRequestSerializer,
    DispatchSerializer,
)
from apps.core.permissions import IsFactoryDistributor


class ProductCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for product categories.
    """
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [IsAuthenticated, IsFactoryDistributor]
    filterset_fields = ['name']
    search_fields = ['name', 'description']
    ordering_fields = ['display_order', 'name', 'created_at']
    ordering = ['display_order', 'name']


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for products.
    
    GET /api/products/ - List all products
    POST /api/products/ - Create product (admin only)
    GET /api/products/{id}/ - Get product details
    PUT /api/products/{id}/ - Update product (admin only)
    DELETE /api/products/{id}/ - Delete product (admin only)
    """
    queryset = Product.objects.select_related('category').filter(is_active=True)
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'sku', 'barcode']
    ordering_fields = ['name', 'price', 'stock', 'created_at']
    ordering = ['category', 'name']

    def get_serializer_class(self):
        """Use different serializer for create/update."""
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        return ProductSerializer

    def get_queryset(self):
        """Allow filtering inactive products for admins."""
        queryset = Product.objects.select_related('category')
        if self.request.user.is_admin:
            return queryset
        return queryset.filter(is_active=True)

    def create(self, request, *args, **kwargs):
        """Create product (factory distributor or admin)."""
        if not request.user.is_factory_distributor:
            return Response(
                {
                    'success': False,
                    'error': {'message': 'Factory Distributor access required.'},
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        
        return Response(
            {
                'success': True,
                'message': 'Product created successfully',
                'data': ProductSerializer(product).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        if not request.user.is_factory_distributor:
            return Response(
                {
                    'success': False,
                    'error': {'message': 'Factory Distributor access required.'},
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_factory_distributor:
            return Response(
                {
                    'success': False,
                    'error': {'message': 'Factory Distributor access required.'},
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        product = self.get_object()
        product.is_active = False
        product.save(update_fields=['is_active'])
        return Response(
            {
                'success': True,
                'message': 'Product deactivated successfully',
                'data': ProductSerializer(product).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['put'], permission_classes=[IsAuthenticated, IsFactoryDistributor])
    def update_stock(self, request, pk=None):
        """
        Update product stock.
        
        PUT /api/products/{id}/update_stock/
        {
            "stock": 100,
            "reason": "stock_count",
            "notes": "Physical count completed"
        }
        """
        product = self.get_object()
        serializer = ProductStockUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_stock = product.stock
        product.stock = serializer.validated_data['stock']
        product.save()
        
        return Response(
            {
                'success': True,
                'message': 'Stock updated successfully',
                'data': {
                    'product': ProductSerializer(product).data,
                    'old_stock': old_stock,
                    'new_stock': product.stock,
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def low_stock(self, request):
        """
        Get all products with low stock.
        
        GET /api/products/low_stock/
        """
        low_stock_products = Product.objects.filter(
            is_active=True,
            stock__lte=F('min_stock'),
        ).select_related('category')
        
        serializer = ProductSerializer(low_stock_products, many=True)
        return Response(
            {
                'success': True,
                'data': serializer.data,
                'count': len(serializer.data),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def out_of_stock(self, request):
        """
        Get all out of stock products.
        
        GET /api/products/out_of_stock/
        """
        out_of_stock = Product.objects.filter(
            is_active=True,
            stock=0,
        ).select_related('category')
        
        serializer = ProductSerializer(out_of_stock, many=True)
        return Response(
            {
                'success': True,
                'data': serializer.data,
                'count': len(serializer.data),
            },
            status=status.HTTP_200_OK,
        )


class ProductBatchViewSet(viewsets.ModelViewSet):
    """ViewSet for product batch management."""

    queryset = ProductBatch.objects.select_related('product').filter(is_active=True)
    permission_classes = [IsAuthenticated, IsFactoryDistributor]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['product', 'batch_number', 'outlet_assignment', 'is_active']
    search_fields = ['batch_number', 'outlet_assignment', 'product__name']
    ordering_fields = ['production_date', 'expiry_date', 'current_quantity', 'created_at']
    ordering = ['-production_date', 'batch_number']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductBatchCreateSerializer
        return ProductBatchSerializer

    def get_queryset(self):
        queryset = ProductBatch.objects.select_related('product')
        if self.request.user.is_admin:
            return queryset
        return queryset.filter(is_active=True)

    def create(self, request, *args, **kwargs):
        if not request.user.is_factory_distributor:
            return Response(
                {
                    'success': False,
                    'error': {'message': 'Factory Distributor access required.'},
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        batch = serializer.save()

        return Response(
            {
                'success': True,
                'message': 'Batch created successfully',
                'data': ProductBatchSerializer(batch).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        if not request.user.is_factory_distributor:
            return Response(
                {
                    'success': False,
                    'error': {'message': 'Factory Distributor access required.'},
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_factory_distributor:
            return Response(
                {
                    'success': False,
                    'error': {'message': 'Factory Distributor access required.'},
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        batch = self.get_object()
        batch.is_active = False
        batch.save(update_fields=['is_active'])
        return Response(
            {
                'success': True,
                'message': 'Batch deactivated successfully',
                'data': ProductBatchSerializer(batch).data,
            },
            status=status.HTTP_200_OK,
        )


class OutletViewSet(viewsets.ModelViewSet):
    """Endpoint for managing bakery outlets."""

    queryset = Outlet.objects.all()
    serializer_class = OutletSerializer
    permission_classes = [IsAuthenticated, IsFactoryDistributor]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'address', 'contact_phone']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class DispatchRequestViewSet(viewsets.ModelViewSet):
    """Endpoint for dispatch requests from outlets."""

    queryset = DispatchRequest.objects.select_related('outlet', 'product', 'requested_by', 'approved_by')
    serializer_class = DispatchRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'outlet', 'product']
    search_fields = ['outlet__name', 'product__name', 'requested_by__name']
    ordering_fields = ['created_at', 'quantity_requested', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = self.queryset
        user = self.request.user
        if user.is_factory_distributor or user.is_manager:
            return queryset
        return queryset.filter(requested_by=user)

    def create(self, request, *args, **kwargs):
        if not (request.user.is_manager or request.user.is_factory_distributor or request.user.is_admin):
            return Response(
                {
                    'success': False,
                    'error': {'message': 'Manager or factory distributor access required.'},
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        dispatch_request = serializer.save()

        return Response(
            {
                'success': True,
                'message': 'Dispatch request created successfully',
                'data': DispatchRequestSerializer(dispatch_request).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        request_obj = self.get_object()
        if not (request.user.is_factory_distributor or request.user.is_manager or request.user.is_admin):
            return Response(
                {
                    'success': False,
                    'error': {'message': 'Manager or factory distributor access required.'},
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        request_obj.approve(request.user)
        return Response(
            {
                'success': True,
                'message': 'Dispatch request approved.',
                'data': DispatchRequestSerializer(request_obj).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        request_obj = self.get_object()
        if not (request.user.is_factory_distributor or request.user.is_manager or request.user.is_admin):
            return Response(
                {
                    'success': False,
                    'error': {'message': 'Manager or factory distributor access required.'},
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        request_obj.reject(request.user)
        return Response(
            {
                'success': True,
                'message': 'Dispatch request rejected.',
                'data': DispatchRequestSerializer(request_obj).data,
            },
            status=status.HTTP_200_OK,
        )


class DispatchViewSet(viewsets.ModelViewSet):
    """Endpoint for dispatch records."""

    queryset = Dispatch.objects.select_related('request', 'batch', 'dispatched_by')
    serializer_class = DispatchSerializer
    permission_classes = [IsAuthenticated, IsFactoryDistributor]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['request', 'batch']
    search_fields = ['request__outlet__name', 'batch__batch_number']
    ordering_fields = ['dispatched_at', 'created_at']
    ordering = ['-dispatched_at']

    def perform_create(self, serializer):
        with transaction.atomic():
            dispatch = serializer.save(dispatched_by=self.request.user)
            if dispatch.request and dispatch.request.status != 'dispatched':
                dispatch.request.mark_dispatched()
            return dispatch
