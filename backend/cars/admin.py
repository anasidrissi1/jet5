from django.contrib import admin
from .models import Voiture, VoitureImage, Entretien, Assurance, VisiteTechnique, AutorisationCirculation


class VoitureImageInline(admin.TabularInline):
    model = VoitureImage
    extra = 1

# ----------------- VOITURE -----------------
@admin.register(Voiture)
class VoitureAdmin(admin.ModelAdmin):
    list_display = (
        'marque', 'modele', 'immatriculation', 'statut',
        'kilometrage', 'prix_journalier', 'is_public', 'date_ajout',
    )
    list_filter = ('statut', 'marque', 'is_public', 'categorie')
    search_fields = ('marque', 'modele', 'immatriculation')
    inlines = [VoitureImageInline]


# ----------------- ENTRETIEN -----------------
@admin.register(Entretien)
class EntretienAdmin(admin.ModelAdmin):
    list_display = ('voiture', 'type_entretien', 'date_entretien', 'cout', 'prochain_entretien')
    list_filter = ('type_entretien', 'date_entretien')
    search_fields = ('voiture__marque', 'voiture__immatriculation')


# ----------------- ASSURANCE -----------------
@admin.register(Assurance)
class AssuranceAdmin(admin.ModelAdmin):
    list_display = ('voiture', 'date_debut', 'date_expiration', 'valide', 'alerte')
    list_filter = ('valide',)
    search_fields = ('voiture__immatriculation',)


# ----------------- VISITE TECHNIQUE -----------------
@admin.register(VisiteTechnique)
class VisiteTechniqueAdmin(admin.ModelAdmin):
    list_display = ('voiture', 'date_visite', 'date_expiration', 'valide', 'alerte')
    list_filter = ('valide',)
    search_fields = ('voiture__immatriculation',)


# ----------------- AUTORISATION DE CIRCULATION -----------------
@admin.register(AutorisationCirculation)
class AutorisationCirculationAdmin(admin.ModelAdmin):
    list_display = ('voiture', 'date_delivrance', 'date_expiration', 'valide', 'alerte')
    list_filter = ('valide',)
    search_fields = ('voiture__immatriculation',)
