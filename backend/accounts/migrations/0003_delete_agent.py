# Generated manually — remove unused Agent model (single-user setup)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_alter_agent_telephone_whatsapp'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Agent',
        ),
    ]
