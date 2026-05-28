"""
Serializers for sales.
"""

from rest_framework import serializers
from decimal import Decimal
from apps.sales.models import Sale, SaleItem
from apps.products.serializers import ProductSerializer


class SaleItemSerializer(serializers.ModelSerializer):
    """Serializer for sale line items."""
    
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            'id', 'product', 'product_name', 'product_details',
            'quantity', 'unit_price', 'discount_amount',
            'line_total', 'created_at',
        ]
        read_only_fields = ['id', 'line_total', 'created_at']


class SaleItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating sale items."""
    
    class Meta:
        model = SaleItem
        fields = ['product', 'quantity', 'unit_price', 'discount_amount']

    def validate_quantity(self, value):
        """Validate quantity is positive."""
        if value <= 0:
            raise serializers.ValidationError('Quantity must be positive.')
        return value

    def validate_unit_price(self, value):
        """Validate price is non-negative."""
        if value < 0:
            raise serializers.ValidationError('Unit price cannot be negative.')
        return value


class SaleSerializer(serializers.ModelSerializer):
    """Serializer for sale representation."""
    
    cashier_name = serializers.CharField(source='cashier.name', read_only=True)
    items = SaleItemSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id', 'date', 'reference_number', 'cashier', 'cashier_name',
            'subtotal', 'tax_amount', 'discount_amount', 'total',
            'payment_method', 'items', 'is_void', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'reference_number', 'subtotal', 'created_at', 'updated_at',
        ]


class SaleCreateSerializer(serializers.Serializer):
    """Serializer for creating a new sale."""
    
    date = serializers.DateField(required=True)
    payment_method = serializers.CharField(
        default='cash',
        max_length=50,
    )
    tax_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    discount_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    items = SaleItemCreateSerializer(many=True)
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
    )

    def validate_items(self, value):
        """Validate items list."""
        if not value:
            raise serializers.ValidationError('At least one item is required.')
        return value

    def validate_tax_amount(self, value):
        """Validate tax is non-negative."""
        if value < 0:
            raise serializers.ValidationError('Tax amount cannot be negative.')
        return value

    def validate_discount_amount(self, value):
        """Validate discount is non-negative."""
        if value < 0:
            raise serializers.ValidationError('Discount amount cannot be negative.')
        return value

    def create(self, validated_data):
        """Create sale with items."""
        from apps.sales.models import Sale, SaleItem
        from apps.products.models import StockAdjustment
        
        items_data = validated_data.pop('items')
        
        # Calculate totals
        subtotal = sum(
            Decimal(item['quantity']) * item['unit_price'] - item.get('discount_amount', 0)
            for item in items_data
        )
        total = subtotal + validated_data.get('tax_amount', 0) - validated_data.get('discount_amount', 0)
        
        # Create sale
        sale = Sale.objects.create(
            subtotal=subtotal,
            total=total,
            **validated_data,
            cashier=self.context['request'].user,
        )
        
        # Create items and adjust stock
        for item_data in items_data:
            product = item_data['product']
            quantity = item_data['quantity']
            
            # Check stock
            if product.stock < quantity:
                raise serializers.ValidationError(
                    f'Insufficient stock for {product.name}. Available: {product.stock}, Required: {quantity}'
                )
            
            # Create item
            item = SaleItem.objects.create(
                sale=sale,
                line_total=Decimal(quantity) * item_data['unit_price'] - item_data.get('discount_amount', 0),
                **item_data,
            )
            
            # Adjust stock
            product.stock -= quantity
            product.total_sold += quantity
            product.save()
            
            # Log adjustment
            StockAdjustment.objects.create(
                product=product,
                quantity=-quantity,
                reason='sale',
                old_stock=product.stock + quantity,
                new_stock=product.stock,
                sale=sale,
                adjusted_by=self.context['request'].user,
            )
        
        return sale


class SaleVoidSerializer(serializers.Serializer):
    """Serializer for voiding a sale."""
    
    reason = serializers.CharField(max_length=500)
