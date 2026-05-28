"""
Admin configuration for products app.
"""

from django.contrib import admin
from apps.products.models import Product, ProductCategory, StockAdjustment


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']
    ordering = ['display_order', 'name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'stock', 'min_stock', 'status', 'is_active']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'sku', 'barcode']
    ordering = ['category', 'name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'category', 'description', 'sku', 'barcode', 'image_url')
        }),
        ('Pricing & Inventory', {
            'fields': ('price', 'stock', 'min_stock', 'total_sold', 'total_wasted')
        }),
        ('Status', {
            'fields': ('is_active', 'last_stock_check'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['total_sold', 'total_wasted', 'last_stock_check', 'created_at', 'updated_at']


@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
    list_display = ['product', 'reason', 'quantity', 'old_stock', 'new_stock', 'created_at']
    list_filter = ['reason', 'created_at']
    search_fields = ['product__name', 'notes']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
