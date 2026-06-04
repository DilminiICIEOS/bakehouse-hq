"""
URL configuration for authentication and password remediation endpoints.
Directly routes cryptographic recovery token validations.
file: backend/apps/accounts/urls.py
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.accounts.views import (
    BakeryTokenObtainPairView,
    logout_view,
    current_user_view,
    health_check_view,
    forgot_password_view,
    reset_password_confirm_view,  # 🌟 Added confirm view import mapping link
)

app_name = 'accounts'

urlpatterns = [
    # Core Authentication Endpoints
    path('login/', BakeryTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', logout_view, name='logout'),
    path('me/', current_user_view, name='current_user'),
    
    # Password Remediation Recovery Flows
    path('forgot-password/', forgot_password_view, name='forgot_password'),
    path('reset-password-confirm/', reset_password_confirm_view, name='reset_password_confirm'),  # 🌟 Connected target confirm handler views
    
    path('health/', health_check_view, name='health_check'),
]