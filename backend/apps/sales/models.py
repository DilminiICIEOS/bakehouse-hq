"""
Sales models.
"""

from django.db import models
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
        """Void the sale."""
        self.is_void = True
        self.void_reason = reason
        self.void_by = user
        self.void_at = timezone.now()
        self.save()
        
        # Restore stock
        for item in self.items.all():
            item.product.stock += item.quantity
            item.product.save()


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
