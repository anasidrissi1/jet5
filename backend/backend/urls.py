"""
URL configuration for backend project.
"""
from django.contrib import admin
from django.urls import path, re_path, include
from django.http import JsonResponse
from django.http import Http404
from django.conf import settings
from django.conf.urls.static import static

def api_root(request):
    return JsonResponse({'message': 'Welcome to JET5 API'})

def blocked_admin(_request):
    # Ne révèle pas l'existence de l'admin sur /admin.
    raise Http404('Not found')

urlpatterns = [
    path('', include('django_prometheus.urls')),
    path('', api_root),
    re_path(r'^admin/', blocked_admin),
    path(settings.ADMIN_SECRET_PATH, admin.site.urls),
    path('api/', api_root),
    path('api/accounts/', include('accounts.urls')),
    path('api/clients/', include('clients.urls')),
    path('api/cars/', include('cars.urls')),
    path('api/reservations/', include('reservations.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/dashboard/', include('dashboard.urls'))
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Custom error handlers
handler404 = 'backend.views.custom_404'


