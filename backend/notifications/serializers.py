from rest_framework import serializers
from .models import Notification
from cars.models import Voiture
from clients.models import Client
from reservations.models import ContratLocation

class NotificationSerializer(serializers.ModelSerializer):
    voiture_details = serializers.SerializerMethodField()
    client_details = serializers.SerializerMethodField()
    reservation_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = '__all__'
    
    def get_voiture_details(self, obj):
        """Retourne les détails de la voiture si disponible"""
        voiture = None
        
        # Essayer de récupérer depuis voiture_id
        if hasattr(obj, 'voiture_id') and obj.voiture_id:
            try:
                voiture = Voiture.objects.get(id=obj.voiture_id)
            except Voiture.DoesNotExist:
                pass
        
        # Essayer depuis reservation_id
        if not voiture and hasattr(obj, 'reservation_id') and obj.reservation_id:
            try:
                reservation = ContratLocation.objects.get(id=obj.reservation_id)
                if reservation.voiture_id:
                    voiture = Voiture.objects.get(id=reservation.voiture_id)
            except (ContratLocation.DoesNotExist, Voiture.DoesNotExist):
                pass
        
        if voiture:
            return {
                'id': voiture.id,
                'immatriculation': voiture.immatriculation,
                'marque': voiture.marque,
                'modele': voiture.modele,
                'couleur': voiture.couleur
            }
        return None
    
    def get_client_details(self, obj):
        """Retourne les détails du client si disponible"""
        client = None
        
        # Essayer de récupérer depuis client_id
        if hasattr(obj, 'client_id') and obj.client_id:
            try:
                client = Client.objects.get(id=obj.client_id)
            except Client.DoesNotExist:
                pass
        
        # Essayer depuis reservation_id
        if not client and hasattr(obj, 'reservation_id') and obj.reservation_id:
            try:
                reservation = ContratLocation.objects.get(id=obj.reservation_id)
                if reservation.client_id:
                    client = Client.objects.get(id=reservation.client_id)
            except (ContratLocation.DoesNotExist, Client.DoesNotExist):
                pass
        
        if client:
            return {
                'id': client.id,
                'nom': client.nom,
                'prenom': client.prenom,
                'email': client.email,
                'telephone': client.telephone
            }
        return None
    
    def get_reservation_details(self, obj):
        """Retourne les détails de la réservation si disponible"""
        if hasattr(obj, 'reservation_id') and obj.reservation_id:
            try:
                reservation = ContratLocation.objects.get(id=obj.reservation_id)
                return {
                    'id': reservation.id,
                    'date_debut': reservation.date_debut,
                    'date_fin': reservation.date_fin,
                    'prix_total': str(reservation.prix_total) if hasattr(reservation, 'prix_total') else None,
                    'statut': reservation.statut if hasattr(reservation, 'statut') else None
                }
            except ContratLocation.DoesNotExist:
                pass
        return None
