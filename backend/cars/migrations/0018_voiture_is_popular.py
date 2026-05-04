from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cars', '0017_voiture_equipements_voiture_nombre_places'),
    ]

    operations = [
        migrations.AddField(
            model_name='voiture',
            name='is_popular',
            field=models.BooleanField(
                default=False,
                help_text="Si activé, la voiture apparaît dans la section 'Voitures populaires' (max 3).",
            ),
        ),
    ]
