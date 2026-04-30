from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reservations', '0010_remove_contratlocation_caution'),
    ]

    operations = [
        migrations.AddField(
            model_name='contratlocation',
            name='numero_contrat',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
