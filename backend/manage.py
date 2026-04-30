#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    try:
        # Apply project monkey patches first (must run before importing Django)
        try:
            import monkey_patch
            monkey_patch.patch_re()
        except Exception:
            # If monkey patch isn't present or fails, continue; we already
            # patched Django internals where needed.
            pass
        import django_patch  # Ensure Django utilities are patched before Django loads
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
