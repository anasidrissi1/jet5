import calendar
from decimal import Decimal
from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator
from django.core.files.base import ContentFile

from reservations.models import ContratLocation as Reservation

def invoice_upload_to(instance, filename):
    today = timezone.now().date()
    return f"invoices/{today.year}/{today.month}/invoice_res_{instance.reservation.id}_{today.isoformat()}.pdf"

class Payment(models.Model):
    STATUS_CHOICES = (
        ("PAID", "Payé"),
        ("PENDING", "En attente"),
        ("CANCELLED", "Annulé"),
    )

    METHOD_CHOICES = (
        ("CASH", "Espèces"),
        ("CARD", "Carte"),
        ("CHEQUE", "Chèque"),
        ("TPE", "TPE"),
        ("TRANSFER", "Virement"),
        ("OTHER", "Autre"),
    )

    reservation = models.OneToOneField(
        Reservation, on_delete=models.CASCADE, related_name="payment"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    monthly_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Montant fixe attendu par mois pour ventiler les encaissements (longue durée)",
    )
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default="CARD")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    paid_at = models.DateTimeField(null=True, blank=True)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    forgiven_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), help_text="Montant pardonné/remise accordée")
    created_at = models.DateTimeField(auto_now_add=True)
    invoice_file = models.FileField(upload_to=invoice_upload_to, null=True, blank=True)

    # Client info imported from reservation
    client_name = models.CharField(max_length=201, blank=True, null=True)
    client_id = models.PositiveIntegerField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    # Soft delete fields
    is_deleted = models.BooleanField(default=False, help_text='Paiement supprimé (corbeille)')
    deleted_at = models.DateTimeField(blank=True, help_text='Date de suppression', null=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment #{self.pk} - Res {self.reservation_id} - {self.amount} - {self.status}"

    def save(self, *args, **kwargs):
        # Calcul automatique du statut basé sur paid_amount + forgiven_amount
        total_covered = self.paid_amount + self.forgiven_amount
        
        if total_covered >= self.amount:
            self.status = "PAID"
            if not self.paid_at:
                self.paid_at = timezone.now()
        elif self.paid_amount > Decimal("0.00"):
            self.status = "PENDING"
        else:
            self.status = "PENDING"

        # Update reservation status based on payment completion
        old_status = self.reservation.statut
        if total_covered >= self.amount:
            new_status = 'termine'
        else:
            new_status = 'en_cours'

        if old_status != new_status:
            self.reservation.statut = new_status
            self.reservation.save(update_fields=['statut'])

        super().save(*args, **kwargs)

    def add_payment(self, additional_amount, method="CARD", user=None, forgiven=Decimal("0.00")):
        """
        Ajoute un montant au paiement existant
        """
        if additional_amount < 0:
            raise ValueError("Le montant ajouté ne peut pas être négatif.")
        
        if forgiven < 0:
            raise ValueError("Le montant pardonné ne peut pas être négatif.")

        self.paid_amount += Decimal(additional_amount)
        self.forgiven_amount += Decimal(forgiven)
        self.method = method
        if user:
            self.created_by = user

        # Synchroniser l'avance dans la réservation
        self.reservation.avance = self.paid_amount
        self.reservation.save()

        # Si le paiement devient complet (payé + pardonné), mettre à jour le statut
        if (self.paid_amount + self.forgiven_amount) >= self.amount:
            self.reservation.statut = 'termine'
            self.reservation.save()

        self.save()

    def get_monthly_amount(self):
        """Montant mensuel de référence pour ventiler les paiements."""
        if self.monthly_amount and self.monthly_amount > 0:
            return self.monthly_amount

        # Priorité au tarif spécial quand il sert de forfait mensuel sur les longues durées
        if self.reservation and getattr(self.reservation, "tarif_special", None):
            try:
                return Decimal(self.reservation.tarif_special)
            except Exception:
                pass

        # Fallback: essayer de déduire d'une tarification existante
        if self.reservation and self.reservation.prix_journalier:
            try:
                return Decimal(self.reservation.prix_journalier) * Decimal(30)
            except Exception:
                pass

        if self.amount:
            return Decimal(self.amount)

        return Decimal("0.00")

    def monthly_allocation_map(self, as_of=None):
        """Répartition FIFO des montants payés par mois de date anniversaire (clé AAAA-MM)."""
        if not self.reservation or not self.reservation.date_debut:
            return {}

        monthly_amount = self.get_monthly_amount()
        if monthly_amount <= 0:
            return {}

        as_of = as_of or timezone.now().date()
        period_start = self.reservation.date_debut
        remaining = self.paid_amount  # on ventile uniquement le payé (pas le pardonné)

        def _add_month(date_obj):
            target_month = date_obj.month + 1
            target_year = date_obj.year
            if target_month > 12:
                target_month = 1
                target_year += 1

            last_day = calendar.monthrange(target_year, target_month)[1]
            target_day = min(date_obj.day, last_day)
            return date_obj.replace(year=target_year, month=target_month, day=target_day)

        allocations = {}
        while period_start <= as_of and remaining > 0:
            key = period_start.strftime('%Y-%m')
            pay_here = min(remaining, monthly_amount)
            allocations[key] = float(pay_here)
            remaining -= pay_here
            period_start = _add_month(period_start)

        return allocations

    def monthly_status(self, as_of=None):
        """Retourne un résumé mensuel pour les longues durées.

        Calcule combien de mensualités sont "échues" à date anniversaire,
        combien devraient être payées, combien l'ont été et la prochaine échéance.
        """
        from reservations.models import ContratLocation  # import local pour éviter les cycles

        if not isinstance(self.reservation, ContratLocation):
            return None

        if not getattr(self.reservation, "long_duration", False):
            return None

        if not self.reservation.date_debut:
            return None

        as_of = as_of or timezone.now().date()
        start = self.reservation.date_debut

        # Si la date de début est dans le futur, aucune échéance encore due
        if as_of < start:
            monthly_amount = self.get_monthly_amount()
            return {
                "monthly_amount": float(monthly_amount),
                "months_due": 0,
                "expected_paid": 0.0,
                "paid_amount": float(self.paid_amount or 0),
                "remaining_to_catch_up": 0.0,
                "next_due_date": start.isoformat(),
                "is_overdue": False,
            }

        # Compter le nombre de dates anniversaire passées ou égales à aujourd'hui
        def _add_month(date_obj):
            target_month = date_obj.month + 1
            target_year = date_obj.year
            if target_month > 12:
                target_month = 1
                target_year += 1

            last_day = calendar.monthrange(target_year, target_month)[1]
            target_day = min(date_obj.day, last_day)
            return date_obj.replace(year=target_year, month=target_month, day=target_day)

        monthly_amount = self.get_monthly_amount()
        if monthly_amount <= 0:
            return None

        months_due = 0
        cursor = start
        next_due = start

        while cursor <= as_of:
            months_due += 1
            next_due = _add_month(cursor)
            cursor = next_due

        expected_paid = float(months_due * monthly_amount)
        paid_amount = float(self.paid_amount or 0)
        remaining_to_catch_up = max(0.0, expected_paid - paid_amount)
        is_overdue = remaining_to_catch_up > 0.0001

        return {
            "monthly_amount": float(monthly_amount),
            "months_due": months_due,
            "expected_paid": expected_paid,
            "paid_amount": paid_amount,
            "remaining_to_catch_up": remaining_to_catch_up,
            "next_due_date": next_due.isoformat(),
            "is_overdue": is_overdue,
        }

    def update_paid_amount(self, new_paid_amount, method=None, user=None):
        """
        Met à jour le montant payé (pour modification)
        """
        if new_paid_amount < 0:
            raise ValueError("Le montant payé ne peut pas être négatif.")
        
        if new_paid_amount > self.amount:
            raise ValueError("Le montant payé ne peut pas dépasser le montant total.")
        
        self.paid_amount = Decimal(new_paid_amount)
        
        if method:
            self.method = method
            
        if user:
            self.created_by = user

        # Mettre à jour le statut de la réservation
        if self.paid_amount >= self.amount:
            self.reservation.statut = 'termine'
        else:
            self.reservation.statut = 'en_cours'
        self.reservation.save()

        self.save()

    @property
    def remaining(self):
        return max(Decimal("0.00"), self.amount - self.paid_amount - self.forgiven_amount)

    def mark_paid(self, method="CARD", user=None):
        self.status = "PAID"
        self.method = method
        self.paid_at = timezone.now()
        self.paid_amount = self.amount
        if user:
            self.created_by = user
        self.save()

    @transaction.atomic
    def generate_and_attach_invoice(self, generate_pdf_func):
        pdf_bytes = generate_pdf_func(self.reservation, self)
        if not pdf_bytes:
            return None
        filename = invoice_upload_to(self, f"invoice_res_{self.reservation.id}.pdf")
        self.invoice_file.save(filename, ContentFile(pdf_bytes), save=True)
        return self.invoice_file.url

class PaymentHistory(models.Model):
    """
    Historique des paiements pour tracer chaque transaction
    """
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name="history")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    forgiven_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), help_text="Montant pardonné pour cette transaction")
    method = models.CharField(max_length=20, choices=Payment.METHOD_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Paiement {self.amount} - {self.method} - {self.created_at.date()}"