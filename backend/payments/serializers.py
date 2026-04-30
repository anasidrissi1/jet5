from decimal import Decimal
from rest_framework import serializers
from .models import Payment, PaymentHistory
from reservations.models import ContratLocation as Reservation
from django.utils import timezone

class PaymentHistorySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    forgiven_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    
    class Meta:
        model = PaymentHistory
        fields = ['id', 'amount', 'forgiven_amount', 'method', 'created_at', 'created_by', 'created_by_name', 'notes']

class PaymentSerializer(serializers.ModelSerializer):
    reservation_id = serializers.PrimaryKeyRelatedField(source="reservation", queryset=Reservation.objects.all())
    reservation_total = serializers.SerializerMethodField(read_only=True)
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    forgiven_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    remaining = serializers.SerializerMethodField(read_only=True)
    client_name = serializers.CharField(read_only=True)
    client_id = serializers.IntegerField(read_only=True)
    reference = serializers.CharField(source='id', read_only=True)
    date = serializers.DateTimeField(source='paid_at', read_only=True)
    invoice_url = serializers.SerializerMethodField(read_only=True)
    monthly_amount = serializers.SerializerMethodField(read_only=True)
    next_due_date = serializers.SerializerMethodField(read_only=True)
    months_due = serializers.SerializerMethodField(read_only=True)
    expected_paid = serializers.SerializerMethodField(read_only=True)
    remaining_to_catch_up = serializers.SerializerMethodField(read_only=True)
    is_overdue = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id", "reference", "reservation_id", "client_name", "client_id", "amount", 
            "method", "status", "date", "paid_at", "created_at", "reservation_total", 
            "paid_amount", "forgiven_amount", "remaining", "invoice_url",
            "monthly_amount", "next_due_date", "months_due", "expected_paid",
            "remaining_to_catch_up", "is_overdue",
        ]
        read_only_fields = ["id", "paid_at", "created_at"]

    def get_reservation_total(self, obj):
        return obj.amount

    def get_remaining(self, obj):
        return obj.remaining

    def get_invoice_url(self, obj):
        if obj.invoice_file:
            return obj.invoice_file.url
        return None

    def _get_monthly_status(self, obj):
        try:
            return obj.monthly_status() or None
        except Exception:
            return None

    def get_monthly_amount(self, obj):
        status = self._get_monthly_status(obj)
        return status.get("monthly_amount") if status else None

    def get_next_due_date(self, obj):
        status = self._get_monthly_status(obj)
        return status.get("next_due_date") if status else None

    def get_months_due(self, obj):
        status = self._get_monthly_status(obj)
        return status.get("months_due") if status else None

    def get_expected_paid(self, obj):
        status = self._get_monthly_status(obj)
        return status.get("expected_paid") if status else None

    def get_remaining_to_catch_up(self, obj):
        status = self._get_monthly_status(obj)
        return status.get("remaining_to_catch_up") if status else None

    def get_is_overdue(self, obj):
        status = self._get_monthly_status(obj)
        return status.get("is_overdue") if status else None

class PaymentCreateSerializer(serializers.ModelSerializer):
    advance = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True, required=False)
    reservation_total = serializers.SerializerMethodField(read_only=True)
    remaining = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Payment
        fields = ["reservation", "amount", "method", "status", "advance", "reservation_total", "remaining"]
        read_only_fields = ["amount", "status", "reservation_total", "remaining"]

    def get_reservation_total(self, obj):
        if isinstance(obj, Payment):
            return obj.amount
        reservation = obj.get("reservation") if isinstance(obj, dict) else None
        if reservation is None:
            return None
        return getattr(reservation, "montant_total", None)

    def get_remaining(self, obj):
        if isinstance(obj, Payment):
            return None
        advance = obj.get("advance")
        reservation = obj.get("reservation")
        total = None
        if reservation is not None:
            total = getattr(reservation, "montant_total", None)
        if total is None:
            return None
        if advance is None:
            advance = Decimal("0.00")
        return Decimal(total) - Decimal(advance)

    def validate(self, attrs):
        reservation = attrs.get("reservation")
        total = None
        if reservation is not None:
            total = getattr(reservation, "montant_total", None)
        if total is None:
            raise serializers.ValidationError("La réservation ne contient pas de montant total calculable.")

        advance = attrs.get("advance") or Decimal("0.00")
        try:
            advance = Decimal(advance)
        except Exception:
            raise serializers.ValidationError({"advance": "Acompte invalide"})

        if advance < 0:
            raise serializers.ValidationError({"advance": "L'acompte ne peut pas être négatif."})
        if advance > Decimal(total):
            raise serializers.ValidationError({"advance": "L'acompte ne peut pas dépasser le montant total."})

        attrs["_reservation_total"] = Decimal(total)
        attrs["_advance_decimal"] = advance
        return attrs

    def create(self, validated_data):
        reservation = validated_data["reservation"]
        method = validated_data.get("method", "CARD")
        total = validated_data.pop("_reservation_total")
        advance = validated_data.pop("_advance_decimal", Decimal("0.00"))

        # Determine status and paid_at depending on advance
        if advance >= total:
            status = "PAID"
            paid_at = timezone.now()
        elif advance > Decimal("0.00"):
            status = "PENDING"
            paid_at = None
        else:
            status = "PENDING"
            paid_at = None

        client = reservation.client
        client_name = f"{client.nom} {client.prenom}"
        client_id = client.id

        payment = Payment.objects.create(
            reservation=reservation,
            amount=total,
            method=method,
            status=status,
            paid_at=paid_at,
            paid_amount=advance,
            client_name=client_name,
            client_id=client_id,
            created_by=self.context.get("request").user if self.context.get("request") else None,
        )

        # Créer l'entrée d'historique pour l'avance initiale
        if advance > 0:
            PaymentHistory.objects.create(
                payment=payment,
                amount=advance,
                method=method,
                created_by=self.context.get("request").user if self.context.get("request") else None,
                notes="Acompte initial"
            )

        return payment