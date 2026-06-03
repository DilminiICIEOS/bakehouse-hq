"""
Serializers for products.
"""

from rest_framework import serializers
from apps.products.models import (
    Product,
    ProductCategory,
    ProductBatch,
    Outlet,
    DispatchRequest,
    Dispatch,
)


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
            'cost_price', 'price', 'unit', 'stock', 'min_stock', 'max_stock_limit', 'max_outlet_quantity', 'shelf_life_days', 'status',
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
            'name', 'category', 'cost_price', 'price', 'unit',
            'stock', 'min_stock', 'max_stock_limit', 'max_outlet_quantity', 'shelf_life_days',
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


class ProductBatchSerializer(serializers.ModelSerializer):
    """Serializer for product batches."""

    product_name = serializers.CharField(source='product.name', read_only=True)
    is_expired = serializers.BooleanField(source='is_expired', read_only=True)
    days_until_expiry = serializers.IntegerField(source='days_until_expiry', read_only=True)

    class Meta:
        model = ProductBatch
        fields = [
            'id', 'product', 'product_name', 'batch_number',
            'production_date', 'expiry_date',
            'quantity_produced', 'current_quantity',
            'outlet_assignment', 'is_active', 'is_expired', 'days_until_expiry',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductBatchCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating or updating a product batch."""

    class Meta:
        model = ProductBatch
        fields = [
            'product', 'batch_number', 'production_date', 'expiry_date',
            'quantity_produced', 'current_quantity', 'outlet_assignment',
            'is_active',
        ]

    def validate_quantity_produced(self, value):
        if value < 0:
            raise serializers.ValidationError('Produced quantity cannot be negative.')
        return value

    def validate_current_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError('Current quantity cannot be negative.')
        return value

    def validate(self, attrs):
        if 'current_quantity' in attrs and 'quantity_produced' in attrs:
            if attrs['current_quantity'] > attrs['quantity_produced']:
                raise serializers.ValidationError('Current quantity cannot exceed produced quantity.')
        return super().validate(attrs)


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


class OutletSerializer(serializers.ModelSerializer):
    """Serializer for bakery outlets."""

    class Meta:
        model = Outlet
        fields = ['id', 'name', 'address', 'contact_phone', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DispatchRequestSerializer(serializers.ModelSerializer):
    """Serializer for dispatch requests."""

    outlet_name = serializers.CharField(source='outlet.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True)

    class Meta:
        model = DispatchRequest
        fields = [
            'id', 'outlet', 'outlet_name', 'product', 'product_name',
            'quantity_requested', 'status', 'requested_by', 'requested_by_name',
            'approved_by', 'approved_by_name', 'approved_at', 'completed_at', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'requested_by', 'approved_by', 'approved_at', 'completed_at', 'created_at', 'updated_at']

    def create(self, validated_data):
        requested_by = self.context['request'].user
        return DispatchRequest.objects.create(requested_by=requested_by, **validated_data)


class DispatchSerializer(serializers.ModelSerializer):
    """Serializer for dispatch records."""

    request_id = serializers.IntegerField(source='request.id', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    product_name = serializers.CharField(source='batch.product.name', read_only=True)

    class Meta:
        model = Dispatch
        fields = [
            'id', 'request', 'request_id', 'batch', 'batch_number',
            'product_name', 'quantity_dispatched', 'dispatched_by', 'dispatched_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'dispatched_by', 'dispatched_at', 'created_at', 'updated_at']

    def validate(self, data):
        dispatch_request = data.get('request')
        batch = data.get('batch')
        quantity_dispatched = data.get('quantity_dispatched')

        if dispatch_request and batch and dispatch_request.product != batch.product:
            raise serializers.ValidationError('Dispatch batch must match the requested product.')

        if dispatch_request and dispatch_request.status != 'approved':
            raise serializers.ValidationError('Only approved dispatch requests can be dispatched.')

        if quantity_dispatched is not None and quantity_dispatched <= 0:
            raise serializers.ValidationError('Quantity dispatched must be greater than zero.')

        if batch:
            if batch.is_expired:
                raise serializers.ValidationError('Cannot dispatch from an expired batch.')
            if quantity_dispatched is not None and quantity_dispatched > batch.current_quantity:
                raise serializers.ValidationError('Insufficient quantity in the selected batch for dispatch.')

        return data
