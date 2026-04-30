from datetime import date, timedelta
from cars.models import Assurance, VisiteTechnique, AutorisationCirculation
from .models import Notification

def verifier_alertes():
    aujourd_hui = date.today()
    seuil_7j = aujourd_hui + timedelta(days=7)
    seuil_48h = aujourd_hui + timedelta(days=2)

    # ---- Vérification Assurance ----
    for assurance in Assurance.objects.all():
        if assurance.date_expiration <= aujourd_hui:
            Notification.objects.get_or_create(
                type='assurance',
                voiture=str(assurance.voiture),
                message=f"L'assurance de {assurance.voiture} est expirée !",
            )
        elif assurance.date_expiration <= seuil_48h:
            Notification.objects.get_or_create(
                type='assurance',
                voiture=str(assurance.voiture),
                message=f"L'assurance de {assurance.voiture} expire dans moins de 48h.",
            )
        elif assurance.date_expiration <= seuil_7j:
            Notification.objects.get_or_create(
                type='assurance',
                voiture=str(assurance.voiture),
                message=f"L'assurance de {assurance.voiture} expire dans moins de 7 jours.",
            )

    # ---- Vérification Visite Technique ----
    for visite in VisiteTechnique.objects.all():
        if visite.date_expiration <= aujourd_hui:
            Notification.objects.get_or_create(
                type='visite',
                voiture=str(visite.voiture),
                message=f"La visite technique de {visite.voiture} est expirée !",
            )
        elif visite.date_expiration <= seuil_48h:
            Notification.objects.get_or_create(
                type='visite',
                voiture=str(visite.voiture),
                message=f"La visite technique de {visite.voiture} expire dans moins de 48h.",
            )
        elif visite.date_expiration <= seuil_7j:
            Notification.objects.get_or_create(
                type='visite',
                voiture=str(visite.voiture),
                message=f"La visite technique de {visite.voiture} expire dans moins de 7 jours.",
            )

    # ---- Vérification Autorisation Circulation ----
    for auto in AutorisationCirculation.objects.all():
        if auto.date_expiration <= aujourd_hui:
            Notification.objects.get_or_create(
                type='autorisation',
                voiture=str(auto.voiture),
                message=f"L'autorisation de circulation de {auto.voiture} est expirée !",
            )
        elif auto.date_expiration <= seuil_48h:
            Notification.objects.get_or_create(
                type='autorisation',
                voiture=str(auto.voiture),
                message=f"L'autorisation de circulation de {auto.voiture} expire dans moins de 48h.",
            )
        elif auto.date_expiration <= seuil_7j:
            Notification.objects.get_or_create(
                type='autorisation',
                voiture=str(auto.voiture),
                message=f"L'autorisation de circulation de {auto.voiture} expire dans moins de 7 jours.",
            )
