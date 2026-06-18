from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Client, ClientDocument, ClientRequest
from .serializers import ClientSerializer, ClientRequestSerializer, ClientRequestApproveSerializer
from notifications.models import Notification


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all().order_by('-date_creation')
    serializer_class = ClientSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'prenom', 'cin_numero', 'permis_numero', 'passeport_numero']
    ordering_fields = ['date_creation', 'nom']
    permission_classes = [IsAuthenticated]

    def _sync_multi_documents(self, client):
        upload_mapping = {
            'cin_documents': ('cin', 'cin_document'),
            'permis_documents': ('permis', 'permis_document'),
            'passeport_documents': ('passeport', 'passeport_document'),
        }

        updated_fields = []
        for request_key, (document_type, legacy_field) in upload_mapping.items():
            uploaded_files = self.request.FILES.getlist(request_key)
            if not uploaded_files:
                continue

            first_document = client.documents.filter(document_type=document_type).order_by('date_ajout').first()
            if not getattr(client, legacy_field) and first_document is None:
                setattr(client, legacy_field, uploaded_files[0])
                updated_fields.append(legacy_field)

            for uploaded_file in uploaded_files:
                ClientDocument.objects.create(
                    client=client,
                    document_type=document_type,
                    file=uploaded_file,
                )

        if updated_fields:
            client.save(update_fields=updated_fields)

    def perform_create(self, serializer):
        client = serializer.save()
        self._sync_multi_documents(client)

    def perform_update(self, serializer):
        client = serializer.save()
        self._sync_multi_documents(client)


class ClientRequestViewSet(viewsets.ModelViewSet):
    """ViewSet pour les demandes d'inscription client"""
    queryset = ClientRequest.objects.filter(status='pending').order_by('-date_creation')
    serializer_class = ClientRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Public can create a request and read the pending counter; moderation stays authenticated.
        if self.action in ['create', 'pending_count']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def create(self, request, *args, **kwargs):
        """Créer une nouvelle demande d'inscription (public, via QR)"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client_request = serializer.save()
        
        # Créer une notification pour l'équipe
        Notification.objects.create(
            type='inscription_client',
            message=f"Nouvelle demande d'inscription : {client_request.nom} {client_request.prenom}",
            client_nom=f"{client_request.nom} {client_request.prenom}",
            client_telephone=client_request.telephone,
            priorite='high',
            urgence=False
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approuver une demande et créer le client (avec modifications possibles)"""
        client_request = self.get_object()
        
        if client_request.status != 'pending':
            return Response(
                {'error': 'Cette demande a déjà été traitée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Récupérer les données modifiées ou utiliser celles de la demande
        data = {
            'nom': request.data.get('nom', client_request.nom),
            'prenom': request.data.get('prenom', client_request.prenom),
            'email': request.data.get('email', client_request.email),
            'telephone': request.data.get('telephone', client_request.telephone),
            'adresse': request.data.get('adresse', client_request.adresse),
            'cin_numero': request.data.get('cin_numero', client_request.cin_numero),
            'cin_date_expiration': request.data.get('cin_date_expiration', client_request.cin_date_expiration),
            'permis_numero': request.data.get('permis_numero', client_request.permis_numero),
            'permis_date_delivrance': request.data.get('permis_date_delivrance', client_request.permis_date_delivrance),
            'passeport_numero': request.data.get('passeport_numero', client_request.passeport_numero),
            'passeport_date_entree': request.data.get('passeport_date_entree', client_request.passeport_date_entree),
            'passeport_date_sortie': request.data.get('passeport_date_sortie', client_request.passeport_date_sortie),
        }
        
        # Créer le client
        client = Client.objects.create(**data)
        
        # Copier les documents si présents
        if client_request.cin_document:
            client.cin_document = client_request.cin_document
        if client_request.permis_document:
            client.permis_document = client_request.permis_document
        if client_request.passeport_document:
            client.passeport_document = client_request.passeport_document
        client.save()
        
        # Marquer la demande comme approuvée
        client_request.status = 'approved'
        client_request.date_traitement = timezone.now()
        client_request.save()
        
        return Response({
            'message': 'Client créé avec succès',
            'client': ClientSerializer(client).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Refuser une demande d'inscription"""
        client_request = self.get_object()
        
        if client_request.status != 'pending':
            return Response(
                {'error': 'Cette demande a déjà été traitée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        client_request.status = 'rejected'
        client_request.date_traitement = timezone.now()
        client_request.save()
        
        return Response({'message': 'Demande refusée'}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def pending_count(self, request):
        """Obtenir le nombre de demandes en attente"""
        count = ClientRequest.objects.filter(status='pending').count()
        return Response({'count': count})
