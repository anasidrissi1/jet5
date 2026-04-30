from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Vérifie l\'état des migrations et de la base de données'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n🔍 Vérification de la base de données...\n"))
        
        # Vérifier les tables existantes
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' 
                ORDER BY name;
            """)
            tables = cursor.fetchall()
            
            self.stdout.write("📊 Tables existantes :")
            for table in tables:
                self.stdout.write(f"  - {table[0]}")
            
            # Vérifier la structure de la table notifications
            if any('notification' in str(t).lower() for t in tables):
                self.stdout.write("\n📋 Structure de la table notifications_notification :")
                cursor.execute("PRAGMA table_info(notifications_notification);")
                columns = cursor.fetchall()
                for col in columns:
                    self.stdout.write(f"  - {col[1]} ({col[2]})")
            
            # Vérifier la table accounts_agent
            if any('accounts_agent' in str(t).lower() for t in tables):
                self.stdout.write("\n👥 Structure de la table accounts_agent :")
                cursor.execute("PRAGMA table_info(accounts_agent);")
                columns = cursor.fetchall()
                for col in columns:
                    self.stdout.write(f"  - {col[1]} ({col[2]})")
                    
                # Compter les agents
                cursor.execute("SELECT COUNT(*) FROM accounts_agent;")
                count = cursor.fetchone()[0]
                self.stdout.write(f"\n✅ Nombre d'agents : {count}")
            else:
                self.stdout.write(self.style.ERROR("\n❌ Table accounts_agent non trouvée!"))
        
        self.stdout.write(self.style.SUCCESS("\n✅ Vérification terminée!\n"))
