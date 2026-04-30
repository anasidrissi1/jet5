from django.shortcuts import render

from rest_framework import viewsets, filters
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from datetime import datetime
from .models import Voiture, VoitureImage, Entretien, Assurance, VisiteTechnique, AutorisationCirculation
from .serializers import (
    VoitureSerializer, EntretienSerializer, AssuranceSerializer,
    VisiteTechniqueSerializer, AutorisationCirculationSerializer,
    PublicVoitureSerializer
)


def _parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return None


def _get_public_cars_queryset():
    """Expose admin-managed cars on the public site with a safe fallback.

    If at least one car is explicitly marked public, only those cars are shown.
    Otherwise, all cars except hors service are exposed so the public site stays
    linked to the admin inventory out of the box.
    """
    base_qs = Voiture.objects.exclude(statut='hors_service').order_by('-date_ajout')
    public_qs = base_qs.filter(is_public=True)
    return public_qs if public_qs.exists() else base_qs

class VoitureViewSet(viewsets.ModelViewSet):
    serializer_class = VoitureSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['marque', 'modele', 'immatriculation', 'statut']
    permission_classes = [IsAuthenticated]

    def _sync_gallery_images(self, voiture, replace=False):
        gallery_files = self.request.FILES.getlist('gallery_images')
        if not gallery_files:
            return
        if replace:
            voiture.images.all().delete()
        for image_file in gallery_files:
            VoitureImage.objects.create(voiture=voiture, image=image_file)

    def perform_create(self, serializer):
        voiture = serializer.save()
        self._sync_gallery_images(voiture)

    def perform_update(self, serializer):
        voiture = serializer.save()
        replace_gallery = str(self.request.data.get('replace_gallery_images', '')).lower() in ('1', 'true', 'yes', 'on')
        self._sync_gallery_images(voiture, replace=replace_gallery)

    def get_queryset(self):
        """Return all admin cars for CRUD endpoints, public cars for public access."""
        if getattr(self, 'action', None) == 'public_list':
            qs = _get_public_cars_queryset()
        else:
            qs = Voiture.objects.all().order_by('-date_ajout')

        available = self.request.query_params.get('available')
        if available and str(available).lower() in ('1', 'true', 'yes'):
            from reservations.models import ContratLocation

            today = timezone.now().date()

            # Exclure les voitures avec un contrat actif ou planifié couvrant aujourd'hui ou après
            active_voitures = ContratLocation.objects.filter(
                is_deleted=False,
                statut__in=['en_cours', 'planifiee'],
            ).filter(
                Q(long_duration=True) | Q(date_fin__isnull=True) | Q(date_fin__gte=today)
            ).values_list('voiture_id', flat=True).distinct()

            # Garder uniquement les voitures disponibles et sans contrat actif
            return qs.filter(statut__in=['libre', 'disponible']).exclude(id__in=active_voitures)
        return qs

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='public')
    def public_list(self, request):
        """Listing public filtré (dates -> disponibilité via réservations)."""
        start_date = _parse_date(request.query_params.get('start_date'))
        end_date = _parse_date(request.query_params.get('end_date'))
        city = request.query_params.get('city')
        category = request.query_params.get('category')
        transmission = request.query_params.get('transmission')
        price_max = request.query_params.get('price_max')

        qs = _get_public_cars_queryset()

        # Filtre basique sur statut "libre" si pas de dates
        if not start_date or not end_date:
            qs = qs.filter(statut__in=['libre', 'disponible'])

        # Filtre ville/categorie/transmission/price
        if city and hasattr(qs.model, 'ville'):
            qs = qs.filter(ville__iexact=city)
        if category and hasattr(qs.model, 'categorie'):
            qs = qs.filter(categorie__iexact=category)
        if transmission and hasattr(qs.model, 'transmission'):
            qs = qs.filter(transmission__iexact=transmission)
        if price_max:
            try:
                qs = qs.filter(prix_journalier__lte=float(price_max))
            except Exception:
                pass

        # Dispo par dates via ContratLocation si dates fournies
        if start_date and end_date:
            from reservations.models import ContratLocation
            overlapping = ContratLocation.objects.filter(
                is_deleted=False,
                voiture__in=qs,
                date_fin__gte=start_date,
                date_debut__lte=end_date,
            ).values_list('voiture_id', flat=True)
            qs = qs.exclude(id__in=overlapping)

        # Annoter is_available (true si statut libre/disponible et pas bloqué par dates)
        cars = []
        for car in qs:
            is_free_status = str(getattr(car, 'statut', '')).lower() in ['libre', 'disponible', 'available', 'free']
            cars.append((car, is_free_status))

        data = []
        serializer = PublicVoitureSerializer
        for car, status_ok in cars:
            item = serializer(car).data
            item['is_available'] = status_ok
            data.append(item)

        return Response(data)

    @action(detail=True, methods=['get'], permission_classes=[AllowAny], url_path='public')
    def public_detail(self, request, pk=None):
        """Détail d'une voiture publique par son ID."""
        try:
            car = _get_public_cars_queryset().get(pk=pk)
        except Voiture.DoesNotExist:
            return Response({'detail': 'Voiture introuvable ou non publique.'}, status=404)

        is_free_status = str(getattr(car, 'statut', '')).lower() in ['libre', 'disponible', 'available', 'free']
        data = PublicVoitureSerializer(car).data
        data['is_available'] = is_free_status
        return Response(data)

class EntretienViewSet(viewsets.ModelViewSet):
    queryset = Entretien.objects.all()
    serializer_class = EntretienSerializer
    permission_classes = [IsAuthenticated]

class AssuranceViewSet(viewsets.ModelViewSet):
    queryset = Assurance.objects.all()
    serializer_class = AssuranceSerializer
    permission_classes = [IsAuthenticated]

class VisiteTechniqueViewSet(viewsets.ModelViewSet):
    queryset = VisiteTechnique.objects.all()
    serializer_class = VisiteTechniqueSerializer
    permission_classes = [IsAuthenticated]

class AutorisationCirculationViewSet(viewsets.ModelViewSet):
    queryset = AutorisationCirculation.objects.all()
    serializer_class = AutorisationCirculationSerializer
    permission_classes = [IsAuthenticated]
