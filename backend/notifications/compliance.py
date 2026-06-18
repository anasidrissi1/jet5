"""Helpers to create compliance notifications without duplicates."""

from datetime import timedelta

from django.utils import timezone

from .models import Notification


def create_compliance_notification(
    *,
    notif_type,
    message,
    voiture_label,
    document_id=None,
    dedupe_days=30,
):
    """Create a notification only if a similar unread one does not already exist."""
    filters = {
        'type': notif_type,
        'voiture': voiture_label,
        'message': message,
        'est_lue': False,
    }
    if document_id is not None:
        filters['document_id'] = document_id

    cutoff = timezone.now() - timedelta(days=dedupe_days)
    if Notification.objects.filter(**filters, date_creation__gte=cutoff).exists():
        return None

    payload = {
        'type': notif_type,
        'message': message,
        'voiture': voiture_label,
    }
    if document_id is not None:
        payload['document_id'] = document_id

    return Notification.objects.create(**payload)
