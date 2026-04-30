from django.core.management.base import BaseCommand
from accounts.models import Agent


class Command(BaseCommand):
    help = 'Crée les agents initiaux dans la base de données'

    def handle(self, *args, **options):
        agents_data = [
            {
                'nom': 'Ali Fallaoui',
                'telephone_whatsapp': '0661472406',  # numéro de contact
                'actif': True
            },
            {
                'nom': 'Anas',
                'telephone_whatsapp': '0666209753',
                'actif': True
            }
        ]  # ces numéros peuvent être modifiés après création

        created_count = 0
        updated_count = 0

        for agent_data in agents_data:
            agent, created = Agent.objects.get_or_create(
                telephone_whatsapp=agent_data['telephone_whatsapp'],
                defaults={
                    'nom': agent_data['nom'],
                    'actif': agent_data['actif']
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Agent créé: {agent.nom} ({agent.telephone_whatsapp})")
                )
            else:
                # Mettre à jour si existe déjà
                agent.nom = agent_data['nom']
                agent.actif = agent_data['actif']
                agent.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f"ℹ️  Agent mis à jour: {agent.nom} ({agent.telephone_whatsapp})")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✅ Terminé! {created_count} agent(s) créé(s), {updated_count} agent(s) mis à jour."
            )
        )
