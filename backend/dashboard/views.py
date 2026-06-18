from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from cars.models import Voiture
from clients.models import Client
from decimal import Decimal
from reservations.models import ContratLocation
from payments.models import Payment, PaymentHistory
from .models import ContactMessage
from .serializers import ContactMessageSerializer
from notifications.models import Notification
from django.db.models import Sum, Count, Q, F, ExpressionWrapper, DecimalField
from django.utils import timezone
from datetime import timedelta, datetime
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def public_contact(request):
    """Endpoint public pour recevoir les messages de contact du site client.

    Crée un ContactMessage dans la base et renvoie un récapitulatif.
    """
    serializer = ContactMessageSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    message = serializer.save()

    Notification.objects.create(
        type='inscription_client',
        message=f"[A_VERIFIER] Nouveau message site public de {message.name}",
        client_nom=message.name,
        client_telephone=message.phone,
        priorite='urgent',
        urgence=True,
    )

    return Response({
        'id': message.id,
        'name': message.name,
        'phone': message.phone,
        'email': message.email,
        'message': message.message,
        'created_at': message.created_at,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contact_messages_list(request):
    """Liste des messages de contact pour l'admin (lecture seule)."""
    qs = ContactMessage.objects.all().order_by('-created_at')[:200]
    serializer = ContactMessageSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def contact_message_mark_read(request, pk):
    """Marque un message comme lu côté admin."""
    try:
        msg = ContactMessage.objects.get(pk=pk)
    except ContactMessage.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if not msg.is_read:
        msg.is_read = True
        msg.save(update_fields=['is_read'])

    serializer = ContactMessageSerializer(msg)
    return Response(serializer.data)


def _active_voiture_ids(today):
    """Retourne les voitures ayant un contrat actif à la date donnée."""
    actifs = ContratLocation.objects.filter(
        is_deleted=False,
        statut__in=['en_cours', 'planifiee'],
        date_debut__lte=today
    ).filter(
        Q(long_duration=True) | Q(date_fin__isnull=True) | Q(date_fin__gte=today)
    ).values_list('voiture_id', flat=True).distinct()
    return set(actifs)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_all_stats(request):
    """Endpoint agrégé unique pour le dashboard admin.

    Retourne en un seul appel: stats, paiements, réservations, alertes et graphique.
    """
    try:
        from cars.models import Assurance, VisiteTechnique, AutorisationCirculation, Entretien

        today = timezone.now().date()
        try:
            month = int(request.query_params.get('month', today.month))
            year = int(request.query_params.get('year', today.year))
            if month < 1 or month > 12:
                month = today.month
            if year < 2020 or year > today.year + 1:
                year = today.year
        except (TypeError, ValueError):
            month = today.month
            year = today.year

        month_start = datetime(year, month, 1).date()
        next_month_start = datetime(year + 1, 1, 1).date() if month == 12 else datetime(year, month + 1, 1).date()

        total_voitures = Voiture.objects.count()
        active_ids = _active_voiture_ids(today)
        voitures_disponibles = Voiture.objects.exclude(statut__in=['entretien', 'hors_service']).exclude(id__in=active_ids).count()

        revenus_mois = float(
            PaymentHistory.objects.filter(
                payment__is_deleted=False,
                created_at__date__gte=month_start,
                created_at__date__lt=next_month_start,
            ).aggregate(total=Sum('amount'))['total'] or 0
        )

        depenses_entretiens = float(
            Entretien.objects.filter(date_entretien__gte=month_start, date_entretien__lt=next_month_start).aggregate(total=Sum('cout'))['total'] or 0
        )
        depenses_assurances = float(
            Assurance.objects.filter(date_debut__gte=month_start, date_debut__lt=next_month_start).aggregate(total=Sum('montant'))['total'] or 0
        )
        depenses_visites = float(
            VisiteTechnique.objects.filter(date_visite__gte=month_start, date_visite__lt=next_month_start).aggregate(total=Sum('montant'))['total'] or 0
        )
        depenses_mois = depenses_entretiens + depenses_assurances + depenses_visites

        retours = ContratLocation.objects.filter(
            is_deleted=False,
            statut='en_cours',
            date_fin=today,
        ).select_related('client', 'voiture').only(
            'id', 'client__nom', 'client__prenom', 'voiture__marque', 'voiture__modele', 'voiture__immatriculation'
        ).order_by('date_fin')[:12]

        retours_payload = [
            {
                'reservation_id': r.id,
                'client': f"{r.client.nom} {r.client.prenom}".strip(),
                'voiture': f"{r.voiture.marque} {r.voiture.modele}".strip(),
                'immatriculation': r.voiture.immatriculation,
            }
            for r in retours
        ]

        pending_qs = Payment.objects.filter(
            status='PENDING',
            is_deleted=False,
        ).select_related('reservation__client', 'reservation__voiture').annotate(
            remaining_amount=ExpressionWrapper(
                F('amount') - F('paid_amount') - F('forgiven_amount'),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )
        ).filter(remaining_amount__gt=0)

        pending_total = float(pending_qs.aggregate(total=Sum('remaining_amount'))['total'] or 0)
        pending_items = []
        for p in pending_qs.order_by('-created_at')[:10]:
            reservation = p.reservation
            pending_items.append({
                'payment_id': p.id,
                'client': p.client_name or (
                    f"{reservation.client.nom} {reservation.client.prenom}" if reservation and reservation.client_id else 'Client'
                ),
                'voiture': (
                    f"{reservation.voiture.marque} {reservation.voiture.modele}" if reservation and reservation.voiture_id else ''
                ),
                'remaining': float(p.remaining_amount or 0),
            })

        threshold = today + timedelta(days=7)
        alert_items = []

        for item in Assurance.objects.filter(date_expiration__lte=threshold).select_related('voiture').only('id', 'date_expiration', 'voiture__marque', 'voiture__modele').order_by('date_expiration')[:6]:
            days_left = (item.date_expiration - today).days
            alert_items.append({
                'id': item.id,
                'type': 'assurance',
                'titre': 'Assurance expirée' if days_left < 0 else f'Assurance expire dans {days_left}j',
                'voiture': f"{item.voiture.marque} {item.voiture.modele}".strip(),
                'date_expiration': item.date_expiration,
            })

        for item in VisiteTechnique.objects.filter(date_expiration__lte=threshold).select_related('voiture').only('id', 'date_expiration', 'voiture__marque', 'voiture__modele').order_by('date_expiration')[:6]:
            days_left = (item.date_expiration - today).days
            alert_items.append({
                'id': item.id,
                'type': 'visite',
                'titre': 'Visite technique expirée' if days_left < 0 else f'Visite technique expire dans {days_left}j',
                'voiture': f"{item.voiture.marque} {item.voiture.modele}".strip(),
                'date_expiration': item.date_expiration,
            })

        for item in AutorisationCirculation.objects.filter(date_expiration__lte=threshold).select_related('voiture').only('id', 'date_expiration', 'voiture__marque', 'voiture__modele').order_by('date_expiration')[:6]:
            days_left = (item.date_expiration - today).days
            alert_items.append({
                'id': item.id,
                'type': 'autorisation',
                'titre': 'Autorisation expirée' if days_left < 0 else f'Autorisation expire dans {days_left}j',
                'voiture': f"{item.voiture.marque} {item.voiture.modele}".strip(),
                'date_expiration': item.date_expiration,
            })

        chart = []
        for i in range(5, -1, -1):
            target_month = month - i
            target_year = year
            while target_month <= 0:
                target_month += 12
                target_year -= 1

            start = datetime(target_year, target_month, 1).date()
            end = datetime(target_year + 1, 1, 1).date() if target_month == 12 else datetime(target_year, target_month + 1, 1).date()

            revenus = float(
                PaymentHistory.objects.filter(
                    payment__is_deleted=False,
                    created_at__date__gte=start,
                    created_at__date__lt=end,
                ).aggregate(total=Sum('amount'))['total'] or 0
            )

            depenses = float(
                (Entretien.objects.filter(date_entretien__gte=start, date_entretien__lt=end).aggregate(total=Sum('cout'))['total'] or 0)
                + (Assurance.objects.filter(date_debut__gte=start, date_debut__lt=end).aggregate(total=Sum('montant'))['total'] or 0)
                + (VisiteTechnique.objects.filter(date_visite__gte=start, date_visite__lt=end).aggregate(total=Sum('montant'))['total'] or 0)
            )

            chart.append({
                'mois': start.strftime('%b %Y'),
                'revenus': round(revenus, 2),
                'depenses': round(depenses, 2),
                'benefice': round(revenus - depenses, 2),
            })

        return Response({
            'stats': {
                'revenus_mois': round(revenus_mois, 2),
                'depenses_mois': round(depenses_mois, 2),
                'benefice_net': round(revenus_mois - depenses_mois, 2),
                'voitures_disponibles': voitures_disponibles,
                'total_voitures': total_voitures,
            },
            'paiements': {
                'total_en_attente': round(pending_total, 2),
                'nombre_en_attente': pending_qs.count(),
                'items': pending_items,
            },
            'reservations': {
                'retours_aujourdhui': retours_payload,
            },
            'alerts': alert_items,
            'chart': chart,
            'generated_at': timezone.now(),
        })

    except Exception:
        logger.exception('dashboard_all_stats error')
        return Response({
            'stats': {
                'revenus_mois': 0,
                'depenses_mois': 0,
                'benefice_net': 0,
                'voitures_disponibles': 0,
                'total_voitures': 0,
            },
            'paiements': {
                'total_en_attente': 0,
                'nombre_en_attente': 0,
                'items': [],
            },
            'reservations': {
                'retours_aujourdhui': [],
            },
            'alerts': [],
            'chart': [],
        }, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def timeline_aujourdhui(request):
    """API endpoint pour la timeline des événements d'aujourd'hui"""
    try:
        today = timezone.now().date()
        now = timezone.now()
        events = []
        
        # 1. Retours de voitures prévus aujourd'hui
        retours = ContratLocation.objects.filter(
            date_fin=today,
            statut='en_cours'
        ).select_related('client', 'voiture').order_by('date_fin')
        
        for retour in retours:
            events.append({
                'time': '09h00',
                'type': 'retour',
                'title': f'Retour {retour.voiture.marque} {retour.voiture.modele}',
                'description': f'{retour.client.nom} {retour.client.prenom} - {retour.voiture.immatriculation}',
                'priority': 'high',
                'action': 'Préparer inspection',
                'link': f'/reservations/edit/{retour.id}'
            })
        
        # 2. Départs de voitures (réservations qui commencent aujourd'hui)
        departs = ContratLocation.objects.filter(
            date_debut=today,
            statut='planifiee'
        ).select_related('client', 'voiture').order_by('date_debut')
        
        for depart in departs:
            events.append({
                'time': '14h00',
                'type': 'depart',
                'title': f'Départ {depart.voiture.marque} {depart.voiture.modele}',
                'description': f'{depart.client.nom} {depart.client.prenom} - Location commence',
                'priority': 'medium',
                'action': 'Vérifier état',
                'link': f'/reservations/edit/{depart.id}'
            })
        
        # 3. Paiements en attente urgents (échéance passée)
        try:
            paiements_urgents = Payment.objects.filter(
                status='pending',
                due_date__lt=today
            ).select_related('reservation', 'reservation__client')[:5]
            
            for paiement in paiements_urgents:
                jours_retard = (today - paiement.due_date).days if paiement.due_date else 0
                events.append({
                    'time': '10h00',
                    'type': 'paiement',
                    'title': 'Paiement en retard',
                    'description': f'{paiement.reservation.client.nom if paiement.reservation else "Client"} - {paiement.amount} MAD ({jours_retard}j)',
                    'priority': 'high',
                    'action': 'Contacter client',
                    'link': f'/payments'
                })
        except:
            pass
        
        # 4. Alertes assurances/visites expirées
        try:
            from cars.models import Assurance
            assurances_expirees = Assurance.objects.filter(
                date_expiration=today
            ).select_related('voiture')[:3]
            
            for assurance in assurances_expirees:
                events.append({
                    'time': '11h00',
                    'type': 'alerte',
                    'title': 'Assurance expire aujourd\'hui',
                    'description': f'{assurance.voiture.marque} {assurance.voiture.modele} - {assurance.voiture.immatriculation}',
                    'priority': 'high',
                    'action': 'Renouveler',
                    'link': f'/cars/edit/{assurance.voiture.id}'
                })
        except:
            pass
        
        # Trier les événements par heure
        time_order = {
            '08h00': 1, '09h00': 2, '10h00': 3, '11h00': 4,
            '12h00': 5, '13h00': 6, '14h00': 7, '15h00': 8,
            '16h00': 9, '17h00': 10, '18h00': 11, '19h00': 12, '20h00': 13
        }
        events.sort(key=lambda x: time_order.get(x['time'], 99))
        
        return Response({
            'date': today.isoformat(),
            'current_time': now.strftime('%H:%M'),
            'events': events,
            'total': len(events)
        })
    
    except Exception as e:
        logger.exception('timeline_aujourdhui error')
        return Response({
            'date': timezone.now().date().isoformat(),
            'current_time': timezone.now().strftime('%H:%M'),
            'events': [],
            'total': 0,
        }, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cash_flow(request):
    """API endpoint pour le cash flow avec différentes périodes"""
    try:
        periode = request.GET.get('periode', 'aujourdhui')
        today = timezone.now().date()
        
        # Définir les dates selon la période
        if periode == 'aujourdhui':
            date_debut = today
            date_fin = today
        elif periode == 'semaine':
            date_debut = today - timedelta(days=7)
            date_fin = today
        elif periode == 'mois':
            date_debut = today - timedelta(days=30)
            date_fin = today
        else:
            date_debut = today
            date_fin = today

        periode_length = (date_fin - date_debut).days
        periode_length = periode_length if periode_length >= 0 else 0
        periode_precedente_fin = date_debut - timedelta(days=1)
        periode_precedente_debut = periode_precedente_fin - timedelta(days=periode_length)
        
        # ENTRÉES - Somme des transactions réellement enregistrées
        paiements_history = PaymentHistory.objects.filter(
            payment__is_deleted=False
        )
        if periode == 'aujourdhui':
            paiements_history = paiements_history.filter(created_at__date=today)
        else:
            paiements_history = paiements_history.filter(
                created_at__date__gte=date_debut,
                created_at__date__lte=date_fin
            )

        paiements_recus = paiements_history.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        paiements_recus = float(paiements_recus)
        entrees_total = paiements_recus
        
        # SORTIES
        # Remboursements (annulations)
        if periode == 'aujourdhui':
            remboursements = Payment.objects.filter(
                status='CANCELLED',
                is_deleted=False
            ).aggregate(total=Sum('paid_amount'))['total'] or 0
        else:
            remboursements = Payment.objects.filter(
                status='CANCELLED',
                paid_at__gte=date_debut,
                paid_at__lte=date_fin,
                is_deleted=False
            ).aggregate(total=Sum('paid_amount'))['total'] or 0
        
        # NOUVELLES DÉPENSES : Entretiens, Assurances, Visites Techniques
        depenses_entretiens = 0
        depenses_assurances = 0
        depenses_visites = 0
        
        try:
            from cars.models import Entretien, Assurance, VisiteTechnique
            from django.db.models import F
            
            # Entretiens effectués dans la période
            if periode == 'aujourdhui':
                entretiens = Entretien.objects.filter(
                    statut_entretien='effectue'
                )
            else:
                entretiens = Entretien.objects.filter(
                    date_entretien__gte=date_debut,
                    date_entretien__lte=date_fin,
                    statut_entretien='effectue'
                )
            
            depenses_entretiens = 0
            for entretien in entretiens:
                cout = float(entretien.cout or 0)
                main_oeuvre = float(entretien.main_oeuvre or 0)
                depenses_entretiens += cout + main_oeuvre
            
            # Assurances payées dans la période
            if periode == 'aujourdhui':
                depenses_assurances = Assurance.objects.all().aggregate(total=Sum('montant'))['total'] or 0
            else:
                depenses_assurances = Assurance.objects.filter(
                    date_debut__gte=date_debut,
                    date_debut__lte=date_fin
                ).aggregate(total=Sum('montant'))['total'] or 0
            
            # Visites techniques
            if periode == 'aujourdhui':
                nb_visites = VisiteTechnique.objects.all().count()
            else:
                nb_visites = VisiteTechnique.objects.filter(
                    date_visite__gte=date_debut,
                    date_visite__lte=date_fin
                ).count()
            depenses_visites = nb_visites * 300  # 300 MAD par visite technique (estimation)
            
        except Exception as e:
            logger.exception('depenses_flotte error')
        
        sorties_total = float(remboursements) + float(depenses_entretiens) + float(depenses_assurances) + float(depenses_visites)
        
        # BALANCE
        balance_net = entrees_total - sorties_total
        
        # TENDANCE (comparaison avec période précédente)
        paiements_precedents_history = PaymentHistory.objects.filter(
            payment__is_deleted=False,
            created_at__date__gte=periode_precedente_debut,
            created_at__date__lte=periode_precedente_fin
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        paiements_precedents = float(paiements_precedents_history)
        tendance = 0
        if paiements_precedents > 0:
            tendance = round(((paiements_recus - paiements_precedents) / paiements_precedents) * 100, 1)
        
        # PAIEMENTS EN ATTENTE
        paiements_en_attente_list = []
        
        # Paiements Payment en attente
        paiements_pending = Payment.objects.filter(
            status='PENDING',
            is_deleted=False
        ).select_related('reservation', 'reservation__client').order_by('created_at')[:10]
        
        for paiement in paiements_pending:
            jours_retard = 0
            if paiement.created_at:
                jours_retard = (today - paiement.created_at.date()).days
            
            reste_a_payer = float(paiement.remaining)
            if reste_a_payer <= 0:
                continue
            paiements_en_attente_list.append({
                'reservation_id': paiement.reservation.id if paiement.reservation else None,
                'client_nom': paiement.client_name or "N/A",
                'montant': reste_a_payer,
                'date_echeance': paiement.created_at.strftime('%d/%m/%Y') if paiement.created_at else 'N/A',
                'jours_retard': max(0, jours_retard)
            })
        
        # Ajouter les réservations avec reste à payer
        reservations_reste = ContratLocation.objects.filter(
            statut__in=['en_cours', 'planifiee'],
            is_deleted=False
        ).select_related('client', 'voiture')
        
        for res in reservations_reste:
            reste = float(res.montant_total or 0) - float(res.avance or 0)
            if reste > 0:
                jours_depuis = (today - res.date_creation.date()).days if res.date_creation else 0
                paiements_en_attente_list.append({
                    'reservation_id': res.id,
                    'client_nom': f"{res.client.nom} {res.client.prenom}",
                    'montant': reste,
                    'date_echeance': res.date_fin.strftime('%d/%m/%Y') if res.date_fin else 'N/A',
                    'jours_retard': max(0, jours_depuis - 1)
                })
        
        # Limiter à 10 paiements en attente
        paiements_en_attente_list = paiements_en_attente_list[:10]
        
        # PRÉVISIONS (7 prochains jours)
        date_fin_prevision = today + timedelta(days=7)
        
        # Revenus attendus (réservations qui se terminent dans les 7 jours avec reste à payer)
        revenus_attendus = 0
        reservations_futures = ContratLocation.objects.filter(
            date_fin__gte=today,
            date_fin__lte=date_fin_prevision,
            statut='en_cours',
            is_deleted=False
        )
        
        for res in reservations_futures:
            reste = float(res.montant_total or 0) - float(res.avance or 0)
            revenus_attendus += reste
        
        balance_prevue = float(revenus_attendus)
        
        return Response({
            'periode': periode,
            'date_debut': date_debut.isoformat(),
            'date_fin': date_fin.isoformat(),
            'entrees_total': entrees_total,
            'paiements_recus': float(paiements_recus),
            'sorties_total': sorties_total,
            'remboursements': float(remboursements),
            'depenses_entretiens': float(depenses_entretiens),
            'depenses_assurances': float(depenses_assurances),
            'depenses_visites': float(depenses_visites),
            'balance_net': balance_net,
            'tendance_vs_precedent': tendance,
            'paiements_en_attente': paiements_en_attente_list,
            'previsions': {
                'revenus_attendus': float(revenus_attendus),
                'balance_prevue': balance_prevue
            }
        })
    
    except Exception as e:
        logger.exception('cash_flow error')
        return Response({
            'periode': 'aujourdhui',
            'entrees_total': 0,
            'paiements_recus': 0,
            'sorties_total': 0,
            'remboursements': 0,
            'depenses_entretiens': 0,
            'depenses_assurances': 0,
            'depenses_visites': 0,
            'balance_net': 0,
            'tendance_vs_precedent': 0,
            'paiements_en_attente': [],
            'previsions': {
                'revenus_attendus': 0,
                'balance_prevue': 0
            },
        }, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search(request):
    """API endpoint pour la recherche globale"""
    query = request.GET.get('q', '').strip()
    
    if not query or len(query) < 2:
        return Response({
            'clients': [],
            'voitures': [],
            'reservations': []
        })
    
    try:
        # Recherche clients (nom, prénom, téléphone, email)
        clients = Client.objects.filter(
            Q(nom__icontains=query) |
            Q(prenom__icontains=query) |
            Q(telephone__icontains=query) |
            Q(email__icontains=query)
        )[:10]
        
        clients_data = [{
            'id': c.id,
            'nom': c.nom,
            'prenom': c.prenom,
            'telephone': c.telephone,
            'email': c.email if hasattr(c, 'email') else None
        } for c in clients]
        
        # Recherche voitures (marque, modèle, immatriculation)
        voitures = Voiture.objects.filter(
            Q(marque__icontains=query) |
            Q(modele__icontains=query) |
            Q(immatriculation__icontains=query)
        )[:10]
        
        voitures_data = [{
            'id': v.id,
            'marque': v.marque,
            'modele': v.modele,
            'immatriculation': v.immatriculation,
            'statut': v.statut
        } for v in voitures]
        
        # Recherche réservations (par ID ou nom client)
        reservations = ContratLocation.objects.filter(
            Q(id__icontains=query) |
            Q(client__nom__icontains=query) |
            Q(client__prenom__icontains=query) |
            Q(voiture__immatriculation__icontains=query)
        ).select_related('client', 'voiture').order_by('-date_creation')[:10]
        
        reservations_data = [{
            'id': r.id,
            'client_nom': f"{r.client.nom} {r.client.prenom}",
            'voiture_immatriculation': r.voiture.immatriculation,
            'date_debut': r.date_debut.isoformat() if r.date_debut else None,
            'date_fin': r.date_fin.isoformat() if r.date_fin else None,
            'statut': r.statut
        } for r in reservations]
        
        return Response({
            'clients': clients_data,
            'voitures': voitures_data,
            'reservations': reservations_data,
            'query': query
        })
    
    except Exception as e:
        logger.exception('recherche_globale error')
        return Response({
            'clients': [],
            'voitures': [],
            'reservations': [],
        }, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def retours_aujourdhui(request):
    """API endpoint pour récupérer les retours de voiture prévus aujourd'hui"""
    try:
        today = timezone.now().date()
        
        # Récupérer les réservations qui se terminent aujourd'hui
        retours = ContratLocation.objects.filter(
            date_fin=today,
            statut='en_cours'
        ).select_related('client', 'voiture').order_by('date_fin')
        
        retours_data = []
        for contrat in retours:
            heure_retour_attr = getattr(contrat, 'heure_retour', None) or getattr(contrat, 'heure_retour_prevue', None)
            if heure_retour_attr is not None:
                heure_retour = str(heure_retour_attr)
            else:
                heure_retour = None
            retours_data.append({
                'id': contrat.id,
                'client_nom': f"{contrat.client.nom} {contrat.client.prenom}",
                'client_telephone': contrat.client.telephone,
                'voiture': f"{contrat.voiture.marque} {contrat.voiture.modele}",
                'immatriculation': contrat.voiture.immatriculation,
                'date_fin': contrat.date_fin.isoformat(),
                'heure_retour': heure_retour,
                'statut_rendu': False  # Peut être étendu plus tard avec un champ dédié
            })
        
        return Response({
            'count': len(retours_data),
            'retours': retours_data,
            'date': today.isoformat()
        })
    
    except Exception as e:
        logger.exception('retours_aujourdhui error')
        return Response({
            'count': 0,
            'retours': [],
        }, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    try:
        today = timezone.now().date()
        active_voitures = _active_voiture_ids(today)
        
        # Voitures - VRAIES DONNÉES
        voitures_total = Voiture.objects.count()
        voitures_entretien = Voiture.objects.filter(statut='entretien').count()
        voitures_hs = Voiture.objects.filter(statut='hors_service').count()
        voitures_louees = len(active_voitures)
        voitures_disponibles = Voiture.objects.exclude(
            statut__in=['entretien', 'hors_service']
        ).exclude(id__in=active_voitures).count()
        taux_utilisation = round((voitures_louees / voitures_total * 100) if voitures_total > 0 else 0, 1)
        
        # Clients - VRAIES DONNÉES
        clients_total = Client.objects.count()
        debut_mois = today.replace(day=1)
        try:
            clients_nouveaux_mois = Client.objects.filter(date_creation__gte=debut_mois).count()
        except:
            clients_nouveaux_mois = 0
        
        try:
            # Utiliser les bons statuts: 'planifiee' et 'en_cours'
            clients_actifs = ContratLocation.objects.filter(
                statut__in=['planifiee', 'en_cours']
            ).values('client').distinct().count()
        except:
            clients_actifs = 0
        
        # Revenus du mois en cours
        try:
            # Calculer depuis les paiements avec status PAID
            revenus_mois_actuel = Payment.objects.filter(
                status='PAID',
                paid_at__gte=debut_mois,
                paid_at__lte=today,
                is_deleted=False
            ).aggregate(total=Sum('paid_amount'))['total'] or 0
        except:
            revenus_mois_actuel = 0
        
        # Réservations - VRAIES DONNÉES (Statuts calculés dynamiquement basés sur les dates)
        reservations_total = ContratLocation.objects.filter(is_deleted=False).count()
        
        # Calculer les statuts basés sur les dates actuelles
        reservations_actives = ContratLocation.objects.filter(
            is_deleted=False,
            date_debut__lte=today,
            date_fin__gte=today
        ).exclude(statut='annule').count()
        
        reservations_en_cours = reservations_actives  # Même chose
        
        reservations_terminees = ContratLocation.objects.filter(
            is_deleted=False,
            date_fin__lt=today
        ).exclude(statut='annule').count()
        
        reservations_annulees = ContratLocation.objects.filter(statut='annule').count()
        
        # Réservations planifiées (à venir)
        reservations_en_attente = ContratLocation.objects.filter(
            is_deleted=False,
            date_debut__gt=today
        ).exclude(statut='annule').count()
        
        try:
            reservations_mois = ContratLocation.objects.filter(
                is_deleted=False,
                date_creation__gte=debut_mois
            ).count()
        except:
            reservations_mois = 0
        
        # Finances - VRAIES DONNÉES
        try:
            revenus_total = Payment.objects.filter(status='PAID').aggregate(total=Sum('amount'))['total'] or 0
        except Exception as e:
            logger.warning('total_payments loading error: %s', e)
            revenus_total = Payment.objects.aggregate(total=Sum('amount'))['total'] or 0
        
        try:
            revenus_mois = Payment.objects.filter(status='PAID', paid_at__gte=debut_mois).aggregate(total=Sum('amount'))['total'] or 0
        except Exception as e:
            logger.warning('monthly_payments loading error: %s', e)
            revenus_mois = 0
        
        try:
            debut_annee = today.replace(month=1, day=1)
            revenus_annee = Payment.objects.filter(status='PAID', paid_at__gte=debut_annee).aggregate(total=Sum('amount'))['total'] or 0
        except Exception as e:
            logger.warning('yearly_payments loading error: %s', e)
            revenus_annee = 0
        
        try:
            paiements_en_attente = Payment.objects.filter(status='PENDING').aggregate(total=Sum('amount'))['total'] or 0
        except Exception as e:
            logger.warning('pending_payments loading error: %s', e)
            paiements_en_attente = 0
        
        # Alertes - avec gestion d'erreurs
        date_limite = today + timedelta(days=7)
        alertes_data = {
            'assurances_expirees': 0,
            'assurances_a_renouveler': 0,
            'visites_expirees': 0,
            'visites_a_renouveler': 0,
            'autorisations_expirees': 0,
            'autorisations_a_renouveler': 0,
            'entretiens_a_prevoir': 0
        }
        
        try:
            from cars.models import Assurance
            alertes_data['assurances_expirees'] = Assurance.objects.filter(date_expiration__lt=today).count()
            alertes_data['assurances_a_renouveler'] = Assurance.objects.filter(date_expiration__gte=today, date_expiration__lte=date_limite).count()
        except:
            pass
        
        try:
            from cars.models import VisiteTechnique
            alertes_data['visites_expirees'] = VisiteTechnique.objects.filter(date_expiration__lt=today).count()
            alertes_data['visites_a_renouveler'] = VisiteTechnique.objects.filter(date_expiration__gte=today, date_expiration__lte=date_limite).count()
        except:
            pass
        
        try:
            from cars.models import AutorisationCirculation
            alertes_data['autorisations_expirees'] = AutorisationCirculation.objects.filter(date_expiration__lt=today).count()
            alertes_data['autorisations_a_renouveler'] = AutorisationCirculation.objects.filter(date_expiration__gte=today, date_expiration__lte=date_limite).count()
        except:
            pass
        
        try:
            from cars.models import Entretien
            alertes_data['entretiens_a_prevoir'] = Entretien.objects.filter(prochain_entretien__gte=today, prochain_entretien__lte=date_limite).count()
        except:
            pass
        
        total_alertes = sum(alertes_data.values())
        
        # Graphiques - VRAIES DONNÉES avec calculs corrigés
        reservations_par_mois = []
        revenus_par_mois = []
        for i in range(5, -1, -1):
            try:
                # Calculer le mois correct
                current_month = today.month
                current_year = today.year
                target_month = current_month - i
                target_year = current_year
                
                # Ajuster l'année si le mois est négatif
                while target_month <= 0:
                    target_month += 12
                    target_year -= 1
                
                # Créer les dates de début et fin du mois
                from datetime import date
                debut = date(target_year, target_month, 1)
                
                if target_month == 12:
                    fin = date(target_year + 1, 1, 1)
                else:
                    fin = date(target_year, target_month + 1, 1)
                
                # Compter les réservations créées dans ce mois
                count = ContratLocation.objects.filter(
                    date_creation__gte=debut, 
                    date_creation__lt=fin,
                    is_deleted=False
                ).count()
                reservations_par_mois.append({
                    'mois': debut.strftime('%b %Y'), 
                    'count': count
                })
                
                # Calculer les revenus du mois (paiements PAID)
                montant = Payment.objects.filter(
                    paid_at__gte=debut, 
                    paid_at__lt=fin,
                    status='PAID',
                    is_deleted=False
                ).aggregate(total=Sum('paid_amount'))['total'] or 0
                
                # Ajouter aussi les avances des réservations créées ce mois
                avances = ContratLocation.objects.filter(
                    date_creation__gte=debut,
                    date_creation__lt=fin,
                    is_deleted=False
                ).aggregate(total=Sum('avance'))['total'] or 0
                
                montant_total = float(montant) + float(avances)
                
                revenus_par_mois.append({
                    'mois': debut.strftime('%b %Y'), 
                    'montant': montant_total
                })
            except Exception as e:
                logger.warning('graphique mois %s error: %s', i, e)
                pass
        
        # Top voitures - VRAIES DONNÉES
        top_voitures = []
        try:
            top_voitures = list(ContratLocation.objects.values('voiture__marque', 'voiture__modele', 'voiture__immatriculation').annotate(count=Count('id')).order_by('-count')[:5])
        except:
            pass
        
        # Activités récentes - VRAIES DONNÉES
        activites = []
        try:
            for res in ContratLocation.objects.select_related('voiture', 'client').order_by('-date_creation')[:5]:
                activites.append({
                    'type': 'reservation',
                    'message': f"Nouvelle réservation: {res.client.nom} {res.client.prenom} - {res.voiture.marque} {res.voiture.modele}",
                    'date': res.date_creation.isoformat() if res.date_creation else None,
                    'icon': '📅'
                })
        except Exception as e:
            logger.warning('reservations loading error: %s', e)
        
        try:
            for pay in Payment.objects.filter(paid_at__isnull=False).order_by('-paid_at')[:5]:
                activites.append({
                    'type': 'paiement',
                    'message': f"Paiement reçu: {pay.amount} MAD",
                    'date': pay.paid_at.isoformat() if pay.paid_at else None,
                    'icon': '💰'
                })
        except Exception as e:
            logger.warning('payments loading error: %s', e)
        
        activites.sort(key=lambda x: x['date'] if x['date'] else '', reverse=True)
        activites = activites[:10]
        
        # Retourner les VRAIES DONNÉES
        return Response({
            "voitures": {
                "total": voitures_total,
                "louees": voitures_louees,
                "disponibles": voitures_disponibles,
                "entretien": voitures_entretien,
                "hors_service": voitures_hs,
                "taux_utilisation": taux_utilisation
            },
            "clients": {
                "total": clients_total,
                "nouveaux_mois": clients_nouveaux_mois,
                "actifs": clients_actifs
            },
            "reservations": {
                "total": reservations_total,
                "actives": reservations_actives,
                "en_cours": reservations_en_cours,
                "terminees": reservations_terminees,
                "annulees": reservations_annulees,
                "en_attente": reservations_en_attente,
                "mois": reservations_mois
            },
            "finances": {
                "revenus_total": float(revenus_total),
                "revenus_mois": float(revenus_mois_actuel),
                "revenus_annee": float(revenus_annee),
                "paiements_en_attente": float(paiements_en_attente)
            },
            "alertes": {
                "total": total_alertes,
                **alertes_data
            },
            "graphiques": {
                "reservations_par_mois": reservations_par_mois,
                "revenus_par_mois": revenus_par_mois,
                "top_voitures": top_voitures
            },
            "activites_recentes": activites
        })
    
    except Exception as e:
        # En cas d'erreur, logger et retourner des données vides
        logger.exception('dashboard_stats error')
        
        return Response({
            "voitures": {"total": 0, "louees": 0, "disponibles": 0, "entretien": 0, "hors_service": 0, "taux_utilisation": 0},
            "clients": {"total": 0, "nouveaux_mois": 0, "actifs": 0},
            "reservations": {"total": 0, "actives": 0, "en_cours": 0, "terminees": 0, "annulees": 0, "en_attente": 0, "mois": 0},
            "finances": {"revenus_total": 0.0, "revenus_mois": 0.0, "revenus_annee": 0.0, "paiements_en_attente": 0.0},
            "alertes": {"total": 0, "assurances_expirees": 0, "assurances_a_renouveler": 0, "visites_expirees": 0, "visites_a_renouveler": 0, "autorisations_expirees": 0, "autorisations_a_renouveler": 0, "entretiens_a_prevoir": 0},
            "graphiques": {"reservations_par_mois": [], "revenus_par_mois": [], "top_voitures": []},
            "activites_recentes": []
        }, status=200)  # Return 200 instead of 500 to avoid frontend errors


# ============================================
# NOUVEAUX ENDPOINTS POUR DASHBOARD SIMPLIFIÉ
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def finances_mensuelles(request):
    """Retourne les KPIs financiers et le graphique sur 6 mois
    
    Paramètres optionnels:
    - month: Mois (1-12), par défaut le mois actuel
    - year: Année, par défaut l'année actuelle
    """
    try:
        from cars.models import Entretien, Assurance, VisiteTechnique
        from payments.models import PaymentHistory
        from datetime import date as _date
        
        today = timezone.now().date()
        
        # Récupérer le mois/année depuis les paramètres ou utiliser la date actuelle
        try:
            selected_month = int(request.query_params.get('month', today.month))
            selected_year = int(request.query_params.get('year', today.year))
            # Validation
            if selected_month < 1 or selected_month > 12:
                selected_month = today.month
            if selected_year < 2020 or selected_year > today.year + 1:
                selected_year = today.year
        except (ValueError, TypeError):
            selected_month = today.month
            selected_year = today.year
        
        # Calculer les bornes du mois sélectionné
        premier_jour_mois = _date(selected_year, selected_month, 1)
        if selected_month == 12:
            dernier_jour_mois_excl = _date(selected_year + 1, 1, 1)
        else:
            dernier_jour_mois_excl = _date(selected_year, selected_month + 1, 1)
        
        # Si on est dans le mois actuel, limiter au jour actuel
        if selected_year == today.year and selected_month == today.month:
            fin_periode = today + timedelta(days=1)
        else:
            fin_periode = dernier_jour_mois_excl
        
        # 1. Calcul des revenus du mois sélectionné
        revenus_mois = PaymentHistory.objects.filter(
            payment__is_deleted=False,
            created_at__date__gte=premier_jour_mois,
            created_at__date__lt=fin_periode,
        ).aggregate(total=Sum('amount'))['total'] or 0
        revenus_mois = float(revenus_mois)
        
        # 2. Calcul des dépenses du mois sélectionné
        # Utiliser fin_periode - 1 jour pour la borne supérieure inclusive
        fin_periode_inclusive = fin_periode - timedelta(days=1)
        
        entretiens_mois = Entretien.objects.filter(
            date_entretien__gte=premier_jour_mois,
            date_entretien__lte=fin_periode_inclusive
        ).aggregate(total=Sum('cout'))['total'] or 0
        
        assurances_mois = Assurance.objects.filter(
            date_debut__gte=premier_jour_mois,
            date_debut__lte=fin_periode_inclusive
        ).aggregate(total=Sum('montant'))['total'] or 0
        
        visites_mois = VisiteTechnique.objects.filter(
            date_visite__gte=premier_jour_mois,
            date_visite__lte=fin_periode_inclusive
        ).aggregate(total=Sum('montant'))['total'] or 0
        
        depenses_mois = float(entretiens_mois + assurances_mois + visites_mois)
        
        # 3. Bénéfice net
        benefice_net = revenus_mois - depenses_mois
        
        # 4. Voitures disponibles
        total_voitures = Voiture.objects.count()
        active_voitures = _active_voiture_ids(today)
        voitures_libres = Voiture.objects.exclude(
            statut__in=['entretien', 'hors_service']
        ).exclude(id__in=active_voitures).count()
        
        # 5. Graphique 6 derniers mois (basé sur le mois sélectionné)
        graphique = []
        for i in range(5, -1, -1):
            # Calculer le mois cible à partir du mois sélectionné
            target_month = selected_month - i
            target_year = selected_year
            while target_month <= 0:
                target_month += 12
                target_year -= 1

            premier_jour = _date(target_year, target_month, 1)
            if target_month == 12:
                fin_mois_excl = _date(target_year + 1, 1, 1)
            else:
                fin_mois_excl = _date(target_year, target_month + 1, 1)

            # Pour le mois courant (aujourd'hui), afficher jusqu'à aujourd'hui inclus
            if target_year == today.year and target_month == today.month:
                fin_periode_excl = today + timedelta(days=1)
            else:
                fin_periode_excl = fin_mois_excl
            
            # Revenus du mois
            revenus = PaymentHistory.objects.filter(
                payment__is_deleted=False,
                created_at__date__gte=premier_jour,
                created_at__date__lt=fin_periode_excl,
            ).aggregate(total=Sum('amount'))['total'] or 0
            revenus = float(revenus)
            
            # Dépenses du mois
            entretiens = Entretien.objects.filter(
                date_entretien__gte=premier_jour,
                date_entretien__lt=fin_periode_excl
            ).aggregate(total=Sum('cout'))['total'] or 0
            
            assurances = Assurance.objects.filter(
                date_debut__gte=premier_jour,
                date_debut__lt=fin_periode_excl
            ).aggregate(total=Sum('montant'))['total'] or 0
            
            visites = VisiteTechnique.objects.filter(
                date_visite__gte=premier_jour,
                date_visite__lt=fin_periode_excl
            ).aggregate(total=Sum('montant'))['total'] or 0
            
            depenses = float(entretiens + assurances + visites)
            benefice = revenus - depenses
            
            # Format du mois (ex: "Jan 2024")
            mois_nom = premier_jour.strftime("%b %Y")
            
            graphique.append({
                'mois': mois_nom,
                'revenus': round(revenus, 2),
                'depenses': round(depenses, 2),
                'benefice': round(benefice, 2)
            })
        
        return Response({
            'revenus_mois': round(revenus_mois, 2),
            'depenses_mois': round(depenses_mois, 2),
            'depenses_detail': {
                'entretiens': round(entretiens_mois, 2),
                'assurances': round(assurances_mois, 2),
                'visites': round(visites_mois, 2)
            },
            'benefice_net': round(benefice_net, 2),
            'voitures_disponibles': voitures_libres,
            'total_voitures': total_voitures,
            'graphique': graphique
        })
        
    except Exception as e:
        logger.exception('finances_mensuelles error')
        return Response({
            'revenus_mois': 0,
            'depenses_mois': 0,
            'depenses_detail': {'entretiens': 0, 'assurances': 0, 'visites': 0},
            'benefice_net': 0,
            'voitures_disponibles': 0,
            'total_voitures': 0,
            'graphique': []
        }, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def retours_aujourdhui_simple(request):
    """Retourne les retours de voitures prévus aujourd'hui (version simplifiée pour nouveau dashboard)"""
    try:
        today = timezone.now().date()
        
        retours = ContratLocation.objects.filter(
            date_fin=today,
            statut='en_cours'
        ).select_related('client', 'voiture').order_by('date_fin')
        
        retours_list = []
        for retour in retours:
            retours_list.append({
                'reservation_id': retour.id,
                'voiture': f'{retour.voiture.marque} {retour.voiture.modele}',
                'client': f'{retour.client.nom} {retour.client.prenom}',
                'immatriculation': retour.voiture.immatriculation
            })
        
        return Response({
            'retours': retours_list
        })
        
    except Exception as e:
        logger.exception('retours_aujourdhui_simple error')
        return Response({'retours': []}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alertes_urgentes(request):
    """Retourne les alertes urgentes (assurances, visites, autorisations)"""
    try:
        from cars.models import Assurance, VisiteTechnique, AutorisationCirculation
        
        today = timezone.now().date()
        seuil = today + timedelta(days=7)
        alertes_list = []
        
        # 1. Assurances expirées ou à renouveler sous 7 jours
        assurances = Assurance.objects.filter(
            Q(date_expiration__lte=seuil)
        ).select_related('voiture').order_by('date_expiration')
        
        for assurance in assurances:
            jours_restants = (assurance.date_expiration - today).days
            if jours_restants < 0:
                titre = "⚠️ Assurance EXPIRÉE"
            else:
                titre = f"Assurance expire dans {jours_restants}j"
            
            alertes_list.append({
                'type': 'assurance',
                'titre': titre,
                'voiture': f'{assurance.voiture.marque} {assurance.voiture.modele}',
                'date_expiration': assurance.date_expiration.isoformat()
            })
        
        # 2. Visites techniques expirées ou à renouveler sous 7 jours
        visites = VisiteTechnique.objects.filter(
            Q(date_expiration__lte=seuil)
        ).select_related('voiture').order_by('date_expiration')
        
        for visite in visites:
            jours_restants = (visite.date_expiration - today).days
            if jours_restants < 0:
                titre = "⚠️ Visite technique EXPIRÉE"
            else:
                titre = f"Visite technique expire dans {jours_restants}j"
            
            alertes_list.append({
                'type': 'visite',
                'titre': titre,
                'voiture': f'{visite.voiture.marque} {visite.voiture.modele}',
                'date_expiration': visite.date_expiration.isoformat()
            })
        
        # 3. Autorisations expirées ou à renouveler sous 7 jours
        autorisations = AutorisationCirculation.objects.filter(
            Q(date_expiration__lte=seuil)
        ).select_related('voiture').order_by('date_expiration')
        
        for autorisation in autorisations:
            jours_restants = (autorisation.date_expiration - today).days
            if jours_restants < 0:
                titre = "⚠️ Autorisation EXPIRÉE"
            else:
                titre = f"Autorisation expire dans {jours_restants}j"
            
            alertes_list.append({
                'type': 'autorisation',
                'titre': titre,
                'voiture': f'{autorisation.voiture.marque} {autorisation.voiture.modele}',
                'date_expiration': autorisation.date_expiration.isoformat()
            })
        
        return Response({
            'alertes': alertes_list
        })
        
    except Exception as e:
        logger.exception('alertes_urgentes error')
        return Response({'alertes': []}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def paiements_en_attente(request):
    """Retourne le total et le nombre de paiements en attente"""
    try:
        from django.db.models import F, ExpressionWrapper, DecimalField

        # Montant restant à encaisser = amount - paid_amount - forgiven_amount
        paiements_pending = Payment.objects.filter(
            status='PENDING',
            is_deleted=False
        ).annotate(
            restant=ExpressionWrapper(
                F('amount') - F('paid_amount') - F('forgiven_amount'),
                output_field=DecimalField(max_digits=12, decimal_places=2)
            )
        ).filter(restant__gt=0)

        total = float(paiements_pending.aggregate(total=Sum('restant'))['total'] or 0)
        nombre = paiements_pending.count()
        
        return Response({
            'total': round(total, 2),
            'nombre': nombre
        })
        
    except Exception as e:
        logger.exception('paiements_en_attente error')
        return Response({
            'total': 0,
            'nombre': 0
        }, status=200)
