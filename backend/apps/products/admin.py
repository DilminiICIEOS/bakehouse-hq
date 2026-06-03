"""
Admin configuration for products app.
"""

from django.contrib import admin
from apps.products.models import Product, ProductCategory, StockAdjustment, ProductBatch


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']
    ordering = ['display_order', 'name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'cost_price', 'unit', 'stock', 'min_stock', 'max_stock_limit', 'status', 'is_active']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'sku', 'barcode']
    ordering = ['category', 'name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'category', 'description', 'sku', 'barcode', 'image_url')
        }),
        ('Pricing & Inventory', {
            'fields': ('cost_price', 'price', 'unit', 'stock', 'min_stock', 'max_stock_limit', 'total_sold', 'total_wasted')
        }),
        ('Status', {
            'fields': ('is_active', 'last_stock_check'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['total_sold', 'total_wasted', 'last_stock_check', 'created_at', 'updated_at']


@admin.register(ProductBatch)
class ProductBatchAdmin(admin.ModelAdmin):
    list_display = ['product', 'batch_number', 'current_quantity', 'quantity_produced', 'outlet_assignment', 'is_active', 'production_date', 'expiry_date']
    list_filter = ['product', 'outlet_assignment', 'is_active', 'production_date', 'expiry_date']
    search_fields = ['product__name', 'batch_number', 'outlet_assignment']
    ordering = ['product', 'production_date', 'batch_number']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
    list_display = ['product', 'reason', 'quantity', 'old_stock', 'new_stock', 'created_at']
    list_filter = ['reason', 'created_at']
    search_fields = ['product__name', 'notes']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
