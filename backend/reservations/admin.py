from django.contrib import admin
from .models import ContratLocation

@admin.register(ContratLocation)
class ContratLocationAdmin(admin.ModelAdmin):
    list_display = ('client', 'voiture', 'date_debut', 'date_fin', 'nombre_jours', 'montant_total', 'statut', 'origine_reservation')
    list_filter = ('statut', 'origine_reservation', 'date_debut', 'date_fin')
    search_fields = ('client__nom', 'client__prenom', 'voiture__immatriculation')
