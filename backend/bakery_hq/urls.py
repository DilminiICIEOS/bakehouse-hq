"""
URL configuration for Bakery HQ backend.
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

api_urlpatterns = [
    # Authentication
    path('auth/', include('apps.accounts.urls')),
    # Products
    path('products/', include('apps.products.urls')),
    # Sales
    path('sales/', include('apps.sales.urls')),
    # Wastage
    path('wastage/', include('apps.wastage.urls')),
    # Reports
    path('reports/', include('apps.reports.urls')),
    # Users
    path('users/', include('apps.accounts.users_urls')),
]

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API v1
    path('api/v1/', include(api_urlpatterns)),
    
    # API Schema
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # Health check
    path('api/health/', lambda r: __import__('rest_framework').response.Response({'status': 'ok'})),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

admin.site.site_header = 'Bakery HQ Administration'
admin.site.site_title = 'Bakery HQ Admin'
