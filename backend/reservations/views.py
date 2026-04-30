import logging

from django.shortcuts import render
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from datetime import datetime, timedelta, date
from decimal import Decimal, InvalidOperation
import json
from django.db import transaction

logger = logging.getLogger(__name__)
from .models import ContratLocation
from .serializers import ContratLocationSerializer, PublicReservationSerializer
from notifications.models import Notification


def _find_or_create_client(data):
    from clients.models import Client

    email = data.get('email')
    phone = data.get('phone') or data.get('telephone')
    first_name = data.get('first_name') or data.get('prenom')
    last_name = data.get('last_name') or data.get('nom')
    birth_date_raw = data.get('date_naissance')
    birth_date = parse_date(birth_date_raw) if birth_date_raw else None
    city = data.get('ville')
    address = data.get('adresse')
    cin = data.get('cin') or data.get('cin_numero')

    qs = Client.objects.all()
    if email:
        qs = qs.filter(email=email)
    elif phone:
        qs = qs.filter(telephone=phone)
    elif cin:
        qs = qs.filter(cin_numero=cin)
    client = qs.first()

    if client:
        fields_to_update = []
        if not client.date_naissance and birth_date:
            client.date_naissance = birth_date
            fields_to_update.append('date_naissance')
        if not client.ville and city:
            client.ville = city
            fields_to_update.append('ville')
        if not client.adresse and address:
            client.adresse = address
            fields_to_update.append('adresse')
        if fields_to_update:
            client.save(update_fields=fields_to_update)
        return client

    return Client.objects.create(
        nom=last_name or '',
        prenom=first_name or '',
        email=email or None,
        telephone=phone or None,
        date_naissance=birth_date,
        ville=city or None,
        adresse=address or None,
        cin_numero=cin or None,
    )

