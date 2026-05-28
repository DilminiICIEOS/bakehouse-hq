"""
URL configuration for user management endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.accounts.views_users import UserViewSet

app_name = 'users'

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]
