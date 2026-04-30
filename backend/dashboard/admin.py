from django.contrib import admin
from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
	list_display = ('name', 'phone', 'email', 'created_at', 'is_read')
	list_filter = ('is_read', 'created_at')
	search_fields = ('name', 'phone', 'email', 'message')
