from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reservations', '0015_contratlocation_origine_reservation'),
    ]

    operations = [
        migrations.AddField(
            model_name='contratlocation',
            name='dropoff_location',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='contratlocation',
            name='pickup_location',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
