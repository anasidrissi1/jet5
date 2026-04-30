from django.db import models


class Agent(models.Model):
    """
    Modèle pour gérer les agents qui reçoivent des notifications (anciennement WhatsApp).
    """
    nom = models.CharField(max_length=100, verbose_name="Nom complet")
    telephone_whatsapp = models.CharField(
        max_length=20,
        verbose_name="Numéro de téléphone",
        help_text="Format international (ex: +2126XXXXXXXX ou 06XXXXXXXX)"
    )
    actif = models.BooleanField(
        default=True, 
        verbose_name="Actif",
        help_text="Si désactivé, l'agent ne recevra plus de notifications"
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Agent"
        verbose_name_plural = "Agents"
        ordering = ['nom']

    def __str__(self):
        # Le champ conserve le nom 'telephone_whatsapp' pour compatibilité,
        # mais il est utilisé pour n'importe quel contact téléphonique.
        return f"{self.nom} ({self.telephone_whatsapp})"

    def get_formatted_phone(self):
        """
        Formate le numéro de téléphone pour WhatsApp
        """
        phone = self.telephone_whatsapp.strip()
        
        # Supprimer les espaces et caractères spéciaux
        phone = ''.join(filter(str.isdigit, phone))
        
        # Si commence par 0, remplacer par +212
        if phone.startswith('0'):
            phone = '+212' + phone[1:]
        elif not phone.startswith('+'):
            phone = '+212' + phone
            
        return phone
