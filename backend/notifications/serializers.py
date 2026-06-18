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

    def _get_voiture_from_reservation(self, reservation_id):
        if not reservation_id:
            return None
        try:
            reservation = ContratLocation.objects.select_related('voiture').get(id=reservation_id)
            return reservation.voiture
        except ContratLocation.DoesNotExist:
            return None

    def get_voiture_details(self, obj):
        voiture = self._get_voiture_from_reservation(obj.reservation_id)

        if not voiture and obj.voiture:
            immatriculation = str(obj.voiture).split(' - ')[0].strip()
            voiture = Voiture.objects.filter(immatriculation=immatriculation).first()

        if voiture:
            return {
                'id': voiture.id,
                'immatriculation': voiture.immatriculation,
                'marque': voiture.marque,
                'modele': voiture.modele,
                'couleur': voiture.couleur,
            }
        return None

    def get_client_details(self, obj):
        if obj.reservation_id:
            try:
                reservation = ContratLocation.objects.select_related('client').get(id=obj.reservation_id)
                client = reservation.client
                return {
                    'id': client.id,
                    'nom': client.nom,
                    'prenom': client.prenom,
                    'email': client.email,
                    'telephone': client.telephone,
                }
            except ContratLocation.DoesNotExist:
                pass

        if obj.client_nom:
            return {'nom_complet': obj.client_nom, 'telephone': obj.client_telephone}

        return None

    def get_reservation_details(self, obj):
        if not obj.reservation_id:
            return None
        try:
            reservation = ContratLocation.objects.get(id=obj.reservation_id)
            return {
                'id': reservation.id,
                'date_debut': reservation.date_debut,
                'date_fin': reservation.date_fin,
                'montant_total': str(reservation.montant_total),
                'statut': reservation.statut,
            }
        except ContratLocation.DoesNotExist:
            return None
