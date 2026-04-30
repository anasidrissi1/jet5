# Generated manually to update reservation status for completed payments

from django.db import migrations, models


def update_reservation_status_for_completed_payments(apps, schema_editor):
    """
    Update reservation status to 'termine' for reservations with completed payments
    """
    Payment = apps.get_model('payments', 'Payment')
    ContratLocation = apps.get_model('reservations', 'ContratLocation')

    # Get all payments where paid_amount >= amount (completed payments)
    completed_payments = Payment.objects.filter(paid_amount__gte=models.F('amount'))

    for payment in completed_payments:
        try:
            reservation = payment.reservation
            if reservation.statut == 'en_cours':
                reservation.statut = 'termine'
                reservation.save()
        except Exception as e:
            print(f"Error updating reservation {payment.reservation_id}: {e}")


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0005_populate_client_info'),
    ]

    operations = [
        migrations.RunPython(update_reservation_status_for_completed_payments),
    ]
