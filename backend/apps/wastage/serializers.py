"""
Serializers for wastage.
"""

from rest_framework import serializers
from decimal import Decimal
from apps.wastage.models import Wastage
from apps.products.serializers import ProductSerializer


class WastageSerializer(serializers.ModelSerializer):
    """Serializer for wastage representation."""
    
    product_name = serializers.CharField(source='product.name', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True)
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = Wastage
        fields = [
            'id', 'date', 'reference_number', 'product', 'product_name',
            'batch', 'batch_number', 'product_details', 'quantity',
            'reason', 'unit_cost', 'loss', 'recorded_by',
            'recorded_by_name', 'notes', 'is_approved', 'approved_by',
            'approved_by_name', 'approved_at', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'reference_number', 'loss', 'created_at', 'updated_at',
        ]


class WastageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating wastage records."""
    
    class Meta:
        model = Wastage
        fields = [
            'date', 'product', 'batch', 'quantity', 'reason',
            'unit_cost', 'notes',
        ]

    def validate_quantity(self, value):
        """Validate quantity is positive."""
        if value <= 0:
            raise serializers.ValidationError('Quantity must be positive.')
        return value

    def validate_unit_cost(self, value):
        """Validate unit cost is non-negative."""
        if value < 0:
            raise serializers.ValidationError('Unit cost cannot be negative.')
        return value

    def validate(self, attrs):
        """Validate the entire object."""
        product = attrs.get('product')
        batch = attrs.get('batch')
        quantity = attrs.get('quantity')

        if not product or not product.is_active:
            raise serializers.ValidationError('Invalid or inactive product.')

        if batch:
            if batch.product != product:
                raise serializers.ValidationError('Selected batch does not belong to the chosen product.')
            if quantity and batch.current_quantity < quantity:
                raise serializers.ValidationError(
                    f'Batch {batch.batch_number} has insufficient quantity. Available: {batch.current_quantity}.'
                )

        return attrs

    def create(self, validated_data):
        """Create wastage record and decrement product stock."""
        from apps.products.models import StockAdjustment
        
        validated_data['recorded_by'] = self.context['request'].user
        
        # Calculate loss
        quantity = validated_data.get('quantity', 0)
        unit_cost = validated_data.get('unit_cost', 0)
        validated_data['loss'] = Decimal(quantity) * Decimal(unit_cost)
        
        batch = validated_data.get('batch')
        product = validated_data['product']

        # Create wastage record
        wastage = Wastage.objects.create(**validated_data)
        
        # Adjust stock
        old_stock = product.stock
        if batch:
            batch.current_quantity -= quantity
            batch.save()
        product.total_wasted += quantity
        product.update_stock_from_batches()
        
        # Log adjustment
        StockAdjustment.objects.create(
            product=product,
            quantity=-quantity,
            reason='wastage',
            old_stock=old_stock,
            new_stock=product.stock,
            wastage=wastage,
            adjusted_by=self.context['request'].user,
        )
        
        return wastage


class WastageApproveSerializer(serializers.Serializer):
    """Serializer for approving wastage records."""
    pass
