from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (
    VoitureViewSet, EntretienViewSet, AssuranceViewSet,
    VisiteTechniqueViewSet, AutorisationCirculationViewSet
)
from .views_rentabilite import rentabilite_voitures

router = DefaultRouter()
router.register(r'voitures', VoitureViewSet, basename='voitures_api')
router.register(r'entretiens', EntretienViewSet, basename='entretiens_api')
router.register(r'assurances', AssuranceViewSet, basename='assurances_api')
router.register(r'visites', VisiteTechniqueViewSet, basename='visites_api')
router.register(r'autorisations', AutorisationCirculationViewSet, basename='autorisations_api')

urlpatterns = router.urls + [
    path('rentabilite/', rentabilite_voitures, name='rentabilite_voitures'),
]
