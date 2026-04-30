from django.db import models
from datetime import date

class Notification(models.Model):
    TYPE_CHOICES = [
        ('assurance', 'Assurance'),
        ('visite', 'Visite Technique'),
        ('autorisation', 'Autorisation de Circulation'),
        ('entretien', 'Entretien'),
        ('retour_voiture', 'Retour de voiture'),
        ('paiement', 'Rappel de paiement'),
        ('inscription_client', 'Inscription Client'),
        ('reservation_online', 'Reservation Online'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Basse'),
        ('medium', 'Moyenne'),
        ('high', 'Haute'),
        ('urgent', 'Urgente'),
    ]

    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    message = models.TextField()
    date_creation = models.DateTimeField(auto_now_add=True)
    est_lue = models.BooleanField(default=False)
    voiture = models.CharField(max_length=150, blank=True, null=True)
    priorite = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    
    # Champs supplémentaires pour retour de voiture et paiements
    client_nom = models.CharField(max_length=200, blank=True, null=True)
    client_telephone = models.CharField(max_length=20, blank=True, null=True)
    date_retour = models.DateField(blank=True, null=True)
    date_echeance = models.DateField(blank=True, null=True)
    urgence = models.BooleanField(default=False, help_text="Notification urgente avec son")
    
    # Champs financiers
    montant_total = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    montant_paye = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    reste_a_payer = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    # anciennement utilisés pour le suivi WhatsApp
    # (ces champs peuvent être migrés ou supprimés si vous lancez
    # `python manage.py makemigrations && python manage.py migrate`)
    
    # Référence à la réservation ou document concerné
    reservation_id = models.IntegerField(blank=True, null=True)
    document_id = models.IntegerField(blank=True, null=True)

    class Meta:
        ordering = ['-urgence', '-date_creation']

    def __str__(self):
        return f"{self.get_type_display()} - {self.voiture or 'N/A'}"
