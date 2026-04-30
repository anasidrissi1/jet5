# Generated manually

from django.db import migrations

def populate_client_info(apps, schema_editor):
    Payment = apps.get_model('payments', 'Payment')
    for payment in Payment.objects.all():
        if payment.reservation and payment.reservation.client:
            client = payment.reservation.client
            payment.client_name = f"{client.nom} {client.prenom}"
            payment.client_id = client.id
            payment.save()

class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0004_payment_client_id_payment_client_name'),
    ]

    operations = [
        migrations.RunPython(populate_client_info),
    ]
