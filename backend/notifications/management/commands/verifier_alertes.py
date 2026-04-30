from django.core.management.base import BaseCommand
from notifications.utils import generer_toutes_notifications

class Command(BaseCommand):
    help = 'Vérifie les assurances, visites, autorisations et réservations - Crée des notifications'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('🔔 Démarrage de la vérification des alertes...'))
        
        try:
            generer_toutes_notifications()
            self.stdout.write(self.style.SUCCESS('✅ Vérification des alertes terminée'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Erreur: {str(e)}'))

