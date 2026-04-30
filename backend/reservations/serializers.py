from rest_framework import serializers
from .models import ContratLocation
from datetime import date


class ContratLocationSerializer(serializers.ModelSerializer):
    # Champs supplémentaires pour afficher les noms (legacy)
    client_name = serializers.SerializerMethodField()
    voiture_info = serializers.SerializerMethodField()
    
    # Nouveaux champs pour le frontend
    client_nom = serializers.SerializerMethodField()
    client_prenom = serializers.SerializerMethodField()
    client_telephone = serializers.SerializerMethodField()
    client_email = serializers.SerializerMethodField()
    client_cin = serializers.SerializerMethodField()
    client_permis = serializers.SerializerMethodField()
    client_adresse = serializers.SerializerMethodField()
    client_date_naissance = serializers.SerializerMethodField()
    client_ville = serializers.SerializerMethodField()
    
    voiture_display = serializers.SerializerMethodField()
    voiture_immatriculation = serializers.SerializerMethodField()
    voiture_marque = serializers.SerializerMethodField()
    voiture_modele = serializers.SerializerMethodField()
    voiture_couleur = serializers.SerializerMethodField()
    
    # Conducteur secondaire
    conducteur_secondaire_nom = serializers.SerializerMethodField()
    conducteur_secondaire_telephone = serializers.SerializerMethodField()
    origine_reservation_label = serializers.CharField(source='get_origine_reservation_display', read_only=True)
    
    # Statut dynamique basé sur les dates
    statut = serializers.SerializerMethodField()
    
    class Meta:
        model = ContratLocation
        fields = '__all__'
        read_only_fields = ('montant_total', 'date_creation')

    def validate(self, attrs):
        """Empêche la création de réservations strictement dupliquées.

        On considère comme doublon une autre réservation (non supprimée,
        non archivée) avec le même client, la même voiture, la même
        date de début et la même date de fin (ou même contrat long
        durée ouvert).
        """

        attrs = super().validate(attrs)

        instance = self.instance

        def current_value(field_name):
            if field_name in attrs:
                return attrs.get(field_name)
            if instance is not None:
                return getattr(instance, field_name, None)
            return None

        client = current_value('client')
        voiture = current_value('voiture')
        date_debut = current_value('date_debut')
        date_fin = current_value('date_fin')
        long_duration = current_value('long_duration')

        if client and voiture and date_debut:
            qs = ContratLocation.objects.filter(
                client=client,
                voiture=voiture,
                date_debut=date_debut,
                is_deleted=False,
                is_archived=False,
            )

            if long_duration:
                # Pour un contrat longue durée ouvert, on considère un
                # doublon avec un autre contrat longue durée ouvert
                qs = qs.filter(long_duration=True, date_fin__isnull=True)
            else:
                qs = qs.filter(long_duration=False)
                if date_fin:
                    qs = qs.filter(date_fin=date_fin)

            if instance is not None:
                qs = qs.exclude(pk=instance.pk)

            if qs.exists():
                raise serializers.ValidationError(
                    "Une réservation avec les mêmes informations (client, voiture, dates) existe déjà."
                )

        return attrs
    
    def get_statut(self, obj):
        """Calcule dynamiquement le statut basé sur les dates"""
        today = date.today()
        
        # Si la réservation est annulée ou supprimée, garder le statut
        if obj.statut == 'annule' or obj.is_deleted:
            return obj.statut
        
        # Vérifier les dates
        if obj.date_debut and obj.date_fin:
            if today < obj.date_debut:
                return 'planifiee'  # À venir
            elif obj.date_debut <= today <= obj.date_fin:
                return 'en_cours'  # En cours
            elif today > obj.date_fin:
                return 'termine'  # Terminée
        
        # Par défaut, retourner le statut de la base
        return obj.statut
    
    # === Client ===
    def get_client_name(self, obj):
        """Retourne le nom complet du client (legacy)"""
        if obj.client:
            return f"{obj.client.nom} {obj.client.prenom}"
        return None
    
    def get_client_nom(self, obj):
        """Retourne le nom complet du client"""
        if obj.client:
            prenom = obj.client.prenom or ''
            return f"{obj.client.nom} {prenom}".strip()
        return None
    
    def get_client_prenom(self, obj):
        if obj.client:
            return obj.client.prenom
        return None
    
    def get_client_telephone(self, obj):
        if obj.client:
            return obj.client.telephone
        return None
    
    def get_client_email(self, obj):
        if obj.client:
            return getattr(obj.client, 'email', None)
        return None
    
    def get_client_cin(self, obj):
        if obj.client:
            return getattr(obj.client, 'cin_numero', None)
        return None
    
    def get_client_permis(self, obj):
        if obj.client:
            return getattr(obj.client, 'permis_numero', None)
        return None
    
    def get_client_adresse(self, obj):
        if obj.client:
            return getattr(obj.client, 'adresse', None)
        return None

    def get_client_date_naissance(self, obj):
        if obj.client:
            return getattr(obj.client, 'date_naissance', None)
        return None

    def get_client_ville(self, obj):
        if obj.client:
            return getattr(obj.client, 'ville', None)
        return None
    
    # === Voiture ===
    def get_voiture_immatriculation(self, obj):
        """Retourne l'immatriculation de la voiture"""
        if obj.voiture:
            return obj.voiture.immatriculation
        return None
    
    def get_voiture_info(self, obj):
        """Retourne les infos complètes de la voiture (legacy)"""
        if obj.voiture:
            return f"{obj.voiture.marque} {obj.voiture.modele}"
        return None
    
    def get_voiture_display(self, obj):
        """Retourne les infos complètes de la voiture pour affichage"""
        if obj.voiture:
            return f"{obj.voiture.marque} {obj.voiture.modele}"
        return None
    
    def get_voiture_marque(self, obj):
        if obj.voiture:
            return obj.voiture.marque
        return None
    
    def get_voiture_modele(self, obj):
        if obj.voiture:
            return obj.voiture.modele
        return None
    
    def get_voiture_couleur(self, obj):
        if obj.voiture:
            return getattr(obj.voiture, 'couleur', None)
        return None
    
    # === Conducteur secondaire ===
    def get_conducteur_secondaire_nom(self, obj):
        if obj.conducteur_secondaire:
            prenom = obj.conducteur_secondaire.prenom or ''
            return f"{obj.conducteur_secondaire.nom} {prenom}".strip()
        return None
    
    def get_conducteur_secondaire_telephone(self, obj):
        if obj.conducteur_secondaire:
            return obj.conducteur_secondaire.telephone
        return None


class PublicReservationSerializer(serializers.Serializer):
    car_id = serializers.IntegerField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    pickup_location = serializers.CharField(required=False, allow_blank=True)
    dropoff_location = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.CharField(required=False, default='pay_on_site')

    customer = serializers.DictField(child=serializers.CharField(allow_blank=True), required=True)

    def validate(self, attrs):
        start = attrs.get('start_date')
        end = attrs.get('end_date')
        if end < start:
            raise serializers.ValidationError('end_date must be after start_date')
        return attrs
