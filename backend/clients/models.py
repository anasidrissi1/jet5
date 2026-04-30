from django.db import models


class ClientRequest(models.Model):
    """Demande d'inscription client via QR Code - en attente de validation"""
    
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Refusé'),
    ]
    
    # Mêmes champs que Client
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    adresse = models.TextField(blank=True, null=True)
    
    # Documents d'identité - Numéros
    cin_numero = models.CharField(max_length=20, blank=True, null=True)
    cin_date_expiration = models.DateField(blank=True, null=True)
    
    permis_numero = models.CharField(max_length=20, blank=True, null=True)
    permis_date_delivrance = models.DateField(blank=True, null=True)
    
    passeport_numero = models.CharField(max_length=20, blank=True, null=True)
    passeport_date_entree = models.DateField(blank=True, null=True)
    passeport_date_sortie = models.DateField(blank=True, null=True)
    
    # Documents d'identité - Fichiers
    cin_document = models.FileField(upload_to='client_requests/cin/', blank=True, null=True)
    permis_document = models.FileField(upload_to='client_requests/permis/', blank=True, null=True)
    passeport_document = models.FileField(upload_to='client_requests/passeport/', blank=True, null=True)
    
    # Statut de la demande
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    date_creation = models.DateTimeField(auto_now_add=True)
    date_traitement = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-date_creation']
        verbose_name = "Demande d'inscription"
        verbose_name_plural = "Demandes d'inscription"
    
    def __str__(self):
        return f"Demande: {self.nom} {self.prenom} ({self.get_status_display()})"


class Client(models.Model):

    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    email = models.EmailField(unique=True, blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    date_naissance = models.DateField(blank=True, null=True)
    ville = models.CharField(max_length=120, blank=True, null=True)
    adresse = models.TextField(blank=True, null=True)

    # Documents d'identité - Numéros
    cin_numero = models.CharField(max_length=20, blank=True, null=True)
    cin_date_expiration = models.DateField(blank=True, null=True)

    permis_numero = models.CharField(max_length=20, blank=True, null=True)
    permis_date_delivrance = models.DateField(blank=True, null=True)

    passeport_numero = models.CharField(max_length=20, blank=True, null=True)
    passeport_date_entree = models.DateField(blank=True, null=True)
    passeport_date_sortie = models.DateField(blank=True, null=True)

    # Documents d'identité - Fichiers (PDF, JPG, JPEG, PNG)
    cin_document = models.FileField(upload_to='clients/cin/', blank=True, null=True)
    permis_document = models.FileField(upload_to='clients/permis/', blank=True, null=True)
    passeport_document = models.FileField(upload_to='clients/passeport/', blank=True, null=True)

    # Historique et archivage
    est_archive = models.BooleanField(default=False)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nom} {self.prenom}"


class ClientDocument(models.Model):
    DOCUMENT_TYPE_CHOICES = [
        ('cin', 'CIN'),
        ('permis', 'Permis'),
        ('passeport', 'Passeport'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    file = models.FileField(upload_to='clients/documents/')
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['document_type', 'date_ajout']

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.client}"


