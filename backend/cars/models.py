from django.db import models

class Voiture(models.Model):
    STATUT_CHOICES = [
        ('libre', 'Libre'),
        ('louee', 'Louée'),
        ('entretien', 'En entretien'),
        ('hors_service', 'Hors service'),
    ]
    
    CARBURANT_CHOICES = [
        ('essence', 'Essence'),
        ('diesel', 'Diesel'),
        ('hybride', 'Hybride'),
        ('electrique', 'Électrique'),
        ('gpl', 'GPL'),
    ]
    
    TRANSMISSION_CHOICES = [
        ('manuelle', 'Manuelle'),
        ('automatique', 'Automatique'),
    ]
    
    CATEGORIE_CHOICES = [
        ('economique', 'Économique'),
        ('berline', 'Berline'),
        ('suv', 'SUV'),
        ('luxe', 'Luxe'),
        ('utilitaire', 'Utilitaire'),
        ('familiale', 'Familiale'),
    ]

    # Identification
    marque = models.CharField(max_length=100)
    modele = models.CharField(max_length=100)
    immatriculation = models.CharField(max_length=50, unique=True)
    
    # Caractéristiques
    annee = models.PositiveIntegerField(blank=True, null=True, verbose_name="Année")
    couleur = models.CharField(max_length=50, blank=True, null=True)
    categorie = models.CharField(max_length=50, choices=CATEGORIE_CHOICES, blank=True, null=True, verbose_name="Catégorie")
    carburant = models.CharField(max_length=50, choices=CARBURANT_CHOICES, blank=True, null=True)
    transmission = models.CharField(max_length=50, choices=TRANSMISSION_CHOICES, blank=True, null=True)
    
    # Description
    description = models.TextField(blank=True, null=True, help_text="Description du véhicule affichée sur le site public")
    nombre_places = models.PositiveIntegerField(blank=True, null=True, verbose_name="Nombre de places")
    equipements = models.TextField(blank=True, null=True, help_text="Équipements séparés par des virgules (ex: GPS intégré, Caméra 360°, Climatisation)")
    
    # Kilométrage et état
    kilometrage = models.PositiveIntegerField(default=0)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='libre')
    
    # Tarification
    prix_journalier = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Prix journalier")
    
    # Visibilité sur le site public
    is_public = models.BooleanField(
        default=False,
        help_text="Si activé, la voiture sera affichée sur le site public"
    )
    image_principale = models.ImageField(
        upload_to='cars/',
        blank=True,
        null=True,
        help_text="Image principale utilisée sur le site public"
    )
    
    # Maintenance
    dernier_entretien = models.DateField(blank=True, null=True, verbose_name="Dernier entretien")
    prochain_entretien = models.DateField(blank=True, null=True, verbose_name="Prochain entretien")
    
    # Dates système
    date_ajout = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.marque} {self.modele} - {self.immatriculation}"


class VoitureImage(models.Model):
    voiture = models.ForeignKey(Voiture, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='cars/gallery/')
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date_ajout']

    def __str__(self):
        return f"Image {self.voiture.marque} {self.voiture.modele}"

