import logging

from rest_framework.decorators import api_view
from rest_framework.response import Response
from cars.models import Voiture
from reservations.models import ContratLocation
from payments.models import Payment
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)


def _shift_month_start(date_obj, months_delta):
    """Retourne le premier jour du mois décalé de `months_delta` depuis date_obj."""
    year_offset, new_month_index = divmod((date_obj.month - 1) + months_delta, 12)
    new_year = date_obj.year + year_offset
    new_month = new_month_index + 1
    return date_obj.replace(year=new_year, month=new_month, day=1)


def _reservation_total_days(reservation):
    """Calcule le nombre total de jours pour une réservation (jours prolongés inclus)."""
    if reservation.date_debut and reservation.date_fin:
        diff = (reservation.date_fin - reservation.date_debut).days + 1
        if diff > 0:
            return diff

    base_days = reservation.nombre_jours or 0
    base_days += reservation.jours_prolongation or 0
    return max(base_days, 0)


def _reservation_amount(reservation):
    """Retourne le montant réellement saisi pour la réservation."""
    montant = reservation.montant_total or reservation.tarif_special
    if montant is not None and montant > 0:
        return float(montant)

    total_days = _reservation_total_days(reservation)
    prix = reservation.prix_journalier or 0
    return float(prix) * total_days if total_days > 0 else 0.0

@api_view(['GET'])
def rentabilite_voitures(request):
    """
    API pour obtenir la rentabilité détaillée de chaque voiture par mois
    """
    try:
        today = timezone.now().date()
        current_month_start = today.replace(day=1)
        
        # Paramètres de période (par défaut 12 mois)
        nb_mois = int(request.GET.get('mois', 12))
        
        # Récupérer toutes les voitures
        voitures = Voiture.objects.all()
        
        resultats = []
        
        for voiture in voitures:
            # Données de base de la voiture
            voiture_data = {
                'id': voiture.id,
                'marque': voiture.marque,
                'modele': voiture.modele,
                'immatriculation': voiture.immatriculation,
                'prix_journalier': float(voiture.prix_journalier) if voiture.prix_journalier else 0,
                'statut': voiture.statut,
                'revenus_par_mois': [],
                'total_revenus': 0,
                'total_locations': 0,
                'total_jours_loues': 0,
                'taux_occupation': 0,
                'revenu_moyen_par_jour': 0
            }
            
            total_revenus = 0
            total_jours_loues = 0

            # Préparer la répartition réelle des paiements (montants saisis par l'agent) par mois pour cette voiture
            allocations_par_mois = defaultdict(float)
            paiements_voiture = Payment.objects.filter(reservation__voiture=voiture, is_deleted=False)
            for paiement in paiements_voiture:
                alloc_map = paiement.monthly_allocation_map(today)
                for mois_key, montant in alloc_map.items():
                    allocations_par_mois[mois_key] += montant
            
            # Calculer pour chaque mois
            for offset in range(nb_mois - 1, -1, -1):
                debut_mois = _shift_month_start(current_month_start, -offset)
                fin_mois = _shift_month_start(current_month_start, -offset + 1)
                
                # Réservations de cette voiture ce mois (uniquement en cours ou terminées)
                reservations_mois = ContratLocation.objects.filter(
                    voiture=voiture,
                    date_debut__lt=fin_mois,
                    date_fin__gte=debut_mois,
                    date_debut__lte=today  # La réservation doit avoir commencé
                ).exclude(statut='annulee')
                
                # Calculer les revenus du mois: encaissements ventilés (FIFO) sur les mois les plus anciens
                revenus_mois = allocations_par_mois.get(debut_mois.strftime('%Y-%m'), 0)
                jours_loues_mois = 0
                nb_locations_mois = reservations_mois.count()
                
                for reservation in reservations_mois:
                    # Calculer les jours dans ce mois
                    debut_periode = max(reservation.date_debut, debut_mois)
                    fin_periode = min(reservation.date_fin, fin_mois - timedelta(days=1))
                    
                    if debut_periode <= fin_periode:
                        jours = (fin_periode - debut_periode).days + 1
                        jours_loues_mois += jours
                
                # Ajouter les données du mois
                voiture_data['revenus_par_mois'].append({
                    'mois': debut_mois.strftime('%b %Y'),
                    'mois_num': debut_mois.strftime('%Y-%m'),
                    'revenus': round(revenus_mois, 2),
                    'jours_loues': jours_loues_mois,
                    'nb_locations': nb_locations_mois
                })
                
                total_revenus += revenus_mois
                total_jours_loues += jours_loues_mois
            
            # Calculer les totaux et moyennes (uniquement réservations commencées)
            voiture_data['total_revenus'] = round(total_revenus, 2)
            voiture_data['total_jours_loues'] = total_jours_loues
            voiture_data['total_locations'] = ContratLocation.objects.filter(
                voiture=voiture,
                date_debut__lte=today  # Uniquement les réservations qui ont commencé
            ).exclude(statut='annulee').count()
            
            # Taux d'occupation (sur les 12 derniers mois = 365 jours)
            jours_disponibles = nb_mois * 30
            voiture_data['taux_occupation'] = round(
                (total_jours_loues / jours_disponibles * 100) if jours_disponibles > 0 else 0,
                1
            )
            
            # Revenu moyen par jour loué
            voiture_data['revenu_moyen_par_jour'] = round(
                (total_revenus / total_jours_loues) if total_jours_loues > 0 else 0,
                2
            )
            
            resultats.append(voiture_data)
        
        # Trier par revenus totaux (décroissant)
        resultats.sort(key=lambda x: x['total_revenus'], reverse=True)
        
        # Calculer les statistiques globales
        total_revenus_global = sum(v['total_revenus'] for v in resultats)
        moyenne_revenus = total_revenus_global / len(resultats) if resultats else 0
        
        voiture_plus_rentable = resultats[0] if resultats else None
        taux_occupation_moyen = sum(v['taux_occupation'] for v in resultats) / len(resultats) if resultats else 0
        
        return Response({
            'voitures': resultats,
            'statistiques': {
                'total_revenus_global': round(total_revenus_global, 2),
                'moyenne_revenus_par_voiture': round(moyenne_revenus, 2),
                'voiture_plus_rentable': {
                    'marque': voiture_plus_rentable['marque'] if voiture_plus_rentable else '',
                    'modele': voiture_plus_rentable['modele'] if voiture_plus_rentable else '',
                    'revenus': voiture_plus_rentable['total_revenus'] if voiture_plus_rentable else 0
                } if voiture_plus_rentable else None,
                'taux_occupation_moyen': round(taux_occupation_moyen, 1),
                'nombre_voitures': len(resultats)
            }
        })
    
    except Exception as e:
        logger.exception('rentabilite error')
        return Response({
            'voitures': [],
            'statistiques': {
                'total_revenus_global': 0,
                'moyenne_revenus_par_voiture': 0,
                'voiture_plus_rentable': None,
                'taux_occupation_moyen': 0,
                'nombre_voitures': 0
            }
        }, status=200)
