"""
Utilitaires pour la génération automatique de notifications
"""
from datetime import date, timedelta
from django.utils import timezone
from .models import Notification
from reservations.models import ContratLocation
from cars.models import VisiteTechnique, Assurance, AutorisationCirculation
import os

# note: le code WhatsApp a été désactivé car non utilisé.


def generer_notifications_retours():
    """Génère les notifications pour les retours de voiture imminents"""
    today = date.today()
    demain = today + timedelta(days=1)
    dans_3_jours = today + timedelta(days=3)
    
    # Réservations se terminant aujourd'hui (URGENT)
    reservations_aujourdhui = ContratLocation.objects.filter(
        date_fin=today,
        statut__in=['planifiee', 'en_cours']
    )
    
    for res in reservations_aujourdhui:
        # Vérifier si notification n'existe pas déjà
        if not Notification.objects.filter(
            type='retour_voiture',
            reservation_id=res.id,
            date_retour=today
        ).exists():
            
            reste = float(res.montant_total - res.avance) if res.montant_total and res.avance else 0
            
            message = f"🚗 Retour prévu AUJOURD'HUI - Client: {res.client.nom} {res.client.prenom}"
            if reste > 0:
                message += f" | ⚠️ RESTE À PAYER: {reste:.2f} DH"
            
            Notification.objects.create(
                type='retour_voiture',
                message=message,
                voiture=f"{res.voiture.immatriculation} - {res.voiture.marque} {res.voiture.modele}",
                client_nom=f"{res.client.nom} {res.client.prenom}",
                client_telephone=res.client.telephone,
                date_retour=today,
                urgence=True,
                priorite='urgent',
                montant_total=res.montant_total,
                montant_paye=res.avance,
                reste_a_payer=reste,
                reservation_id=res.id
            )
    
    # Réservations se terminant demain
    reservations_demain = ContratLocation.objects.filter(
        date_fin=demain,
        statut__in=['planifiee', 'en_cours']
    )
    
    for res in reservations_demain:
        if not Notification.objects.filter(
            type='retour_voiture',
            reservation_id=res.id,
            date_retour=demain
        ).exists():
            
            reste = float(res.montant_total - res.avance) if res.montant_total and res.avance else 0
            
            message = f"🚗 Retour prévu DEMAIN (J-1) - Client: {res.client.nom} {res.client.prenom}"
            if reste > 0:
                message += f" | Reste à payer: {reste:.2f} DH"
            
            Notification.objects.create(
                type='retour_voiture',
                message=message,
                voiture=f"{res.voiture.immatriculation} - {res.voiture.marque} {res.voiture.modele}",
                client_nom=f"{res.client.nom} {res.client.prenom}",
                client_telephone=res.client.telephone,
                date_retour=demain,
                urgence=False,
                priorite='high',
                montant_total=res.montant_total,
                montant_paye=res.avance,
                reste_a_payer=reste,
                reservation_id=res.id
            )
    
    # Réservations dans 3 jours
    reservations_3j = ContratLocation.objects.filter(
        date_fin=dans_3_jours,
        statut__in=['planifiee', 'en_cours']
    )
    
    for res in reservations_3j:
        if not Notification.objects.filter(
            type='retour_voiture',
            reservation_id=res.id,
            date_retour=dans_3_jours
        ).exists():
            
            reste = float(res.montant_total - res.avance) if res.montant_total and res.avance else 0
            
            message = f"📅 Retour prévu dans 3 jours - Client: {res.client.nom} {res.client.prenom}"
            if reste > 0:
                message += f" | Reste à payer: {reste:.2f} DH"
            
            Notification.objects.create(
                type='retour_voiture',
                message=message,
                voiture=f"{res.voiture.immatriculation} - {res.voiture.marque} {res.voiture.modele}",
                client_nom=f"{res.client.nom} {res.client.prenom}",
                client_telephone=res.client.telephone,
                date_retour=dans_3_jours,
                urgence=False,
                priorite='medium',
                montant_total=res.montant_total,
                montant_paye=res.avance,
                reste_a_payer=reste,
                reservation_id=res.id
            )