class Entretien(models.Model):
    TYPE_ENTRETIEN_CHOICES = [
        ('vidange', 'Vidange'),
        ('pneus', 'Changement de pneus'),
        ('freins', 'Révision des freins'),
        ('batterie', 'Batterie'),
        ('filtre_air', 'Filtre à air'),
        ('filtre_carburant', 'Filtre à carburant'),
        ('courroie', 'Courroie de distribution'),
        ('climatisation', 'Climatisation'),
        ('controle_general', 'Contrôle général'),
        ('autre', 'Autre'),
    ]

    STATUT_CHOICES = [
        ('a_venir', 'À venir'),
        ('urgent', 'Urgent'),
        ('effectue', 'Effectué'),
        ('en_retard', 'En retard'),
    ]

    voiture = models.ForeignKey(Voiture, on_delete=models.CASCADE, related_name='entretiens')
    type_entretien = models.CharField(max_length=100, choices=TYPE_ENTRETIEN_CHOICES)
    date_entretien = models.DateField()
    cout = models.DecimalField(max_digits=10, decimal_places=2)
    main_oeuvre = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Coût de la main d'œuvre")
    prochain_entretien = models.DateField(null=True, blank=True)
    
    # Nouveaux champs pour le système intelligent
    intervalle_kilometrage = models.PositiveIntegerField(null=True, blank=True, help_text="Intervalle en km pour le prochain entretien")
    intervalle_mois = models.PositiveIntegerField(null=True, blank=True, help_text="Intervalle en mois pour le prochain entretien")
    kilometrage_actuel_voiture = models.PositiveIntegerField(default=0, help_text="Kilométrage de la voiture au moment de l'entretien")
    alerte_avance_km = models.PositiveIntegerField(default=1000, help_text="Alerte X km avant l'échéance")
    alerte_avance_jours = models.PositiveIntegerField(default=30, help_text="Alerte X jours avant l'échéance")
    statut_entretien = models.CharField(max_length=20, choices=STATUT_CHOICES, default='a_venir')
    description = models.TextField(blank=True, null=True, help_text="Description ou notes sur l'entretien")

    class Meta:
        ordering = ['-date_entretien']

    def __str__(self):
        return f"Entretien {self.type_entretien} pour {self.voiture}"
    
    @property
    def prochain_entretien_km(self):
        """Calcule le kilométrage du prochain entretien"""
        if self.intervalle_kilometrage:
            return self.kilometrage_actuel_voiture + self.intervalle_kilometrage
        return None
    
    @property
    def km_restants(self):
        """Calcule les km restants avant le prochain entretien"""
        if self.prochain_entretien_km and self.voiture.kilometrage:
            restants = self.prochain_entretien_km - self.voiture.kilometrage
            return max(0, restants)
        return None
    
    @property
    def jours_restants(self):
        """Calcule les jours restants avant le prochain entretien"""
        if self.prochain_entretien:
            from datetime import date
            delta = self.prochain_entretien - date.today()
            return delta.days
        return None
    
    @property
    def est_urgent(self):
        """Détermine si l'entretien est urgent"""
        km_rest = self.km_restants
        jours_rest = self.jours_restants
        
        if km_rest is not None and km_rest <= 500:
            return True
        if jours_rest is not None and jours_rest <= 7:
            return True
        return False
    
    @property
    def est_proche(self):
        """Détermine si l'entretien est proche"""
        km_rest = self.km_restants
        jours_rest = self.jours_restants
        
        if km_rest is not None and 500 < km_rest <= 2000:
            return True
        if jours_rest is not None and 7 < jours_rest <= 30:
            return True
        return False
    
    def save(self, *args, **kwargs):
        """Override save pour calculer automatiquement le prochain entretien"""
        from datetime import date
        from dateutil.relativedelta import relativedelta
        
        # Calculer le prochain entretien basé sur les mois si intervalle_mois est défini
        if self.intervalle_mois and not self.prochain_entretien:
            self.prochain_entretien = self.date_entretien + relativedelta(months=self.intervalle_mois)
        
        # Mettre à jour le statut automatiquement
        if self.statut_entretien != 'effectue':
            if self.est_urgent:
                self.statut_entretien = 'urgent'
            elif self.jours_restants is not None and self.jours_restants < 0:
                self.statut_entretien = 'en_retard'
            else:
                self.statut_entretien = 'a_venir'
        
        super().save(*args, **kwargs)

class Assurance(models.Model):
    voiture = models.ForeignKey(Voiture, on_delete=models.CASCADE, related_name='assurances')
    compagnie = models.CharField(max_length=200, blank=True, null=True)
    numero_contrat = models.CharField(max_length=100, blank=True, null=True)
    date_debut = models.DateField()
    date_expiration = models.DateField()
    montant = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    document_pdf = models.FileField(upload_to='assurances/', blank=True, null=True)
    valide = models.BooleanField(default=True)
    alerte = models.BooleanField(default=False)

    def __str__(self):
        return f"Assurance pour {self.voiture}"

class VisiteTechnique(models.Model):
    voiture = models.ForeignKey(Voiture, on_delete=models.CASCADE, related_name='visites_techniques')
    date_visite = models.DateField()
    date_expiration = models.DateField()
    montant = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    valide = models.BooleanField(default=True)
    alerte = models.BooleanField(default=False)

    def __str__(self):
        return f"Visite technique pour {self.voiture}"

