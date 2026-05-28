"""
Admin configuration for sales app.
"""

from django.contrib import admin
from apps.sales.models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 1
    readonly_fields = ['line_total', 'created_at']


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['reference_number', 'date', 'cashier', 'total', 'payment_method', 'is_void']
    list_filter = ['date', 'payment_method', 'is_void', 'created_at']
    search_fields = ['reference_number', 'cashier__name', 'notes']
    ordering = ['-date']
    
    fieldsets = (
        ('Sale Information', {
            'fields': ('date', 'reference_number', 'cashier', 'payment_method')
        }),
        ('Totals', {
            'fields': ('subtotal', 'tax_amount', 'discount_amount', 'total')
        }),
        ('Status', {
            'fields': ('is_void', 'void_reason', 'void_by', 'void_at'),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Audit', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['reference_number', 'subtotal', 'created_at', 'updated_at', 'created_by', 'updated_by']
    inlines = [SaleItemInline]


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ['sale', 'product', 'quantity', 'unit_price', 'line_total']
    list_filter = ['created_at', 'sale__date']
    search_fields = ['sale__reference_number', 'product__name']
    readonly_fields = ['line_total', 'created_at']
