"""
Admin configuration for wastage app.
"""

from django.contrib import admin
from apps.wastage.models import Wastage


@admin.register(Wastage)
class WastageAdmin(admin.ModelAdmin):
    list_display = ['reference_number', 'date', 'product', 'quantity', 'loss', 'reason', 'is_approved']
    list_filter = ['date', 'reason', 'is_approved', 'created_at']
    search_fields = ['reference_number', 'product__name', 'notes']
    ordering = ['-date']
    
    fieldsets = (
        ('Wastage Information', {
            'fields': ('date', 'reference_number', 'product', 'quantity', 'reason')
        }),
        ('Cost', {
            'fields': ('unit_cost', 'loss')
        }),
        ('Recording', {
            'fields': ('recorded_by', 'notes')
        }),
        ('Approval', {
            'fields': ('is_approved', 'approved_by', 'approved_at'),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = [
        'reference_number', 'loss', 'created_at', 'updated_at',
        'created_by', 'updated_by',
    ]
