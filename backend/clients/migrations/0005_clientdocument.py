from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0004_clientrequest'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClientDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_type', models.CharField(choices=[('cin', 'CIN'), ('permis', 'Permis'), ('passeport', 'Passeport')], max_length=20)),
                ('file', models.FileField(upload_to='clients/documents/')),
                ('date_ajout', models.DateTimeField(auto_now_add=True)),
                ('client', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='documents', to='clients.client')),
            ],
            options={
                'ordering': ['document_type', 'date_ajout'],
            },
        ),
    ]