def generer_notifications_visites_techniques():
    """Génère les notifications pour les visites techniques expirant bientôt"""
    today = date.today()
    dans_30_jours = today + timedelta(days=30)
    dans_15_jours = today + timedelta(days=15)
    dans_7_jours = today + timedelta(days=7)
    
    # Visites expirant dans 30 jours
    visites_30j = VisiteTechnique.objects.filter(
        date_expiration__lte=dans_30_jours,
        date_expiration__gt=today
    )
    
    for visite in visites_30j:
        jours_restants = (visite.date_expiration - today).days
        
        # Déterminer la priorité
        if jours_restants <= 7:
            priorite = 'urgent'
            urgence = True
            emoji = '🔴'
        elif jours_restants <= 15:
            priorite = 'high'
            urgence = False
            emoji = '⚠️'
        else:
            priorite = 'medium'
            urgence = False
            emoji = '📅'
        
        # Vérifier si notification existe déjà pour aujourd'hui
        if not Notification.objects.filter(
            type='visite',
            document_id=visite.id,
            date_creation__date=today
        ).exists():
            
            message = f"{emoji} Visite technique expire dans {jours_restants} jour(s) - {visite.voiture.immatriculation}"
            
            Notification.objects.create(
                type='visite',
                message=message,
                voiture=f"{visite.voiture.immatriculation} - {visite.voiture.marque} {visite.voiture.modele}",
                date_echeance=visite.date_expiration,
                urgence=urgence,
                priorite=priorite,
                document_id=visite.id
            )


def generer_notifications_assurances():
    """Génère les notifications pour les assurances expirant bientôt"""
    today = date.today()
    dans_30_jours = today + timedelta(days=30)
    
    assurances = Assurance.objects.filter(
        date_expiration__lte=dans_30_jours,
        date_expiration__gt=today
    )
    
    for assurance in assurances:
        jours_restants = (assurance.date_expiration - today).days
        
        if jours_restants <= 7:
            priorite = 'urgent'
            urgence = True
            emoji = '🔴'
        elif jours_restants <= 15:
            priorite = 'high'
            urgence = False
            emoji = '⚠️'
        else:
            priorite = 'medium'
            urgence = False
            emoji = '📅'
        
        if not Notification.objects.filter(
            type='assurance',
            document_id=assurance.id,
            date_creation__date=today
        ).exists():
            
            message = f"{emoji} Assurance expire dans {jours_restants} jour(s) - {assurance.voiture.immatriculation}"
            
            Notification.objects.create(
                type='assurance',
                message=message,
                voiture=f"{assurance.voiture.immatriculation} - {assurance.voiture.marque} {assurance.voiture.modele}",
                date_echeance=assurance.date_expiration,
                urgence=urgence,
                priorite=priorite,
                document_id=assurance.id,
                montant_total=assurance.montant
            )


def generer_notifications_autorisations():
    """Génère les notifications pour les autorisations expirant bientôt"""
    today = date.today()
    dans_30_jours = today + timedelta(days=30)
    
    autorisations = AutorisationCirculation.objects.filter(
        date_expiration__lte=dans_30_jours,
        date_expiration__gt=today
    )
    
    for autorisation in autorisations:
        jours_restants = (autorisation.date_expiration - today).days
        
        if jours_restants <= 7:
            priorite = 'urgent'
            urgence = True
            emoji = '🔴'
        elif jours_restants <= 15:
            priorite = 'high'
            urgence = False
            emoji = '⚠️'
        else:
            priorite = 'medium'
            urgence = False
            emoji = '📅'
        
        if not Notification.objects.filter(
            type='autorisation',
            document_id=autorisation.id,
            date_creation__date=today
        ).exists():
            
            message = f"{emoji} Autorisation expire dans {jours_restants} jour(s) - {autorisation.voiture.immatriculation}"
            
            Notification.objects.create(
                type='autorisation',
                message=message,
                voiture=f"{autorisation.voiture.immatriculation} - {autorisation.voiture.marque} {autorisation.voiture.modele}",
                date_echeance=autorisation.date_expiration,
                urgence=urgence,
                priorite=priorite,
                document_id=autorisation.id
            )


# WhatsApp sending removed; function deprecated.


def envoyer_rappel_whatsapp(notification_id, *args, **kwargs):
    return False, 'WhatsApp désactivé'


def generer_toutes_notifications():
    """Génère toutes les notifications automatiques"""
    print("🔔 Génération des notifications...")
    
    generer_notifications_retours()
    print("✅ Notifications de retour générées")
    
    generer_notifications_visites_techniques()
    print("✅ Notifications de visite technique générées")
    
    generer_notifications_assurances()
    print("✅ Notifications d'assurance générées")
    
    generer_notifications_autorisations()
    print("✅ Notifications d'autorisation générées")
    
    print("✨ Terminé !")
