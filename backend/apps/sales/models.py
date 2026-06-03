"""
Sales models.
"""

from django.db import models, transaction
from django.db.models import Sum
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
from apps.core.models import TimeStampedModel, AuditModel


class Sale(AuditModel):
    """Sales transaction model."""
    
    # Basic info
    date = models.DateField(db_index=True)
    reference_number = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
    )
    
    # Transaction details
    cashier = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='sales',
        help_text='User who recorded this sale',
    )
    
    # Totals
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        db_index=True,
    )
    
    # Payment
    payment_method = models.CharField(
        max_length=50,
        default='cash',
        choices=[
            ('cash', 'Cash'),
            ('card', 'Card'),
            ('check', 'Check'),
            ('online', 'Online'),
            ('other', 'Other'),
        ],
    )
    
    # Status
    is_void = models.BooleanField(default=False)
    void_reason = models.TextField(null=True, blank=True)
    void_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='void_sales',
    )
    void_at = models.DateTimeField(null=True, blank=True)
    
    # Notes
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'sales_sale'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['cashier', 'date']),
            models.Index(fields=['is_void']),
        ]
        verbose_name = 'Sale'
        verbose_name_plural = 'Sales'

    def __str__(self):
        return f"Sale {self.reference_number or self.id} - {self.total}"

    def save(self, *args, **kwargs):
        """Generate reference number if not set."""
        if not self.reference_number:
            self.reference_number = f"SAL-{self.date.strftime('%Y%m%d')}-{self.id or timezone.now().timestamp()}"
        super().save(*args, **kwargs)

    def void_sale(self, user, reason):
        """Void the sale and restore stock."""
        with transaction.atomic():
            self.is_void = True
            self.void_reason = reason
            self.void_by = user
            self.void_at = timezone.now()
            self.save()

            for item in self.items.select_related('product', 'batch').all():
                product = item.product
                product.total_sold = max(0, product.total_sold - item.quantity)

                if item.batch is not None:
                    batch = item.batch
                    batch.current_quantity += item.quantity
                    batch.save()
                    product.update_stock_from_batches()
                else:
                    product.stock += item.quantity
                    product.save(update_fields=['stock', 'total_sold'])


class SaleItem(TimeStampedModel):
    """Individual line items in a sale."""
    
    sale = models.ForeignKey(
        Sale,
        on_delete=models.CASCADE,
        related_name='items',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='sale_items',
    )
    batch = models.ForeignKey(
        'products.ProductBatch',
        on_delete=models.PROTECT,
        related_name='sale_items',
        null=True,
        blank=True,
    )
    
    # Quantity and pricing
    quantity = models.IntegerField(
        validators=[MinValueValidator(1)],
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    
    # Discount at item level
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )

    class Meta:
        db_table = 'sales_item'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['sale']),
            models.Index(fields=['product']),
        ]
        verbose_name = 'Sale Item'
        verbose_name_plural = 'Sale Items'

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"

    def save(self, *args, **kwargs):
        """Calculate line_total automatically."""
        self.line_total = (Decimal(self.quantity) * self.unit_price) - self.discount_amount
        super().save(*args, **kwargs)


class Order(AuditModel):
    """Customer order workflow model."""

    ORDER_STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('canceled', 'Canceled'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('partial', 'Partial'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    ]

    customer = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='orders',
    )
    order_number = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=ORDER_STATUS_CHOICES,
        default='draft',
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='pending',
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        db_index=True,
    )
    pickup_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(
        max_length=50,
        default='cash',
        choices=[
            ('cash', 'Cash'),
            ('card', 'Card'),
            ('online', 'Online'),
            ('other', 'Other'),
        ],
    )
    outlet = models.ForeignKey(
        'products.Outlet',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='orders',
    )
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'sales_order'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order_number']),
            models.Index(fields=['status']),
            models.Index(fields=['payment_status']),
        ]
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'

    def __str__(self):
        return f"Order {self.order_number or self.id} - {self.customer.email}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = f"ORD-{timezone.now().strftime('%Y%m%d')}-{int(timezone.now().timestamp())}"
        super().save(*args, **kwargs)

    def update_status(self):
        if self.payment_status == 'paid' and self.status == 'confirmed':
            self.status = 'processing'
            self.save(update_fields=['status'])

    @property
    def due_amount(self):
        return max(Decimal(0), self.total - self.payments.aggregate(
            paid=Sum('amount')
        )['paid'] or Decimal(0))


class OrderItem(TimeStampedModel):
    """Individual line items linked to a customer order."""

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='order_items',
    )
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    class Meta:
        db_table = 'sales_orderitem'
        ordering = ['created_at']
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'

    def save(self, *args, **kwargs):
        self.line_total = (Decimal(self.quantity) * self.unit_price) - self.discount_amount
        super().save(*args, **kwargs)


class Payment(TimeStampedModel):
    """Payment record for orders."""

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='payments',
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    method = models.CharField(
        max_length=50,
        choices=[
            ('cash', 'Cash'),
            ('card', 'Card'),
            ('online', 'Online'),
            ('other', 'Other'),
        ],
        default='cash',
    )
    transaction_reference = models.CharField(max_length=120, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='pending',
    )
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'sales_payment'
        ordering = ['-created_at']
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'

    def save(self, *args, **kwargs):
        if self.status == 'completed' and not self.paid_at:
            self.paid_at = timezone.now()
        super().save(*args, **kwargs)

    def mark_completed(self):
        self.status = 'completed'
        self.paid_at = timezone.now()
        self.save(update_fields=['status', 'paid_at'])
