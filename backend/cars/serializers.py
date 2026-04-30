from rest_framework import serializers
from .models import (
    Voiture, VoitureImage, Entretien, Assurance, VisiteTechnique, AutorisationCirculation,
    EntretienPneu, EntretienFrein, EntretienBatterie, EntretienVidange,
    EntretienRevision, PieceRevision
)


class VoitureImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoitureImage
        fields = ['id', 'image', 'date_ajout']


class PublicVoitureSerializer(serializers.ModelSerializer):
    """Serializer épuré pour l'exposition publique (listing et détail)."""

    is_available = serializers.BooleanField(read_only=True)
    images = VoitureImageSerializer(many=True, read_only=True)
    categorie_label = serializers.CharField(source='get_categorie_display', read_only=True)
    transmission_label = serializers.CharField(source='get_transmission_display', read_only=True)

    class Meta:
        model = Voiture
        fields = [
            'id', 'marque', 'modele', 'immatriculation', 'couleur', 'kilometrage',
            'prix_journalier', 'statut', 'image_principale', 'images', 'is_available',
            'categorie', 'categorie_label', 'transmission', 'transmission_label',
            'carburant', 'annee', 'description', 'nombre_places', 'equipements',
        ]


# ----------------- VOITURE -----------------
class VoitureSerializer(serializers.ModelSerializer):
    images = VoitureImageSerializer(many=True, read_only=True)

    class Meta:
        model = Voiture
        fields = '__all__'


# ----------------- ENTRETIEN DÉTAILS SERIALIZERS -----------------

class EntretienPneuSerializer(serializers.ModelSerializer):
    position_display = serializers.CharField(source='get_position_display', read_only=True)
    
    class Meta:
        model = EntretienPneu
        fields = ['id', 'position', 'position_display', 'marque', 'modele', 'prix_unitaire']


class EntretienFreinSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_frein_display', read_only=True)
    prix_total = serializers.ReadOnlyField()
    
    class Meta:
        model = EntretienFrein
        fields = ['id', 'type_frein', 'type_display', 'prix_unitaire', 'prix_total']


class EntretienBatterieSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntretienBatterie
        fields = ['id', 'marque', 'modele', 'prix']


class EntretienVidangeSerializer(serializers.ModelSerializer):
    prix_huile_total = serializers.ReadOnlyField()
    prix_filtres_total = serializers.ReadOnlyField()
    
    class Meta:
        model = EntretienVidange
        fields = [
            'id', 'type_huile', 'quantite_litres', 'prix_total', 'prix_huile_total',
            'filtre_huile', 'prix_filtre_huile',
            'filtre_air', 'prix_filtre_air',
            'filtre_carburant', 'prix_filtre_carburant',
            'prix_filtres_total'
        ]


class PieceRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PieceRevision
        fields = ['id', 'nom_piece', 'prix']


class EntretienRevisionSerializer(serializers.ModelSerializer):
    pieces = PieceRevisionSerializer(many=True, required=False)
    prix_controles_total = serializers.ReadOnlyField()
    
    class Meta:
        model = EntretienRevision
        fields = [
            'id',
            'controle_freins', 'prix_controle_freins',
            'controle_suspension', 'prix_controle_suspension',
            'controle_direction', 'prix_controle_direction',
            'controle_climatisation', 'prix_controle_climatisation',
            'diagnostic_electronique', 'prix_diagnostic_electronique',
            'prix_controles_total',
            'pieces'
        ]


