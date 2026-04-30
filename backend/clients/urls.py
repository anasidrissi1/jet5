from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, ClientRequestViewSet

router = DefaultRouter()
router.register('requests', ClientRequestViewSet, basename='client-request')
router.register('', ClientViewSet, basename='client')

urlpatterns = router.urls
