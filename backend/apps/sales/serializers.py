"""
Serializers for sales.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from decimal import Decimal
from apps.sales.models import Sale, SaleItem, Order, OrderItem, Payment
from apps.products.serializers import ProductSerializer


class SaleItemSerializer(serializers.ModelSerializer):
    """Serializer for sale line items."""
    
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_details = ProductSerializer(source='product', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            'id', 'product', 'product_name', 'product_details',
            'batch', 'batch_number', 'quantity', 'unit_price',
            'discount_amount', 'line_total', 'created_at',
        ]
        read_only_fields = ['id', 'line_total', 'created_at']


class SaleItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating sale items."""
    
    class Meta:
        model = SaleItem
        fields = ['product', 'batch', 'quantity', 'unit_price', 'discount_amount']

    def validate_quantity(self, value):
        """Validate quantity is positive."""
        if value <= 0:
            raise serializers.ValidationError('Quantity must be positive.')
        return value

    def validate(self, attrs):
        batch = attrs.get('batch')
        product = attrs.get('product')
        quantity = attrs.get('quantity')

        if batch and batch.product != product:
            raise serializers.ValidationError('Selected batch does not belong to the chosen product.')

        if batch and quantity and batch.current_quantity < quantity:
            raise serializers.ValidationError(
                f'Batch {batch.batch_number} has insufficient quantity. Available: {batch.current_quantity}.'
            )

        return attrs

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
        """Create sale with items and enforce FIFO batch usage."""
        from apps.products.models import StockAdjustment

        items_data = validated_data.pop('items')

        # Calculate totals
        subtotal = sum(
            Decimal(item['quantity']) * item['unit_price'] - item.get('discount_amount', 0)
            for item in items_data
        )
        total = subtotal + validated_data.get('tax_amount', 0) - validated_data.get('discount_amount', 0)

        with transaction.atomic():
            sale = Sale.objects.create(
                subtotal=subtotal,
                total=total,
                **validated_data,
                cashier=self.context['request'].user,
            )

            # Create items and adjust stock
            for item_data in items_data:
                product = item_data['product']
                batch = item_data.get('batch')
                quantity = item_data['quantity']

                if batch and batch.product != product:
                    raise serializers.ValidationError('Sale batch does not belong to the selected product.')

                if batch and batch.expiry_date and batch.expiry_date < timezone.now().date():
                    raise serializers.ValidationError(f'Batch {batch.batch_number} is expired and cannot be sold.')

                if not batch:
                    batch = product.get_fifo_batch(quantity)
                    if not batch:
                        raise serializers.ValidationError(
                            f'No available batch can fulfill {quantity} units for {product.name}.'
                        )
                    item_data['batch'] = batch

                if batch.current_quantity < quantity:
                    raise serializers.ValidationError(
                        f'Insufficient batch stock for {product.name}. Available: {batch.current_quantity}, Required: {quantity}'
                    )

                SaleItem.objects.create(
                    sale=sale,
                    line_total=Decimal(quantity) * item_data['unit_price'] - item_data.get('discount_amount', 0),
                    **item_data,
                )

                old_stock = product.stock
                batch.current_quantity -= quantity
                batch.save()
                # Persist total_sold immediately before recalculating stock
                product.total_sold += quantity
                product.save(update_fields=['total_sold'])
                product.update_stock_from_batches()

                StockAdjustment.objects.create(
                    product=product,
                    quantity=-quantity,
                    reason='sale',
                    old_stock=old_stock,
                    new_stock=product.stock,
                    sale=sale,
                    adjusted_by=self.context['request'].user,
                )

        return sale


class SaleVoidSerializer(serializers.Serializer):
    """Serializer for voiding a sale."""
    
    reason = serializers.CharField(max_length=500)


class OrderItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating order line items."""

    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'unit_price', 'discount_amount']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Quantity must be positive.')
        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Unit price cannot be negative.')
        return value


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for order representation."""

    customer_name = serializers.CharField(source='customer.name', read_only=True)
    items = OrderItemCreateSerializer(many=True, read_only=True)
    outlet_name = serializers.CharField(source='outlet.name', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer', 'customer_name', 'status',
            'payment_status', 'subtotal', 'tax_amount', 'discount_amount',
            'total', 'pickup_date', 'payment_method', 'outlet', 'outlet_name',
            'notes', 'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'order_number', 'customer', 'customer_name', 'created_at', 'updated_at']


class OrderCreateSerializer(serializers.Serializer):
    """Serializer for creating a new order."""

    customer = serializers.PrimaryKeyRelatedField(queryset=Order._meta.get_field('customer').related_model.objects.all())
    pickup_date = serializers.DateField(required=False)
    payment_method = serializers.CharField(default='cash', max_length=50)
    outlet = serializers.PrimaryKeyRelatedField(queryset=Order._meta.get_field('outlet').related_model.objects.all(), required=False, allow_null=True)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)
    items = OrderItemCreateSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('At least one order item is required.')
        return value

    def create(self, validated_data):
        items = validated_data.pop('items')
        customer = validated_data.pop('customer')

        subtotal = sum(
            Decimal(item['quantity']) * item['unit_price'] - item.get('discount_amount', 0)
            for item in items
        )
        total = subtotal + validated_data.get('tax_amount', Decimal('0')) - validated_data.get('discount_amount', Decimal('0'))

        order = Order.objects.create(
            customer=customer,
            subtotal=subtotal,
            total=total,
            **validated_data,
        )

        for item_data in items:
            OrderItem.objects.create(order=order, **item_data)

        return order


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for payment records."""

    order_number = serializers.CharField(source='order.order_number', read_only=True)
    customer_name = serializers.CharField(source='order.customer.name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'order_number', 'customer_name', 'amount',
            'method', 'transaction_reference', 'status', 'paid_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'paid_at', 'created_at', 'updated_at']


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating payments."""

    class Meta:
        model = Payment
        fields = ['order', 'amount', 'method', 'transaction_reference', 'status']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Payment amount must be positive.')
        return value

    def create(self, validated_data):
        payment = Payment.objects.create(**validated_data)
        if payment.status == 'completed':
            payment.mark_completed()
            order = payment.order
            if order.payment_status != 'paid':
                order.payment_status = 'paid'
                order.update_status()
                order.save(update_fields=['payment_status'])
        return payment
