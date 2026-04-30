from django.db import models
from django.utils import timezone
from datetime import timedelta
from cars.models import Voiture
from clients.models import Client

class ContratLocation(models.Model):
    STATUT_CHOICES = [
        ('planifiee', 'Planifiée'),
        ('en_cours', 'En cours'),
        ('termine', 'Terminé'),
        ('annule', 'Annulé'),
    ]

    BILLING_MODE_CHOICES = (
        ('JOURNALIER', 'Journalier'),
        ('FORFAIT', 'Forfait'),
    )

    PAYMENT_METHOD_CHOICES = (
        ("CASH", "Espèces"),
        ("CARD", "Carte"),
        ("CHEQUE", "Chèque"),
        ("TPE", "TPE"),
        ("TRANSFER", "Virement"),
        ("OTHER", "Autre"),
    )

    ORIGINE_RESERVATION_CHOICES = (
        ('admin', 'Admin'),
        ('en_ligne', 'En ligne'),
    )

    voiture = models.ForeignKey(Voiture, on_delete=models.CASCADE, related_name='locations')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='locations')
    conducteur_secondaire = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reservations_as_secondary_driver',
        verbose_name='Conducteur Secondaire'
    )

    date_debut = models.DateField(default=timezone.now)
    heure_depart = models.TimeField(null=True, blank=True, help_text="Heure de départ/location")
    nombre_jours = models.PositiveIntegerField(
        null=True,
        blank=True,
        default=1,
        help_text="Nombre de jours de location"
    )
    prix_journalier = models.DecimalField(max_digits=10, decimal_places=2, help_text="Prix par jour")
    jours_prolongation = models.PositiveIntegerField(default=0, blank=True, help_text="Jours d'extension de location")
    tarif_special = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, help_text="Montant total personnalisé (écrase le calcul automatique)")
    montant_total = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    date_fin = models.DateField(null=True, blank=True)
    heure_retour = models.TimeField(null=True, blank=True, help_text="Heure de retour/récupération")
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_cours')
    long_duration = models.BooleanField(default=False, help_text="Contrat longue durée (date de fin facultative)")
    billing_mode = models.CharField(max_length=20, choices=BILLING_MODE_CHOICES, default='JOURNALIER', help_text="Mode de facturation (journalier ou forfait)")

    # Référence administrative
    numero_contrat = models.CharField(max_length=100, blank=True, null=True)

    # Suivi administratif
    avance = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Montant de l'avance payée")
    # Nouveau champ `franchise` remplace l'ancienne notion de caution
    franchise = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Montant de la franchise")
    methode_paiement = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default="CASH", help_text="Méthode de paiement pour l'avance")
    origine_reservation = models.CharField(max_length=20, choices=ORIGINE_RESERVATION_CHOICES, default='admin')
    pickup_location = models.CharField(max_length=255, blank=True, null=True)
    dropoff_location = models.CharField(max_length=255, blank=True, null=True)
    commentaire = models.TextField(blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    
    # Gestion Historique et Corbeille
    is_archived = models.BooleanField(default=False, help_text="Réservation archivée (historique)")
    is_deleted = models.BooleanField(default=False, help_text="Réservation supprimée (corbeille)")
    deleted_at = models.DateTimeField(null=True, blank=True, help_text="Date de suppression")

    def save(self, *args, **kwargs):
        total_jours = None

        # Si une date de fin est fournie avec une date de début, en déduire le nombre de jours (inclusif)
        if self.date_debut and self.date_fin:
            diff = (self.date_fin - self.date_debut).days + 1
            if diff > 0:
                if not self.nombre_jours:
                    self.nombre_jours = diff
                total_jours = self.nombre_jours + (self.jours_prolongation or 0)

        # Si aucune date de fin explicite, calculer depuis le nombre de jours
        if total_jours is None and self.nombre_jours is not None:
            total_jours = self.nombre_jours + (self.jours_prolongation or 0)
            # Pour les contrats longue durée, on laisse la date de fin ouverte
            if self.date_debut and not self.date_fin and total_jours > 0 and not self.long_duration:
                self.date_fin = self.date_debut + timedelta(days=total_jours - 1)

        # Calcul du montant total
        if self.tarif_special is not None and self.tarif_special > 0:
            if self.date_debut and self.date_fin:
                # tarif_special = montant mensuel → multiplier par le nombre de mois
                from math import ceil
                delta = self.date_fin - self.date_debut
                months = max(1, ceil(delta.days / 30))
                self.montant_total = self.tarif_special * months
            else:
                # Pas de dates complètes → utiliser tel quel
                self.montant_total = self.tarif_special
        elif total_jours and self.prix_journalier is not None:
            try:
                self.montant_total = total_jours * self.prix_journalier
            except Exception:
                self.montant_total = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.client.nom} - {self.voiture.immatriculation} ({self.statut})"
