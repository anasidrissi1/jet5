from django.urls import path
from . import views
from rest_framework.routers import DefaultRouter
from .views import ContratLocationViewSet

router = DefaultRouter()
router.register(r'', ContratLocationViewSet, basename='contrat')


urlpatterns = router.urls

