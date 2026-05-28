"""
URL configuration for authentication endpoints.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.accounts.views import (
    BakeryTokenObtainPairView,
    logout_view,
    current_user_view,
    health_check_view,
)

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('login/', BakeryTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', logout_view, name='logout'),
    path('me/', current_user_view, name='current_user'),
    path('health/', health_check_view, name='health_check'),
]
