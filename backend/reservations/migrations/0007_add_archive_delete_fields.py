# Generated migration for historique and corbeille fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reservations', '0006_add_conducteur_secondaire'),
    ]

    operations = [
        migrations.AddField(
            model_name='contratlocation',
            name='is_archived',
            field=models.BooleanField(default=False, help_text='Réservation archivée (historique)'),
        ),
        migrations.AddField(
            model_name='contratlocation',
            name='is_deleted',
            field=models.BooleanField(default=False, help_text='Réservation supprimée (corbeille)'),
        ),
        migrations.AddField(
            model_name='contratlocation',
            name='deleted_at',
            field=models.DateTimeField(blank=True, help_text='Date de suppression', null=True),
        ),
    ]