# ----------------- ENTRETIEN PRINCIPAL -----------------
class EntretienSerializer(serializers.ModelSerializer):
    voiture_details = VoitureSerializer(source='voiture', read_only=True)
    
    # Champs calculés (read-only)
    prochain_entretien_km = serializers.ReadOnlyField()
    km_restants = serializers.ReadOnlyField()
    jours_restants = serializers.ReadOnlyField()
    est_urgent = serializers.ReadOnlyField()
    est_proche = serializers.ReadOnlyField()
    
    # Relations détaillées (optionnelles)
    pneus = EntretienPneuSerializer(many=True, required=False)
    freins = EntretienFreinSerializer(many=True, required=False)
    batterie = EntretienBatterieSerializer(required=False, allow_null=True)
    vidange = EntretienVidangeSerializer(required=False, allow_null=True)
    revision = EntretienRevisionSerializer(required=False, allow_null=True)
    
    class Meta:
        model = Entretien
        fields = '__all__'
    
    def create(self, validated_data):
        # Extraire les données des relations
        pneus_data = validated_data.pop('pneus', [])
        freins_data = validated_data.pop('freins', [])
        batterie_data = validated_data.pop('batterie', None)
        vidange_data = validated_data.pop('vidange', None)
        revision_data = validated_data.pop('revision', None)
        
        # Créer l'entretien principal
        entretien = Entretien.objects.create(**validated_data)
        
        # Créer les pneus
        for pneu_data in pneus_data:
            EntretienPneu.objects.create(entretien=entretien, **pneu_data)
        
        # Créer les freins
        for frein_data in freins_data:
            EntretienFrein.objects.create(entretien=entretien, **frein_data)
        
        # Créer la batterie
        if batterie_data:
            EntretienBatterie.objects.create(entretien=entretien, **batterie_data)
        
        # Créer la vidange
        if vidange_data:
            EntretienVidange.objects.create(entretien=entretien, **vidange_data)
        
        # Créer la révision
        if revision_data:
            pieces_data = revision_data.pop('pieces', [])
            revision = EntretienRevision.objects.create(entretien=entretien, **revision_data)
            for piece_data in pieces_data:
                PieceRevision.objects.create(revision=revision, **piece_data)
        
        # Recalculer le coût total
        entretien.cout = self._calculate_total_cost(entretien)
        entretien.save()
        
        return entretien
    
    def update(self, instance, validated_data):
        # Extraire les données des relations
        pneus_data = validated_data.pop('pneus', None)
        freins_data = validated_data.pop('freins', None)
        batterie_data = validated_data.pop('batterie', None)
        vidange_data = validated_data.pop('vidange', None)
        revision_data = validated_data.pop('revision', None)
        
        # Mettre à jour l'entretien principal
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Mettre à jour les pneus
        if pneus_data is not None:
            instance.pneus.all().delete()
            for pneu_data in pneus_data:
                EntretienPneu.objects.create(entretien=instance, **pneu_data)
        
        # Mettre à jour les freins
        if freins_data is not None:
            instance.freins.all().delete()
            for frein_data in freins_data:
                EntretienFrein.objects.create(entretien=instance, **frein_data)
        
        # Mettre à jour la batterie
        if batterie_data is not None:
            if hasattr(instance, 'batterie'):
                instance.batterie.delete()
            if batterie_data:
                EntretienBatterie.objects.create(entretien=instance, **batterie_data)
        
        # Mettre à jour la vidange
        if vidange_data is not None:
            if hasattr(instance, 'vidange'):
                instance.vidange.delete()
            if vidange_data:
                EntretienVidange.objects.create(entretien=instance, **vidange_data)
        
        # Mettre à jour la révision
        if revision_data is not None:
            if hasattr(instance, 'revision'):
                instance.revision.delete()
            if revision_data:
                pieces_data = revision_data.pop('pieces', [])
                revision = EntretienRevision.objects.create(entretien=instance, **revision_data)
                for piece_data in pieces_data:
                    PieceRevision.objects.create(revision=revision, **piece_data)
        
        # Recalculer le coût total
        instance.cout = self._calculate_total_cost(instance)
        instance.save()
        
        return instance
    
    def _calculate_total_cost(self, entretien):
        """Calcule le coût total de l'entretien basé sur les composants"""
        total = float(entretien.main_oeuvre)
        
        # Ajouter le coût des pneus
        for pneu in entretien.pneus.all():
            total += float(pneu.prix_unitaire)
        
        # Ajouter le coût des freins
        for frein in entretien.freins.all():
            total += float(frein.prix_total)
        
        # Ajouter le coût de la batterie
        if hasattr(entretien, 'batterie') and entretien.batterie:
            total += float(entretien.batterie.prix)
        
        # Ajouter le coût de la vidange
        if hasattr(entretien, 'vidange') and entretien.vidange:
            vidange = entretien.vidange
            total += float(vidange.prix_huile_total)
            total += float(vidange.prix_filtres_total)
        
        # Ajouter le coût de la révision
        if hasattr(entretien, 'revision') and entretien.revision:
            revision = entretien.revision
            total += float(revision.prix_controles_total)
            for piece in revision.pieces.all():
                total += float(piece.prix)
        
        return total


# ----------------- ASSURANCE -----------------
class AssuranceSerializer(serializers.ModelSerializer):
    # On ajoute ce champ pour afficher la propriété dynamique du modèle
    alerte = serializers.ReadOnlyField()
    voiture_details = VoitureSerializer(source='voiture', read_only=True)

    class Meta:
        model = Assurance
        fields = '__all__'


# ----------------- VISITE TECHNIQUE -----------------
class VisiteTechniqueSerializer(serializers.ModelSerializer):
    alerte = serializers.ReadOnlyField()
    voiture_details = VoitureSerializer(source='voiture', read_only=True)

    class Meta:
        model = VisiteTechnique
        fields = '__all__'


# ----------------- AUTORISATION DE CIRCULATION -----------------
class AutorisationCirculationSerializer(serializers.ModelSerializer):
    alerte = serializers.ReadOnlyField()

    class Meta:
        model = AutorisationCirculation
        fields = '__all__'
