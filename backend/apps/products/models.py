"""
Product models for inventory management.
"""

from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import TimeStampedModel


class ProductCategory(TimeStampedModel):
    """Product categories for organization."""
    
    name = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
    )
    description = models.TextField(null=True, blank=True)
    display_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'products_category'
        ordering = ['display_order', 'name']
        verbose_name = 'Product Category'
        verbose_name_plural = 'Product Categories'

    def __str__(self):
        return self.name


class Product(TimeStampedModel):
    """Product model for bakery items."""
    
    name = models.CharField(max_length=255, db_index=True)
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.PROTECT,
        related_name='products',
    )
    
    # Pricing
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    
    # Inventory
    stock = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        db_index=True,
    )
    min_stock = models.IntegerField(
        default=10,
        validators=[MinValueValidator(0)],
        help_text='Minimum stock level for alerts',
    )
    
    # SKU and tracking
    sku = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
    )
    barcode = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
    )
    
    # Product details
    description = models.TextField(null=True, blank=True)
    image_url = models.URLField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )
    
    # Tracking
    last_stock_check = models.DateTimeField(null=True, blank=True)
    total_sold = models.IntegerField(default=0)
    total_wasted = models.IntegerField(default=0)

    class Meta:
        db_table = 'products_product'
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['stock']),
            models.Index(fields=['sku']),
        ]
        verbose_name = 'Product'
        verbose_name_plural = 'Products'

    def __str__(self):
        return self.name

    @property
    def status(self):
        """Get stock status."""
        if self.stock == 0:
            return 'out_of_stock'
        elif self.stock <= self.min_stock:
            return 'critical'
        elif self.stock <= self.min_stock * 1.5:
            return 'low'
        return 'healthy'

    @property
    def needs_reorder(self):
        """Check if product needs reordering."""
        return self.stock <= self.min_stock

    def adjust_stock(self, quantity, reason='manual_adjustment'):
        """
        Adjust stock quantity.
        
        Args:
            quantity: Positive to increase, negative to decrease
            reason: Reason for adjustment
        """
        old_stock = self.stock
        self.stock = max(0, self.stock + quantity)
        self.save()
        
        # Log adjustment (optional - implement StockAdjustment model)
        return {
            'old_stock': old_stock,
            'new_stock': self.stock,
            'change': quantity,
            'reason': reason,
        }


class StockAdjustment(TimeStampedModel):
    """Track stock adjustments for audit trail."""
    
    ADJUSTMENT_REASONS = [
        ('sale', 'Sale'),
        ('wastage', 'Wastage'),
        ('stock_count', 'Stock Count'),
        ('manual_adjustment', 'Manual Adjustment'),
        ('stock_in', 'Stock In'),
        ('stock_return', 'Stock Return'),
    ]
    
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='adjustments',
    )
    quantity = models.IntegerField(
        validators=[MinValueValidator(-999999)],
    )
    reason = models.CharField(
        max_length=50,
        choices=ADJUSTMENT_REASONS,
    )
    old_stock = models.IntegerField()
    new_stock = models.IntegerField()
    notes = models.TextField(null=True, blank=True)
    
    # Reference to related transaction
    sale = models.ForeignKey(
        'sales.Sale',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_adjustments',
    )
    wastage = models.ForeignKey(
        'wastage.Wastage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_adjustments',
    )
    
    # Audit
    adjusted_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
    )

    class Meta:
        db_table = 'products_stock_adjustment'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'created_at']),
            models.Index(fields=['reason']),
        ]
        verbose_name = 'Stock Adjustment'
        verbose_name_plural = 'Stock Adjustments'

    def __str__(self):
        return f"{self.product.name} ({self.quantity:+d}) - {self.reason}"
