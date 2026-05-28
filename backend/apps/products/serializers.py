"""
Serializers for products.
"""

from rest_framework import serializers
from apps.products.models import Product, ProductCategory


class ProductCategorySerializer(serializers.ModelSerializer):
    """Serializer for product categories."""
    
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'description', 'display_order', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for product representation."""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category', 'category_name',
            'price', 'stock', 'min_stock', 'status',
            'sku', 'barcode', 'description', 'image_url',
            'is_active', 'last_stock_check', 'total_sold',
            'total_wasted', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'total_sold', 'total_wasted',
            'created_at', 'updated_at', 'last_stock_check',
        ]

    def get_status(self, obj):
        """Get stock status."""
        return obj.status


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating products."""
    
    class Meta:
        model = Product
        fields = [
            'name', 'category', 'price', 'stock', 'min_stock',
            'sku', 'barcode', 'description', 'image_url', 'is_active',
        ]

    def validate_price(self, value):
        """Validate price is positive."""
        if value < 0:
            raise serializers.ValidationError('Price cannot be negative.')
        return value

    def validate_stock(self, value):
        """Validate stock is non-negative."""
        if value < 0:
            raise serializers.ValidationError('Stock cannot be negative.')
        return value

    def validate_min_stock(self, value):
        """Validate min_stock is non-negative."""
        if value < 0:
            raise serializers.ValidationError('Minimum stock cannot be negative.')
        return value


class ProductStockUpdateSerializer(serializers.Serializer):
    """Serializer for updating product stock."""
    
    stock = serializers.IntegerField(min_value=0)
    reason = serializers.CharField(
        max_length=50,
        default='manual_adjustment',
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
    )

    def validate_stock(self, value):
        """Validate stock is non-negative."""
        if value < 0:
            raise serializers.ValidationError('Stock cannot be negative.')
        return value
