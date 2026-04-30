from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0005_clientdocument'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='date_naissance',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='client',
            name='ville',
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
    ]
