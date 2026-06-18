"""
WSGI config for backend project.
"""

import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

try:
    import monkey_patch
    monkey_patch.patch_re()
except Exception:
    pass

try:
    import django_patch  # noqa: F401
except Exception:
    pass

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
