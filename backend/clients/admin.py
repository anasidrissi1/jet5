from django.contrib import admin
from .models import Client, ClientDocument


class ClientDocumentInline(admin.TabularInline):
    model = ClientDocument
    extra = 0

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('nom', 'prenom', 'email', 'cin_numero', 'est_archive', 'date_creation')
    search_fields = ('nom', 'prenom', 'email', 'cin_numero')
    inlines = [ClientDocumentInline]

