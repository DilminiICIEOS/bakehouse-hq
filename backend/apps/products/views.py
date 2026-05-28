"""
Views for products management.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.products.models import Product, ProductCategory
from apps.products.serializers import (
    ProductSerializer,
    ProductCreateUpdateSerializer,
    ProductCategorySerializer,
    ProductStockUpdateSerializer,
)
from apps.core.permissions import IsManager


class ProductCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for product categories.
    """
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [IsAuthenticated]
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
        """Create product (admin only)."""
        if not request.user.is_admin:
            return Response(
                {
                    'success': False,
                    'error': {'message': 'Admin access required.'},
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

    @action(detail=True, methods=['put'], permission_classes=[IsAuthenticated])
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
            stock__lte=models.F('min_stock'),
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
