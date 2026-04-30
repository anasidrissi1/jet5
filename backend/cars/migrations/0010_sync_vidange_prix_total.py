from django.db import migrations


def _rename_prix_column(apps, schema_editor):
    cursor = schema_editor.connection.cursor()
    
    # Check if table exists and get columns (MySQL compatible)
    try:
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'cars_entretienvidange'
        """)
        columns = {row[0] for row in cursor.fetchall()}

        if "prix_par_litre" in columns:
            # Rename legacy column to match the current model definition (MySQL syntax)
            cursor.execute(
                "ALTER TABLE cars_entretienvidange CHANGE prix_par_litre prix_total DECIMAL(10,2)"
            )
            # Convert legacy values (stored per litre) to the expected total price
            cursor.execute(
                "UPDATE cars_entretienvidange SET prix_total = quantite_litres * prix_total"
            )
    except Exception:
        # Table doesn't exist yet or column already renamed, skip
        pass


def _noop_backward(apps, schema_editor):
    """Reverse operation is intentionally a no-op."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("cars", "0009_visitetechnique_montant"),
    ]

    operations = [
        migrations.RunPython(_rename_prix_column, _noop_backward),
    ]
