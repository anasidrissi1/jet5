import re


def patch_django_text():
    from django.utils import text

    def fixed_camel_case_to_spaces(value):
        def repl_func(match):
            group = match.group(1)
            if group:
                return f" {group}"
            return ""

        return re.sub(r"(((?<=[a-z])[A-Z])|([A-Z](?![A-Z]|$)))", repl_func, value).strip().lower()

    text.camel_case_to_spaces = fixed_camel_case_to_spaces


def patch_url_converters():
    from django.urls import converters

    if getattr(converters.register_converter, "_patched", False):
        return

    original_register = converters.register_converter

    def safe_register(converter, type_name):
        # Replace the converter if it's already registered to avoid Django 5.x duplicate errors
        existing = converters.get_converters()
        if type_name in existing:
            # Remplacer la définition existante par le nouveau converter
            converters.REGISTERED_CONVERTERS[type_name] = converter()
            converters.get_converters.cache_clear()
            try:
                from django.urls.resolvers import _route_to_regex
                _route_to_regex.cache_clear()
            except Exception:
                pass
            return
        original_register(converter, type_name)

    safe_register._patched = True
    converters.register_converter = safe_register

    try:
        import django.urls as urls_module
        urls_module.register_converter = safe_register
    except Exception:
        pass


patch_django_text()
patch_url_converters()