class ContratLocationViewSet(viewsets.ModelViewSet):
    serializer_class = ContratLocationSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['client__nom', 'client__prenom', 'voiture__immatriculation']
    ordering_fields = ['date_creation', 'date_debut']
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retourne le queryset adapte a l'action, avec relations prechargees."""
        queryset = ContratLocation.objects.select_related(
            'client', 'voiture', 'conducteur_secondaire'
        ).order_by('-date_creation')

        if getattr(self, 'action', None) in ['corbeille', 'restore', 'permanent_delete']:
            queryset = queryset.filter(is_deleted=True)
        else:
            queryset = queryset.filter(is_deleted=False, is_archived=False)

        origin_filter = self.request.query_params.get('origin') or self.request.query_params.get('origine')
        if origin_filter:
            queryset = queryset.filter(origine_reservation=origin_filter)

        return queryset

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='public')
    def public_create(self, request):
        """Création de réservation publique (pay_on_site)."""
        serializer = PublicReservationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        car_id = data['car_id']
        start_date = data['start_date']
        end_date = data['end_date']
        pickup = data.get('pickup_location', '')
        dropoff = data.get('dropoff_location', '')
        payment_method = data.get('payment_method', 'pay_on_site')

        # Vérifier dispo simple
        from cars.models import Voiture
        try:
            car = Voiture.objects.get(id=car_id)
        except Voiture.DoesNotExist:
            return Response({'error': 'Car not found'}, status=status.HTTP_404_NOT_FOUND)

        overlapping = ContratLocation.objects.filter(
            is_deleted=False,
            is_archived=False,
            voiture=car,
            date_fin__gte=start_date,
            date_debut__lte=end_date,
        ).exclude(statut='annule').exists()

        client = _find_or_create_client(data.get('customer', {}))

        # nombre_jours calculé
        nombre_jours = (end_date - start_date).days + 1
        if nombre_jours <= 0:
            return Response({'error': 'La plage de dates est invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        comment_lines = [f"Pickup: {pickup} / Dropoff: {dropoff}"]
        comment_lines.append("[ONLINE_STATUS:new]")
        comment_lines.append("[A_VERIFIER] Demande recue depuis le site public.")
        if overlapping:
            comment_lines.append(
                "Disponibilite a confirmer par l'agence : le vehicule est deja engage sur cette periode."
            )

        with transaction.atomic():
            reservation = ContratLocation.objects.create(
                voiture=car,
                client=client,
                date_debut=start_date,
                nombre_jours=nombre_jours,
                prix_journalier=car.prix_journalier,
                statut='planifiee',
                origine_reservation='en_ligne',
                pickup_location=pickup or None,
                dropoff_location=dropoff or None,
                commentaire="\n".join(comment_lines),
                methode_paiement='CASH' if payment_method == 'pay_on_site' else 'OTHER',
            )
            reservation.save()

            Notification.objects.create(
                type='reservation_online',
                message=(
                    f"[A_VERIFIER] Nouvelle reservation online: {client.nom} {client.prenom}".strip()
                    + f" - {car.marque} {car.modele}"
                    + f" du {start_date} au {end_date}"
                ),
                voiture=f"{car.marque} {car.modele} - {car.immatriculation}",
                client_nom=f"{client.nom} {client.prenom}".strip() or None,
                client_telephone=client.telephone,
                priorite='urgent',
                urgence=True,
                reservation_id=reservation.id,
            )

        return Response({
            'message': "Votre demande a bien ete enregistree. L'agence vous contactera pour confirmation.",
            'reservation_id': reservation.id,
            'statut': reservation.statut,
            'availability_requires_confirmation': overlapping,
            'client': {
                'id': client.id,
                'nom': client.nom,
                'prenom': client.prenom,
                'email': client.email,
                'telephone': client.telephone,
            },
            'car': {
                'id': car.id,
                'marque': car.marque,
                'modele': car.modele,
                'immatriculation': car.immatriculation,
            },
            'dates': {
                'start_date': start_date,
                'end_date': end_date,
                'nombre_jours': nombre_jours
            }
        }, status=status.HTTP_201_CREATED)


    @action(detail=True, methods=['post'])
    def change_car(self, request, pk=None):
        """Changer de voiture"""
        reservation = self.get_object()
        new_car_id = request.data.get('new_car_id')
        reason = request.data.get('reason', '')
        
        try:
            from cars.models import Voiture
            new_car = Voiture.objects.get(id=new_car_id)
            
            if new_car.statut != 'libre':
                return Response(
                    {'error': 'Cette voiture n\'est pas disponible'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            old_car = reservation.voiture
            old_car.statut = 'libre'
            old_car.save()
            
            new_car.statut = 'louee'
            new_car.save()
            
            reservation.voiture = new_car
            reservation.commentaire = f"{reservation.commentaire or ''}\n[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Changement de voiture: {old_car.immatriculation} → {new_car.immatriculation}. Raison: {reason}"
            reservation.save()
            
            return Response({
                'message': 'Voiture changée avec succès',
                'old_car': f"{old_car.marque} {old_car.modele}",
                'new_car': f"{new_car.marque} {new_car.modele}"
            })
        except Exception as e:
            logger.exception('change_car error')
            return Response(
                {'error': 'Failed to change car'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def generate_invoice(self, request, pk=None):
        """Retourner données pour génération facture PDF"""
        reservation = self.get_object()
        
        try:
            from payments.models import Payment
            from payments.serializers import PaymentSerializer
            
            payments = Payment.objects.filter(reservation=reservation)
            
            return Response({
                'reservation': ContratLocationSerializer(reservation).data,
                'payments': PaymentSerializer(payments, many=True).data
            })
        except Exception as e:
            logger.exception('generate_invoice error')
            return Response(
                {'error': 'Failed to generate invoice'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def add_driver(self, request, pk=None):
        """Ajouter conducteur secondaire"""
        reservation = self.get_object()
        driver_id = request.data.get('driver_id')
        
        try:
            from clients.models import Client
            driver = Client.objects.get(id=driver_id)
            
            if driver.id == reservation.client.id:
                return Response(
                    {'error': 'Le conducteur secondaire ne peut pas être le même que le conducteur principal'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            reservation.conducteur_secondaire = driver
            reservation.save()
            
            return Response({
                'message': 'Conducteur secondaire ajouté avec succès',
                'driver': f"{driver.nom} {driver.prenom}"
            })
        except Exception as e:
            logger.exception('add_driver error')
            return Response(
                {'error': 'Failed to add driver'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['delete'])
    def remove_driver(self, request, pk=None):
        """Retirer conducteur secondaire"""
        reservation = self.get_object()
        
        if not reservation.conducteur_secondaire:
            return Response(
                {'error': 'Aucun conducteur secondaire à retirer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reservation.conducteur_secondaire = None
        reservation.save()
        
        return Response({
            'message': 'Conducteur secondaire retiré avec succès'
        })
    
    @action(detail=False, methods=['get'])
    def historique(self, request):
        """Liste des réservations terminées et payées (historique)"""
        from payments.models import Payment
        from django.db.models import Sum
        
        today = date.today()
        
        # Réservations terminées (date passée) et complètement payées
        reservations = ContratLocation.objects.filter(
            is_deleted=False,
            date_fin__lt=today
        ).order_by('-date_fin')
        
        # Filtrer celles qui sont complètement payées
        historique_list = []
        for reservation in reservations:
            total_paye = Payment.objects.filter(
                reservation=reservation
            ).aggregate(Sum('montant'))['montant__sum'] or 0
            
            if total_paye >= reservation.montant_total:
                historique_list.append(reservation)
        
        serializer = self.get_serializer(historique_list, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def corbeille(self, request):
        """Liste des réservations supprimées (corbeille)"""
        reservations = ContratLocation.objects.filter(
            is_deleted=True
        ).order_by('-deleted_at')
        
        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def move_to_trash(self, request, pk=None):
        """Déplacer une réservation vers la corbeille"""
        reservation = self.get_object()
        reservation.is_deleted = True
        reservation.deleted_at = timezone.now()
        reservation.save()
        
        return Response({
            'message': 'Réservation déplacée vers la corbeille'
        })
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restaurer une réservation depuis la corbeille"""
        reservation = self.get_object()
        reservation.is_deleted = False
        reservation.deleted_at = None
        reservation.save()
        
        return Response({
            'message': 'Réservation restaurée avec succès'
        })
    
    @action(detail=True, methods=['delete'])
    def permanent_delete(self, request, pk=None):
        """Suppression définitive d'une réservation"""
        reservation = self.get_object()
        reservation.delete()
        
        return Response({
            'message': 'Réservation supprimée définitivement'
        }, status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'], url_path='returns-today')
    def returns_today(self, request):
        """Récupère les réservations dont la date de retour est aujourd'hui"""
        today = date.today()
        reservations = ContratLocation.objects.filter(
            date_fin=today,
            statut='en_cours',
            is_deleted=False
        ).select_related('client', 'voiture')
        
        serializer = self.get_serializer(reservations, many=True)
        return Response({
            'count': reservations.count(),
            'reservations': serializer.data
        })
    
    @action(detail=True, methods=['post'], url_path='mark-returned')
    def mark_returned(self, request, pk=None):
        """Marquer une voiture comme récupérée"""
        reservation = self.get_object()
        heure_retour = request.data.get('heure_retour')
        
        with transaction.atomic():
            # Mettre à jour la réservation
            reservation.statut = 'termine'
            if heure_retour:
                reservation.heure_retour = heure_retour
            reservation.save()
            
            # Mettre à jour le statut de la voiture
            voiture = reservation.voiture
            voiture.statut = 'libre'
            voiture.save()
        
        return Response({
            'message': 'Voiture récupérée avec succès',
            'reservation': self.get_serializer(reservation).data
        })
    
    @action(detail=True, methods=['post'], url_path='extend-rental')
    def extend_rental(self, request, pk=None):
        """Prolonger une location"""
        reservation = self.get_object()
        jours_supplementaires = request.data.get('jours_supplementaires', 0)
        
        if not jours_supplementaires or int(jours_supplementaires) <= 0:
            return Response({
                'error': 'Nombre de jours invalide'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Ajouter les jours de prolongation
            reservation.jours_prolongation = (reservation.jours_prolongation or 0) + int(jours_supplementaires)
            
            # Recalculer la date de fin
            if reservation.date_fin:
                reservation.date_fin = reservation.date_fin + timedelta(days=int(jours_supplementaires))
            
            # Le statut reste en_cours
            reservation.statut = 'en_cours'
            reservation.save()
        
        return Response({
            'message': f'Location prolongée de {jours_supplementaires} jour(s)',
            'reservation': self.get_serializer(reservation).data
        })

    @action(detail=True, methods=['post'], url_path='pa-update')
    def pa_update(self, request, pk=None):
        """Mettre a jour Prolongation + Avance en une seule action."""
        reservation = self.get_object()

        raw_days = request.data.get('jours_supplementaires')
        raw_target_end = request.data.get('date_fin')
        raw_advance = request.data.get('advance_amount')
        payment_method = request.data.get('payment_method', 'CASH')

        days_to_add = 0
        old_end_date = reservation.date_fin
        new_end_date = reservation.date_fin

        # Date cible prioritaire si elle est renseignee
        if raw_target_end:
            try:
                target_end = datetime.strptime(str(raw_target_end), '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Format date_fin invalide (AAAA-MM-JJ requis).'}, status=status.HTTP_400_BAD_REQUEST)

            reference_end = reservation.date_fin or reservation.date_debut
            if not reference_end:
                return Response({'error': 'Impossible de determiner la date de fin actuelle.'}, status=status.HTTP_400_BAD_REQUEST)

            computed = (target_end - reference_end).days
            if computed <= 0:
                # Si l'agent veut seulement ajouter une avance, on ignore la date identique/non posterieure.
                if raw_advance not in (None, '') and raw_days in (None, ''):
                    computed = 0
                else:
                    return Response({'error': 'La nouvelle date de fin doit etre posterieure a la date actuelle.'}, status=status.HTTP_400_BAD_REQUEST)

            days_to_add = computed
            new_end_date = target_end
        elif raw_days not in (None, ''):
            try:
                days_to_add = int(raw_days)
            except (TypeError, ValueError):
                return Response({'error': 'Nombre de jours invalide.'}, status=status.HTTP_400_BAD_REQUEST)

            if days_to_add <= 0:
                return Response({'error': 'Nombre de jours invalide.'}, status=status.HTTP_400_BAD_REQUEST)

            reference_end = reservation.date_fin or reservation.date_debut
            if not reference_end:
                return Response({'error': 'Impossible de determiner la date de fin actuelle.'}, status=status.HTTP_400_BAD_REQUEST)
            new_end_date = reference_end + timedelta(days=days_to_add)

        advance_amount = Decimal('0.00')
        if raw_advance not in (None, ''):
            try:
                advance_amount = Decimal(str(raw_advance))
            except (InvalidOperation, TypeError, ValueError):
                return Response({'error': 'Montant d avance invalide.'}, status=status.HTTP_400_BAD_REQUEST)

            if advance_amount < 0:
                return Response({'error': 'Le montant d avance ne peut pas etre negatif.'}, status=status.HTTP_400_BAD_REQUEST)

        if days_to_add <= 0 and advance_amount <= 0:
            return Response({'error': 'Renseignez au moins une prolongation ou une avance.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Conserver les valeurs initiales lors de la premiere operation P/A
            current_comment = (reservation.commentaire or '').strip()
            lines = [ln for ln in current_comment.splitlines() if ln.strip()]

            has_initial_snapshot = any(ln.startswith('[PA_INIT]') for ln in lines)
            if not has_initial_snapshot:
                initial_payload = {
                    'date_debut': reservation.date_debut.isoformat() if reservation.date_debut else None,
                    'date_fin': reservation.date_fin.isoformat() if reservation.date_fin else None,
                    'nombre_jours': int(reservation.nombre_jours or 0),
                    'jours_prolongation': int(reservation.jours_prolongation or 0),
                    'avance': str(reservation.avance or Decimal('0.00')),
                    'recorded_at': timezone.now().isoformat(),
                }
                lines.append(f"[PA_INIT] {json.dumps(initial_payload, ensure_ascii=True)}")

            payment = None

            if advance_amount > 0:
                from payments.models import Payment, PaymentHistory

                payment, _ = Payment.objects.get_or_create(
                    reservation=reservation,
                    defaults={
                        'amount': reservation.montant_total or Decimal('0.00'),
                        'paid_amount': reservation.avance or Decimal('0.00'),
                        'client_name': f"{reservation.client.nom} {reservation.client.prenom}",
                        'client_id': reservation.client.id,
                        'created_by': request.user if request.user.is_authenticated else None,
                    }
                )

                payment.add_payment(
                    additional_amount=advance_amount,
                    method=payment_method,
                    user=request.user if request.user.is_authenticated else None,
                    forgiven=Decimal('0.00')
                )

                PaymentHistory.objects.create(
                    payment=payment,
                    amount=advance_amount,
                    method=payment_method,
                    created_by=request.user if request.user.is_authenticated else None,
                    notes='Ajout avance via action P/A'
                )

            reservation.refresh_from_db()
            if days_to_add > 0:
                reservation.jours_prolongation = (reservation.jours_prolongation or 0) + days_to_add
                reservation.date_fin = new_end_date
                reservation.statut = 'en_cours'
                # Full save pour recalculer montant_total via save() du modele.
                reservation.save()
            else:
                reservation.save(update_fields=['statut'])

            # Synchroniser le montant total de paiement avec la reservation apres prolongation.
            if days_to_add > 0:
                from payments.models import Payment

                if payment is None:
                    payment = Payment.objects.filter(reservation=reservation).first()

                if payment and payment.amount != (reservation.montant_total or Decimal('0.00')):
                    payment.amount = reservation.montant_total or Decimal('0.00')
                    payment.save()

            audit_payload = {
                'timestamp': timezone.now().isoformat(),
                'days_added': int(days_to_add),
                'old_end_date': old_end_date.isoformat() if old_end_date else None,
                'new_end_date': reservation.date_fin.isoformat() if reservation.date_fin else (new_end_date.isoformat() if new_end_date else None),
                'advance_added': str(advance_amount),
                'payment_method': payment_method if advance_amount > 0 else None,
                'advance_total_after': str(reservation.avance or Decimal('0.00')),
            }
            lines.append(f"[PA_AUDIT] {json.dumps(audit_payload, ensure_ascii=True)}")

            reservation.commentaire = '\n'.join(lines)
            reservation.save(update_fields=['commentaire'])

        reservation.refresh_from_db()
        return Response({
            'message': 'Mise a jour P/A enregistree avec succes.',
            'reservation': self.get_serializer(reservation).data,
            'changes': {
                'days_added': days_to_add,
                'advance_added': str(advance_amount),
                'date_fin': reservation.date_fin.isoformat() if reservation.date_fin else None,
            }
        })
