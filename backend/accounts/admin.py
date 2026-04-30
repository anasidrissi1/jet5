from django.contrib import admin
from .models import Agent


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ['nom', 'telephone_whatsapp', 'actif', 'date_creation']
    list_filter = ['actif', 'date_creation']
    search_fields = ['nom', 'telephone_whatsapp']
    list_editable = ['actif']
    ordering = ['nom']

