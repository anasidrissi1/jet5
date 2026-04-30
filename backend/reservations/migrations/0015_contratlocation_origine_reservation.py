from django.db import migrations, models


def mark_public_reservations_as_online(apps, schema_editor):
    ContratLocation = apps.get_model('reservations', 'ContratLocation')
    ContratLocation.objects.filter(commentaire__startswith='Pickup:').update(origine_reservation='en_ligne')


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('reservations', '0014_contratlocation_billing_mode_long_duration'),
    ]

    operations = [
        migrations.AddField(
            model_name='contratlocation',
            name='origine_reservation',
            field=models.CharField(choices=[('admin', 'Admin'), ('en_ligne', 'En ligne')], default='admin', max_length=20),
        ),
        migrations.RunPython(mark_public_reservations_as_online, noop_reverse),
    ]