class AutorisationCirculation(models.Model):
    voiture = models.ForeignKey(Voiture, on_delete=models.CASCADE, related_name='autorisations_circulation')
    date_delivrance = models.DateField()
    date_expiration = models.DateField()
    valide = models.BooleanField(default=True)
    alerte = models.BooleanField(default=False)

    def __str__(self):
        return f"Autorisation de circulation pour {self.voiture}"
from notifications.models import Notification
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import date, timedelta


@receiver(post_save, sender=Assurance)
def creer_notification_assurance(sender, instance, **kwargs):
    today = date.today()
    if instance.date_expiration <= today:
        Notification.objects.create(
            type='assurance',
            message=f"L’assurance de {instance.voiture} a expiré.",
            voiture=str(instance.voiture),
        )
    elif instance.date_expiration <= today + timedelta(days=7):
        Notification.objects.create(
            type='assurance',
            message=f"L’assurance de {instance.voiture} expire bientôt.",
            voiture=str(instance.voiture),
        )


@receiver(post_save, sender=VisiteTechnique)
def creer_notification_visite(sender, instance, **kwargs):
    today = date.today()
    if instance.date_expiration <= today:
        Notification.objects.create(
            type='visite',
            message=f"La visite technique de {instance.voiture} a expiré.",
            voiture=str(instance.voiture),
        )
    elif instance.date_expiration <= today + timedelta(days=7):
        Notification.objects.create(
            type='visite',
            message=f"La visite technique de {instance.voiture} expire bientôt.",
            voiture=str(instance.voiture),
        )


@receiver(post_save, sender=AutorisationCirculation)
def creer_notification_autorisation(sender, instance, **kwargs):
    today = date.today()
    if instance.date_expiration <= today:
        Notification.objects.create(
            type='autorisation',
            message=f"L’autorisation de circulation de {instance.voiture} a expiré.",
            voiture=str(instance.voiture),
        )
    elif instance.date_expiration <= today + timedelta(days=7):
        Notification.objects.create(
            type='autorisation',
            message=f"L’autorisation de {instance.voiture} expire bientôt.",
            voiture=str(instance.voiture),
        )


# ==================== MODÈLES DÉTAILLÉS POUR ENTRETIENS ====================

class EntretienPneu(models.Model):
    """Détails des pneus changés lors d'un entretien"""
    POSITION_CHOICES = [
        ('avant_gauche', 'Avant Gauche'),
        ('avant_droit', 'Avant Droit'),
        ('arriere_gauche', 'Arrière Gauche'),
        ('arriere_droit', 'Arrière Droit'),
    ]
    
    entretien = models.ForeignKey(Entretien, on_delete=models.CASCADE, related_name='pneus')
    position = models.CharField(max_length=20, choices=POSITION_CHOICES)
    marque = models.CharField(max_length=100)
    modele = models.CharField(max_length=100)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        verbose_name = "Pneu d'entretien"
        verbose_name_plural = "Pneus d'entretien"
    
    def __str__(self):
        return f"{self.get_position_display()} - {self.marque} {self.modele}"


class EntretienFrein(models.Model):
    """Détails des freins changés lors d'un entretien"""
    TYPE_CHOICES = [
        ('plaquettes_avant', 'Plaquettes Avant'),
        ('plaquettes_arriere', 'Plaquettes Arrière'),
        ('disques_avant', 'Disques Avant'),
        ('disques_arriere', 'Disques Arrière'),
    ]
    
    entretien = models.ForeignKey(Entretien, on_delete=models.CASCADE, related_name='freins')
    type_frein = models.CharField(max_length=30, choices=TYPE_CHOICES)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        verbose_name = "Frein d'entretien"
        verbose_name_plural = "Freins d'entretien"
    
    def __str__(self):
        return f"{self.get_type_frein_display()}"
    
    @property
    def prix_total(self):
        """Prix total (unitaire × 2 pour avant/arrière)"""
        return self.prix_unitaire * 2


