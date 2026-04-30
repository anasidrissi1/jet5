"""
Script de nettoyage des données de test JET5
À exécuter avec: python manage.py shell < scripts/clean_data_shell.py
"""

from django.contrib.auth import get_user_model
from cars.models import Voiture, Entretien
from clients.models import Client
from reservations.models import ContratLocation, Assurance, VisiteTechnique, AutorisationCirculation
from payments.models import Payment, PaymentHistory
from notifications.models import Notification

print("\n" + "="*60)
print("⚠️  NETTOYAGE DES DONNÉES DE TEST")
print("="*60)

# Compter avant suppression
counts = {
    'notifications': Notification.objects.count(),
    'payment_history': PaymentHistory.objects.count(),
    'payments': Payment.objects.count(),
    'reservations': ContratLocation.objects.count(),
    'assurances': Assurance.objects.count(),
    'visites': VisiteTechnique.objects.count(),
    'autorisations': AutorisationCirculation.objects.count(),
    'entretiens': Entretien.objects.count(),
    'clients': Client.objects.count(),
    'voitures': Voiture.objects.count(),
}

print("\n📊 Données trouvées:")
for key, value in counts.items():
    print(f"  - {key}: {value}")

print("\n🔄 Suppression en cours...\n")

# Supprimer dans l'ordre
Notification.objects.all().delete()
print(f"✅ {counts['notifications']} notifications supprimées")

PaymentHistory.objects.all().delete()
print(f"✅ {counts['payment_history']} historiques de paiement supprimés")

Payment.objects.all().delete()
print(f"✅ {counts['payments']} paiements supprimés")

ContratLocation.objects.all().delete()
print(f"✅ {counts['reservations']} réservations supprimées")

Assurance.objects.all().delete()
print(f"✅ {counts['assurances']} assurances supprimées")

VisiteTechnique.objects.all().delete()
print(f"✅ {counts['visites']} visites techniques supprimées")

AutorisationCirculation.objects.all().delete()
print(f"✅ {counts['autorisations']} autorisations supprimées")

Entretien.objects.all().delete()
print(f"✅ {counts['entretiens']} entretiens supprimés")

Client.objects.all().delete()
print(f"✅ {counts['clients']} clients supprimés")

Voiture.objects.all().delete()
print(f"✅ {counts['voitures']} voitures supprimées")

User = get_user_model()
print(f"\n👥 Utilisateurs conservés: {User.objects.count()}")

print("\n" + "="*60)
print("✅ NETTOYAGE TERMINÉ!")
print("="*60)
print("\n💡 Vous pouvez maintenant créer vos vraies données.\n")
