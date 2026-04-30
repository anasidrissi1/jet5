"""Gestionnaire du scheduler de notifications."""
import logging

from .utils import generer_toutes_notifications

logger = logging.getLogger(__name__)


def _import_scheduler_components():
    try:
        from apscheduler.schedulers.background import BackgroundScheduler  # type: ignore
        from apscheduler.triggers.interval import IntervalTrigger  # type: ignore
        return BackgroundScheduler, IntervalTrigger
    except ImportError:  # pragma: no cover - dépendance optionnelle manquante
        logger.warning(
            "APScheduler introuvable. Installez-le avec 'pip install APScheduler' "
            "pour activer les notifications planifiées."
        )
        return None, None


def start_notification_scheduler():
    """Démarre le scheduler de notifications si APScheduler est disponible."""
    BackgroundScheduler, IntervalTrigger = _import_scheduler_components()
    if not BackgroundScheduler:
        logger.warning("Scheduler de notifications désactivé : APScheduler non disponible.")
        return None

    scheduler = BackgroundScheduler()

    scheduler.add_job(
        generer_toutes_notifications,
        trigger=IntervalTrigger(hours=1),
        id='generer_notifications',
        name='Générer les notifications automatiques',
        replace_existing=True,
        max_instances=1,
    )

    try:
        logger.info("🔔 Génération initiale des notifications au démarrage...")
        generer_toutes_notifications()
        logger.info("✅ Notifications initiales générées")
    except Exception as exc:
        logger.error("❌ Erreur lors de la génération initiale: %s", exc)

    scheduler.start()
    logger.info("✅ Scheduler de notifications démarré - Génération toutes les heures")
    return scheduler
