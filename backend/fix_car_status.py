# Script de vérification/correction des statuts de voitures
# À exécuter avec: python manage.py shell < fix_car_status.py

from cars.models import Voiture

print("🔍 Vérification des statuts de voitures...")
print("=" * 50)

all_cars = Voiture.objects.all()
print(f"\n📊 Total de voitures : {all_cars.count()}")

# Grouper par statut
statuts = {}
for car in all_cars:
    status = car.statut or 'None'
    statuts[status] = statuts.get(status, 0) + 1

print("\n📋 Répartition par statut :")
for status, count in statuts.items():
    print(f"  - {status}: {count} voiture(s)")

# Lister les voitures avec statut incorrect
print("\n⚠️  Voitures avec statut problématique :")
problematic_statuses = ['louee', 'louée', 'en_cours', 'reserve', 'reservee', 'réservée']
problematic_cars = Voiture.objects.filter(statut__in=problematic_statuses)

if problematic_cars.exists():
    for car in problematic_cars:
        print(f"  - {car.immatriculation} ({car.marque} {car.modele}) : {car.statut}")
else:
    print("  ✅ Aucune voiture avec statut problématique")

# Corriger les statuts si nécessaire (optionnel - décommenter pour exécuter)
# print("\n🔧 Correction des statuts...")
# updated = Voiture.objects.filter(statut__in=problematic_statuses).update(statut='libre')
# print(f"✅ {updated} voiture(s) mise(s) à jour vers 'libre'")

print("\n" + "=" * 50)
print("✅ Vérification terminée !")
