from django.apps import AppConfig
from django.conf import settings
import logging
import os

logger = logging.getLogger(__name__)
_scheduler_started = False


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'

    def ready(self):
        """Démarre le scheduler de notifications si autorisé par la configuration."""
        global _scheduler_started
        if _scheduler_started:
            return

        if not getattr(settings, 'START_NOTIFICATION_SCHEDULER', False):
            logger.info('Scheduler de notifications désactivé (START_NOTIFICATION_SCHEDULER=false).')
            return

        if settings.DEBUG and os.environ.get('RUN_MAIN') != 'true':
            # Empêche un double démarrage avec le reloader Django
            return

        try:
            from .scheduler import start_notification_scheduler

            start_notification_scheduler()
            _scheduler_started = True
            logger.info('✅ Scheduler de notifications démarré automatiquement')
        except Exception as exc:  # pragma: no cover - démarrage dépend du déploiement
            logger.error('❌ Erreur démarrage scheduler: %s', exc)
