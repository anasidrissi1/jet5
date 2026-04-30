from rest_framework import serializers
from .models import Client, ClientDocument, ClientRequest


class ClientDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientDocument
        fields = ['id', 'document_type', 'file', 'date_ajout']


class ClientSerializer(serializers.ModelSerializer):
    documents = ClientDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Client
        fields = '__all__'

    def validate(self, attrs):
        """Empêche la création de doublons pour les informations d'identité.

        On vérifie qu'il n'existe pas déjà un autre client avec le même
        email / téléphone / CIN / permis / passeport.
        """

        instance = self.instance

        def current_value(field_name):
            if field_name in attrs:
                return attrs.get(field_name)
            if instance is not None:
                return getattr(instance, field_name, None)
            return None

        def ensure_unique(field_name, label):
            value = current_value(field_name)
            if not value:
                return

            qs = Client.objects.filter(**{field_name: value})
            if instance is not None:
                qs = qs.exclude(pk=instance.pk)

            if qs.exists():
                raise serializers.ValidationError({
                    field_name: f"Un client avec ce {label} existe déjà."
                })

        # On vérifie les principaux identifiants d'un client
        ensure_unique('email', "email")
        ensure_unique('telephone', "numéro de téléphone")
        ensure_unique('cin_numero', "numéro de CIN")
        ensure_unique('permis_numero', "numéro de permis")
        ensure_unique('passeport_numero', "numéro de passeport")

        return attrs


class ClientRequestSerializer(serializers.ModelSerializer):
    """Serializer pour les demandes d'inscription client"""
    class Meta:
        model = ClientRequest
        fields = '__all__'
        read_only_fields = ['status', 'date_creation', 'date_traitement']


class ClientRequestApproveSerializer(serializers.Serializer):
    """Serializer pour approuver une demande avec modifications possibles"""
    nom = serializers.CharField(required=False)
    prenom = serializers.CharField(required=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    telephone = serializers.CharField(required=False, allow_blank=True)
    adresse = serializers.CharField(required=False, allow_blank=True)
    cin_numero = serializers.CharField(required=False, allow_blank=True)
    cin_date_expiration = serializers.DateField(required=False, allow_null=True)
    permis_numero = serializers.CharField(required=False, allow_blank=True)
    permis_date_delivrance = serializers.DateField(required=False, allow_null=True)
    passeport_numero = serializers.CharField(required=False, allow_blank=True)
    passeport_date_entree = serializers.DateField(required=False, allow_null=True)
    passeport_date_sortie = serializers.DateField(required=False, allow_null=True)