class EntretienBatterie(models.Model):
    """Détails de la batterie changée lors d'un entretien"""
    entretien = models.OneToOneField(Entretien, on_delete=models.CASCADE, related_name='batterie')
    marque = models.CharField(max_length=100)
    modele = models.CharField(max_length=100)
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        verbose_name = "Batterie d'entretien"
        verbose_name_plural = "Batteries d'entretien"
    
    def __str__(self):
        return f"{self.marque} {self.modele}"


class EntretienVidange(models.Model):
    """Détails de la vidange lors d'un entretien"""
    entretien = models.OneToOneField(Entretien, on_delete=models.CASCADE, related_name='vidange')
    type_huile = models.CharField(max_length=50, help_text="Ex: 5W30, 10W40")
    quantite_litres = models.DecimalField(max_digits=5, decimal_places=2)
    prix_total = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Filtres
    filtre_huile = models.BooleanField(default=False)
    prix_filtre_huile = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    filtre_air = models.BooleanField(default=False)
    prix_filtre_air = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    filtre_carburant = models.BooleanField(default=False)
    prix_filtre_carburant = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    class Meta:
        verbose_name = "Vidange d'entretien"
        verbose_name_plural = "Vidanges d'entretien"
    
    def __str__(self):
        return f"Vidange {self.type_huile} - {self.quantite_litres}L"
    
    @property
    def prix_huile_total(self):
        """Prix total de l'huile"""
        return self.prix_total
    
    @property
    def prix_filtres_total(self):
        """Prix total des filtres"""
        total = 0
        if self.filtre_huile and self.prix_filtre_huile:
            total += self.prix_filtre_huile
        if self.filtre_air and self.prix_filtre_air:
            total += self.prix_filtre_air
        if self.filtre_carburant and self.prix_filtre_carburant:
            total += self.prix_filtre_carburant
        return total


class EntretienRevision(models.Model):
    """Détails de la révision générale lors d'un entretien"""
    entretien = models.OneToOneField(Entretien, on_delete=models.CASCADE, related_name='revision')
    
    # Contrôles
    controle_freins = models.BooleanField(default=False)
    prix_controle_freins = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    controle_suspension = models.BooleanField(default=False)
    prix_controle_suspension = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    controle_direction = models.BooleanField(default=False)
    prix_controle_direction = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    controle_climatisation = models.BooleanField(default=False)
    prix_controle_climatisation = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    diagnostic_electronique = models.BooleanField(default=False)
    prix_diagnostic_electronique = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    class Meta:
        verbose_name = "Révision d'entretien"
        verbose_name_plural = "Révisions d'entretien"
    
    def __str__(self):
        return f"Révision générale"
    
    @property
    def prix_controles_total(self):
        """Prix total des contrôles"""
        total = 0
        if self.controle_freins and self.prix_controle_freins:
            total += self.prix_controle_freins
        if self.controle_suspension and self.prix_controle_suspension:
            total += self.prix_controle_suspension
        if self.controle_direction and self.prix_controle_direction:
            total += self.prix_controle_direction
        if self.controle_climatisation and self.prix_controle_climatisation:
            total += self.prix_controle_climatisation
        if self.diagnostic_electronique and self.prix_diagnostic_electronique:
            total += self.prix_diagnostic_electronique
        return total


class PieceRevision(models.Model):
    """Pièces remplacées lors d'une révision"""
    revision = models.ForeignKey(EntretienRevision, on_delete=models.CASCADE, related_name='pieces')
    nom_piece = models.CharField(max_length=200)
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        verbose_name = "Pièce de révision"
        verbose_name_plural = "Pièces de révision"
    
    def __str__(self):
        return f"{self.nom_piece}"


@receiver(post_save, sender=Entretien)
def creer_notification_entretien(sender, instance, **kwargs):
    """
    Crée une notification lorsqu'un entretien est programmé ou urgent.
    (anciennement envoyait un message WhatsApp en cas d'urgence)
    """
    if instance.prochain_entretien:
        Notification.objects.create(
            type='entretien',
            message=f"Un entretien de {instance.voiture} est prévu le {instance.prochain_entretien}.",
            voiture=str(instance.voiture),
        )
    # TODO: toute logique de notification additionnelle peut être ajoutée ici
