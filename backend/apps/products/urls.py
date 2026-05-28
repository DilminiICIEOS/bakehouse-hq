"""
URL configuration for products endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.products.views import ProductViewSet, ProductCategoryViewSet

app_name = 'products'

router = DefaultRouter()
router.register(r'', ProductViewSet, basename='product')
router.register(r'categories', ProductCategoryViewSet, basename='category')

urlpatterns = [
    path('', include(router.urls)),
]
