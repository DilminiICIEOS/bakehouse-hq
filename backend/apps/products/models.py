"""
Product models for inventory management.
"""

from datetime import timedelta

from django.db import models
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.core.validators import MinValueValidator
from django.utils import timezone
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
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0,
        help_text='Cost price per unit',
    )
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
    max_stock_limit = models.IntegerField(
        default=100,
        validators=[MinValueValidator(0)],
        help_text='Maximum stock limit for outlets',
    )
    max_outlet_quantity = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Maximum quantity allowed per outlet assignment',
    )
    shelf_life_days = models.IntegerField(
        default=3,
        validators=[MinValueValidator(0)],
        help_text='Default shelf life in days for new batches',
    )
    unit = models.CharField(
        max_length=50,
        default='piece',
        help_text='Product unit of measurement',
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
        
        return {
            'old_stock': old_stock,
            'new_stock': self.stock,
            'change': quantity,
            'reason': reason,
        }

    def available_batches(self):
        """Return active, non-expired batches sorted by expiry date for FIFO."""
        today = timezone.now().date()
        return self.batches.filter(
            is_active=True,
            current_quantity__gt=0,
        ).exclude(
            expiry_date__lt=today,
        ).order_by('expiry_date', 'production_date')

    def get_fifo_batch(self, quantity=1):
        """Get the earliest batch able to satisfy the requested quantity."""
        return self.available_batches().filter(current_quantity__gte=quantity).first()

    def update_stock_from_batches(self):
        """Recalculate total stock from active batches."""
        batch_stock = self.batches.filter(is_active=True).aggregate(
            total=Coalesce(Sum('current_quantity'), 0)
        )['total']
        self.stock = batch_stock
        self.save(update_fields=['stock'])


class ProductBatch(TimeStampedModel):
    """Batch record for product inventory tracking."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='batches',
    )
    batch_number = models.CharField(
        max_length=100,
        db_index=True,
        help_text='Batch identifier',
    )
    production_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    quantity_produced = models.IntegerField(
        validators=[MinValueValidator(0)],
    )
    current_quantity = models.IntegerField(
        validators=[MinValueValidator(0)],
    )
    outlet_assignment = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Outlet or location assigned to this batch',
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'products_productbatch'
        ordering = ['-production_date', 'batch_number']
        indexes = [
            models.Index(fields=['product', 'batch_number']),
            models.Index(fields=['current_quantity']),
        ]
        verbose_name = 'Product Batch'
        verbose_name_plural = 'Product Batches'

    def __str__(self):
        return f"{self.product.name} - {self.batch_number}"

    def save(self, *args, **kwargs):
        if self.current_quantity is None:
            self.current_quantity = self.quantity_produced
        if not self.expiry_date and self.production_date and self.product and self.product.shelf_life_days is not None:
            self.expiry_date = self.production_date + timedelta(days=self.product.shelf_life_days)
        super().save(*args, **kwargs)
        self.product.update_stock_from_batches()

    @property
    def is_expired(self):
        return bool(self.expiry_date and self.expiry_date < timezone.now().date())

    @property
    def days_until_expiry(self):
        if not self.expiry_date:
            return None
        return (self.expiry_date - timezone.now().date()).days

    def consume(self, quantity):
        if self.is_expired:
            raise ValueError('Cannot consume an expired batch.')
        quantity = max(0, quantity)
        if quantity > self.current_quantity:
            raise ValueError('Insufficient batch quantity')
        self.current_quantity -= quantity
        self.save()


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


class Outlet(TimeStampedModel):
    """Bakery outlet location for dispatch and pickup."""

    name = models.CharField(max_length=255)
    address = models.TextField(null=True, blank=True)
    contact_phone = models.CharField(max_length=50, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'products_outlet'
        ordering = ['name']
        verbose_name = 'Outlet'
        verbose_name_plural = 'Outlets'

    def __str__(self):
        return self.name


class DispatchRequest(TimeStampedModel):
    """Request for product dispatch to an outlet."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('dispatched', 'Dispatched'),
        ('completed', 'Completed'),
    ]

    outlet = models.ForeignKey(
        Outlet,
        on_delete=models.PROTECT,
        related_name='dispatch_requests',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='dispatch_requests',
    )
    quantity_requested = models.IntegerField(validators=[MinValueValidator(1)])
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
    )
    requested_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='dispatch_requests',
    )
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_dispatch_requests',
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'products_dispatchrequest'
        ordering = ['-created_at']
        verbose_name = 'Dispatch Request'
        verbose_name_plural = 'Dispatch Requests'

    def approve(self, user):
        self.status = 'approved'
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save(update_fields=['status', 'approved_by', 'approved_at'])

    def reject(self, user):
        self.status = 'rejected'
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save(update_fields=['status', 'approved_by', 'approved_at'])

    def mark_dispatched(self):
        self.status = 'dispatched'
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])


class Dispatch(TimeStampedModel):
    """Dispatched batch details for an approved request."""

    request = models.ForeignKey(
        DispatchRequest,
        on_delete=models.CASCADE,
        related_name='dispatches',
    )
    batch = models.ForeignKey(
        ProductBatch,
        on_delete=models.PROTECT,
        related_name='dispatches',
    )
    quantity_dispatched = models.IntegerField(validators=[MinValueValidator(1)])
    dispatched_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dispatches',
    )
    dispatched_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'products_dispatch'
        ordering = ['-dispatched_at', '-created_at']
        verbose_name = 'Dispatch'
        verbose_name_plural = 'Dispatches'

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if not self.dispatched_at:
            self.dispatched_at = timezone.now()

        if is_new:
            if self.batch.is_expired:
                raise ValueError('Cannot dispatch from an expired batch.')
            if self.quantity_dispatched > self.batch.current_quantity:
                raise ValueError('Insufficient batch quantity.')
            self.batch.current_quantity -= self.quantity_dispatched
            self.batch.save()

        super().save(*args, **kwargs)
