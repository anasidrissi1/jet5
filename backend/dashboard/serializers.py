from rest_framework import serializers
from .models import ContactMessage


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = [
            'id',
            'name',
            'email',
            'phone',
            'message',
            'created_at',
            'is_read',
            'notes',
        ]
        read_only_fields = ['id', 'created_at', 'is_read', 'notes']
