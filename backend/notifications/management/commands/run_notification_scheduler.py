"""Management command to run the notification scheduler as a standalone worker."""
from __future__ import annotations

import signal
import sys
import time

from django.core.management.base import BaseCommand

from notifications.scheduler import start_notification_scheduler


class Command(BaseCommand):
    help = 'Launches APScheduler to generate notifications outside the web process.'

    def handle(self, *args, **options):
        scheduler = start_notification_scheduler()
        if scheduler is None:
            self.stderr.write(self.style.ERROR('Scheduler could not be started (APScheduler missing?).'))
            sys.exit(1)

        self.stdout.write(self.style.SUCCESS('Notification scheduler started. Press Ctrl+C to stop.'))

        def _graceful_shutdown(signum, frame):  # noqa: ARG001
            self.stdout.write('Stopping scheduler...')
            scheduler.shutdown(wait=False)
            sys.exit(0)

        for sig in (signal.SIGINT, signal.SIGTERM):
            signal.signal(sig, _graceful_shutdown)

        while True:
            time.sleep(60)
