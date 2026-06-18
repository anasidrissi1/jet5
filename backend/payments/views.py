from decimal import Decimal
import logging
from django.utils import timezone
from django.db.models import Sum
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Payment, PaymentHistory
from .serializers import PaymentSerializer, PaymentCreateSerializer, PaymentHistorySerializer
from .utils import generate_invoice_pdf

logger = logging.getLogger(__name__)


class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Retourne uniquement les paiements actifs (non supprimés)"""
        queryset = Payment.objects.select_related("reservation__client", "reservation")

        if getattr(self, 'action', None) in ['corbeille', 'restore', 'permanent_delete']:
            queryset = queryset.filter(is_deleted=True)
        else:
            queryset = queryset.filter(is_deleted=False)

        reservation_id = self.request.query_params.get("reservation")
        if reservation_id:
            queryset = queryset.filter(reservation_id=reservation_id)

        return queryset

    def get_serializer_class(self):
        if self.action in ["create"]:
            return PaymentCreateSerializer
        return PaymentSerializer

    def perform_create(self, serializer):
        payment = serializer.save()
        try:
            payment.generate_and_attach_invoice(generate_invoice_pdf)
        except Exception:
            logger.exception("Invoice generation failed for payment %s", payment.pk)
        return payment

    @action(detail=True, methods=["get"], url_path="invoice", permission_classes=[IsAuthenticated])
    def invoice(self, request, pk=None):
        payment = self.get_object()
        if not payment.invoice_file:
            payment.generate_and_attach_invoice(generate_invoice_pdf)
        if not payment.invoice_file:
            return Response({"detail": "Échec génération facture."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({"invoice_url": payment.invoice_file.url})

    @action(detail=False, methods=["get"], url_path="stats", permission_classes=[IsAuthenticated])
    def stats(self, request):
        total = Payment.objects.filter(status="PAID").aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        count = Payment.objects.filter(status="PAID").count()
        return Response({
            "total_revenue": total,
            "payments_count": count
        })

    @action(detail=True, methods=["post"], url_path="add-payment")
    def add_payment(self, request, pk=None):
        payment = self.get_object()
        additional_amount = request.data.get("additional_amount", 0)
        forgiven_amount = request.data.get("forgiven_amount", 0)
        method = request.data.get("method", "CARD")

        try:
            additional_amount = Decimal(additional_amount)
            forgiven_amount = Decimal(forgiven_amount)
        except Exception:
            return Response({"detail": "Montants invalides."}, status=status.HTTP_400_BAD_REQUEST)

        if additional_amount < 0 or forgiven_amount < 0:
            return Response({"detail": "Les montants ne peuvent pas être négatifs."}, status=status.HTTP_400_BAD_REQUEST)

        if additional_amount == 0 and forgiven_amount == 0:
            return Response({"detail": "Au moins un montant (payé ou pardonné) doit être supérieur à 0."}, status=status.HTTP_400_BAD_REQUEST)

        # Vérifier que le total ne dépasse pas le reste
        remaining = payment.remaining
        total_to_add = additional_amount + forgiven_amount
        
        if total_to_add > remaining:
            return Response({
                "detail": f"Le total ({total_to_add}) dépasse le reste à payer ({remaining})"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Ajouter le paiement et créer l'historique
        payment.add_payment(additional_amount, method, request.user, forgiven_amount)

        # Enregistrer dans l'historique
        notes = f"Ajout de paiement - {method}"
        if forgiven_amount > 0:
            notes += f" | Montant pardonné: {forgiven_amount} MAD"
        
        PaymentHistory.objects.create(
            payment=payment,
            amount=additional_amount,
            forgiven_amount=forgiven_amount,
            method=method,
            created_by=request.user,
            notes=notes
        )

        serializer = self.get_serializer(payment)
        return Response(serializer.data)

    @action(detail=True, methods=["put"], url_path="update-payment")
    def update_payment(self, request, pk=None):
        payment = self.get_object()
        new_paid_amount = request.data.get("paid_amount")
        method = request.data.get("method", payment.method)

        if not new_paid_amount:
            return Response({"detail": "paid_amount requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_paid_amount = Decimal(new_paid_amount)
        except Exception:
            return Response({"detail": "paid_amount invalide."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            old_paid_amount = payment.paid_amount
            payment.update_paid_amount(new_paid_amount, method, request.user)

            # Enregistrer dans l'historique
            PaymentHistory.objects.create(
                payment=payment,
                amount=new_paid_amount - old_paid_amount,
                method=method,
                created_by=request.user,
                notes=f"Modification du paiement - Nouveau total: {new_paid_amount}"
            )

            serializer = self.get_serializer(payment)
            return Response(serializer.data)
        except ValueError as e:
            return Response({"detail": "Invalid payment data"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"], url_path="payment-history")
    def payment_history(self, request, pk=None):
        payment = self.get_object()
        history = payment.history.all().order_by('-created_at')
        serializer = PaymentHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="advance-details")
    def advance_details(self, request, pk=None):
        payment = self.get_object()
        history = list(payment.history.all().order_by('created_at'))

        advance_details = []
        for index, entry in enumerate(history):
            advance_details.append({
                "type": "initial" if index == 0 else "addition",
                "amount": entry.amount,
                "date": entry.created_at.isoformat(),
                "method": entry.method,
                "notes": entry.notes or ("Paiement initial" if index == 0 else "Ajout de paiement"),
            })

        if not history and payment.paid_amount > 0:
            advance_details.append({
                "type": "initial",
                "amount": payment.paid_amount,
                "date": payment.created_at.isoformat(),
                "method": payment.method,
                "notes": "Paiement initial",
            })

        return Response({
            "advance_details": advance_details,
            "total_advance": payment.paid_amount
        })

    @action(detail=False, methods=["get"], url_path="financial-summary", permission_classes=[IsAuthenticated])
    def financial_summary(self, request):
        from reservations.models import ContratLocation
        from clients.models import Client

        # Get all active reservations
        reservations = ContratLocation.objects.filter(
            statut__in=['planifiee', 'en_cours', 'termine']
        ).select_related('client', 'voiture').prefetch_related('payment').order_by('-date_debut')

        summary_data = []
        total_general_due = Decimal("0.00")
        total_paid = Decimal("0.00")
        total_remaining = Decimal("0.00")

        for reservation in reservations:
            try:
                montant_total = reservation.montant_total or Decimal("0.00")
                prix_par_jour = reservation.prix_journalier or Decimal("0.00")

                # Créer un payment s'il n'existe pas
                payment, created = Payment.objects.get_or_create(
                    reservation=reservation,
                    defaults={
                        'amount': montant_total,
                        'paid_amount': reservation.avance or Decimal("0.00"),  # Initialize with reservation advance
                        'client_name': f"{reservation.client.nom} {reservation.client.prenom}",
                        'client_id': reservation.client.id,
                        'created_by': request.user if request.user.is_authenticated else None
                    }
                )

                avance = payment.paid_amount
                reste = payment.remaining

                monthly_info = payment.monthly_status() or {}

                # Déterminer le statut de paiement
                if reste <= 0:
                    payment_status = "payé"
                    payment_status_color = "green"
                else:
                    payment_status = "en cours"
                    payment_status_color = "blue"

                # Calculate progress percentage
                progress_percentage = 0
                if montant_total > 0:
                    progress_percentage = min(100, int((avance / montant_total) * 100))

                # Get last payment date from history
                last_payment = payment.history.order_by('-created_at').first()

                date_debut_iso = reservation.date_debut.isoformat() if reservation.date_debut else None
                date_fin_iso = reservation.date_fin.isoformat() if reservation.date_fin else None

                summary_data.append({
                    "reservation_id": reservation.id,
                    "payment_id": payment.id,
                    "client_nom": reservation.client.nom,
                    "client_prenom": reservation.client.prenom,
                    "client_name": f"{reservation.client.nom} {reservation.client.prenom}",
                    "client_id": reservation.client.id,
                    "vehicule_nom": f"{reservation.voiture.marque} {reservation.voiture.modele}",
                    "vehicule_immatriculation": reservation.voiture.immatriculation,
                    "vehicule": {
                        "id": reservation.voiture.id,
                        "immatriculation": reservation.voiture.immatriculation,
                        "marque": reservation.voiture.marque,
                        "modele": reservation.voiture.modele
                    },
                    "date_debut": date_debut_iso,
                    "date_fin": date_fin_iso,
                    "prix_par_jour": prix_par_jour,
                    "montant_total": montant_total,
                    "avance": avance,
                    "reste": reste,
                    "monthly_amount": monthly_info.get("monthly_amount"),
                    "next_due_date": monthly_info.get("next_due_date"),
                    "months_due": monthly_info.get("months_due"),
                    "expected_paid": monthly_info.get("expected_paid"),
                    "remaining_to_catch_up": monthly_info.get("remaining_to_catch_up"),
                    "is_overdue": monthly_info.get("is_overdue"),
                    "payment_status": payment_status,
                    "payment_status_color": payment_status_color,
                    "progress_percentage": progress_percentage,
                    "last_payment_date": last_payment.created_at.isoformat() if last_payment else None,
                    "last_payment_method": last_payment.method if last_payment else None,
                    "reservation_payment_method": reservation.methode_paiement
                })

                total_general_due += montant_total
                total_paid += avance
                total_remaining += reste
            except Exception:
                logger.exception(
                    "financial_summary: reservation %s skipped due to unexpected error",
                    getattr(reservation, "id", None),
                )
                continue

        # Sort by remaining amount descending
        summary_data.sort(key=lambda x: x["reste"], reverse=True)

        return Response({
            "summary": summary_data,
            "totals": {
                "total_general_due": total_general_due,
                "total_paid": total_paid,
                "total_remaining": total_remaining
            }
        })

    @action(detail=False, methods=['get'])
    def corbeille(self, request):
        """Liste des paiements supprimés (corbeille)"""
        payments = Payment.objects.filter(
            is_deleted=True
        ).select_related("reservation__client", "reservation").order_by('-deleted_at')

        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def move_to_trash(self, request, pk=None):
        """Déplacer un paiement vers la corbeille"""
        payment = self.get_object()
        payment.is_deleted = True
        payment.deleted_at = timezone.now()
        payment.save()

        return Response({
            'message': 'Paiement déplacé vers la corbeille'
        })

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restaurer un paiement depuis la corbeille"""
        payment = self.get_object()
        payment.is_deleted = False
        payment.deleted_at = None
        payment.save()

        return Response({
            'message': 'Paiement restauré avec succès'
        })

    @action(detail=True, methods=['delete'])
    def permanent_delete(self, request, pk=None):
        """Suppression définitive d'un paiement"""
        payment = self.get_object()
        payment.delete()

        return Response({
            'message': 'Paiement supprimé définitivement'
        }, status=status.HTTP_204_NO_CONTENT)
