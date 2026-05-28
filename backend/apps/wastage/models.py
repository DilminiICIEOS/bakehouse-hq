"""
Wastage models.
"""

from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from apps.core.models import TimeStampedModel, AuditModel


class Wastage(AuditModel):
    """Wastage tracking model."""
    
    WASTAGE_REASONS = [
        ('expired', 'Expired'),
        ('damaged', 'Damaged'),
        ('returned', 'Returned'),
        ('overproduction', 'Overproduction'),
        ('quality_issue', 'Quality Issue'),
        ('other', 'Other'),
    ]
    
    # Basic info
    date = models.DateField(db_index=True)
    reference_number = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
    )
    
    # Product info
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='wastages',
    )
    
    # Wastage details
    quantity = models.IntegerField(
        validators=[MinValueValidator(1)],
    )
    reason = models.CharField(
        max_length=50,
        choices=WASTAGE_REASONS,
    )
    
    # Cost tracking
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Cost per unit',
    )
    loss = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Total loss (quantity * unit_cost)',
        db_index=True,
    )
    
    # Recording info
    recorded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='wastage_records',
    )
    
    # Additional info
    notes = models.TextField(null=True, blank=True)
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_wastages',
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'wastage_wastage'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['product', 'date']),
            models.Index(fields=['reason']),
            models.Index(fields=['is_approved']),
        ]
        verbose_name = 'Wastage'
        verbose_name_plural = 'Wastages'

    def __str__(self):
        return f"Wastage {self.reference_number or self.id} - {self.quantity} {self.product.name}"

    def save(self, *args, **kwargs):
        """Generate reference number if not set."""
        if not self.reference_number:
            self.reference_number = f"WAS-{self.date.strftime('%Y%m%d')}-{timezone.now().timestamp()}"
        
        # Calculate loss if not set
        if not self.loss and self.quantity and self.unit_cost:
            from decimal import Decimal
            self.loss = Decimal(self.quantity) * self.unit_cost
        
        super().save(*args, **kwargs)
        
        # Update product total_wasted
        self.product.total_wasted += self.quantity
        self.product.save(update_fields=['total_wasted'])

    def approve(self, user):
        """Approve the wastage record."""
        self.is_approved = True
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save()
