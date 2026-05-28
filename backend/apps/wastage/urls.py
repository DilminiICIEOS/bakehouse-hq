"""
URL configuration for wastage endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.wastage.views import WastageViewSet

app_name = 'wastage'

router = DefaultRouter()
router.register(r'', WastageViewSet, basename='wastage')

urlpatterns = [
    path('', include(router.urls)),
]
