from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0004_alter_notification_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='type',
            field=models.CharField(
                choices=[
                    ('assurance', 'Assurance'),
                    ('visite', 'Visite Technique'),
                    ('autorisation', 'Autorisation de Circulation'),
                    ('entretien', 'Entretien'),
                    ('retour_voiture', 'Retour de voiture'),
                    ('paiement', 'Rappel de paiement'),
                    ('inscription_client', 'Inscription Client'),
                    ('reservation_online', 'Reservation Online'),
                ],
                max_length=50,
            ),
        ),
    ]