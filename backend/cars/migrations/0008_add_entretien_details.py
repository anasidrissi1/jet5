# Generated migration for entretien details models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cars', '0007_add_entretien_intelligent_fields'),
    ]

    operations = [
        # Add main_oeuvre field to Entretien
        migrations.AddField(
            model_name='entretien',
            name='main_oeuvre',
            field=models.DecimalField(decimal_places=2, default=0, help_text="Coût de la main d'œuvre", max_digits=10),
        ),
        
        # Create EntretienPneu model
        migrations.CreateModel(
            name='EntretienPneu',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('position', models.CharField(choices=[('avant_gauche', 'Avant Gauche'), ('avant_droit', 'Avant Droit'), ('arriere_gauche', 'Arrière Gauche'), ('arriere_droit', 'Arrière Droit')], max_length=20)),
                ('marque', models.CharField(max_length=100)),
                ('modele', models.CharField(max_length=100)),
                ('prix_unitaire', models.DecimalField(decimal_places=2, max_digits=10)),
                ('entretien', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pneus', to='cars.entretien')),
            ],
            options={
                'verbose_name': "Pneu d'entretien",
                'verbose_name_plural': "Pneus d'entretien",
            },
        ),
        
        # Create EntretienFrein model
        migrations.CreateModel(
            name='EntretienFrein',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_frein', models.CharField(choices=[('plaquettes_avant', 'Plaquettes Avant'), ('plaquettes_arriere', 'Plaquettes Arrière'), ('disques_avant', 'Disques Avant'), ('disques_arriere', 'Disques Arrière')], max_length=30)),
                ('prix_unitaire', models.DecimalField(decimal_places=2, max_digits=10)),
                ('entretien', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='freins', to='cars.entretien')),
            ],
            options={
                'verbose_name': "Frein d'entretien",
                'verbose_name_plural': "Freins d'entretien",
            },
        ),
        
        # Create EntretienBatterie model
        migrations.CreateModel(
            name='EntretienBatterie',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('marque', models.CharField(max_length=100)),
                ('modele', models.CharField(max_length=100)),
                ('prix', models.DecimalField(decimal_places=2, max_digits=10)),
                ('entretien', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='batterie', to='cars.entretien')),
            ],
            options={
                'verbose_name': "Batterie d'entretien",
                'verbose_name_plural': "Batteries d'entretien",
            },
        ),
        
        # Create EntretienVidange model
        migrations.CreateModel(
            name='EntretienVidange',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_huile', models.CharField(help_text='Ex: 5W30, 10W40', max_length=50)),
                ('quantite_litres', models.DecimalField(decimal_places=2, max_digits=5)),
                ('prix_total', models.DecimalField(decimal_places=2, max_digits=10)),
                ('filtre_huile', models.BooleanField(default=False)),
                ('prix_filtre_huile', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('filtre_air', models.BooleanField(default=False)),
                ('prix_filtre_air', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('filtre_carburant', models.BooleanField(default=False)),
                ('prix_filtre_carburant', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('entretien', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='vidange', to='cars.entretien')),
            ],
            options={
                'verbose_name': "Vidange d'entretien",
                'verbose_name_plural': "Vidanges d'entretien",
            },
        ),
        
        # Create EntretienRevision model
        migrations.CreateModel(
            name='EntretienRevision',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('controle_freins', models.BooleanField(default=False)),
                ('prix_controle_freins', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('controle_suspension', models.BooleanField(default=False)),
                ('prix_controle_suspension', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('controle_direction', models.BooleanField(default=False)),
                ('prix_controle_direction', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('controle_climatisation', models.BooleanField(default=False)),
                ('prix_controle_climatisation', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('diagnostic_electronique', models.BooleanField(default=False)),
                ('prix_diagnostic_electronique', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('entretien', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='revision', to='cars.entretien')),
            ],
            options={
                'verbose_name': "Révision d'entretien",
                'verbose_name_plural': "Révisions d'entretien",
            },
        ),
        
        # Create PieceRevision model
        migrations.CreateModel(
            name='PieceRevision',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom_piece', models.CharField(max_length=200)),
                ('prix', models.DecimalField(decimal_places=2, max_digits=10)),
                ('revision', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pieces', to='cars.entretienrevision')),
            ],
            options={
                'verbose_name': 'Pièce de révision',
                'verbose_name_plural': 'Pièces de révision',
            },
        ),
    ]
