from django.core.management.base import BaseCommand
from reservations.models import ContratLocation


class Command(BaseCommand):
    help = "Recalcule montant_total pour tous les contrats existants"

    def handle(self, *args, **options):
        contrats = ContratLocation.objects.all()
        updated = 0
        for c in contrats:
            old = c.montant_total
            c.save()
            if c.montant_total != old:
                self.stdout.write(f"  #{c.id} {old} -> {c.montant_total}")
                updated += 1
        self.stdout.write(self.style.SUCCESS(f"Termine : {updated}/{contrats.count()} contrats mis a jour."))
