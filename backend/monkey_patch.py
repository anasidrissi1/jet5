import re
from datetime import date

def patch_re():
    def new_sub(pattern, repl, string, count=0, flags=0):
        """Wrapper for re.sub that handles the Python 3.13 list return issue
        by using a callable replacement function instead of a string template.
        """
        if isinstance(repl, str):
            # Convert string replacement to callable to avoid Python 3.13's
            # template compilation that can return a list
            def replacement(match, template=repl):
                try:
                    # First try match.expand() which handles \1, \g<1> etc.
                    return match.expand(template)
                except (re.error, IndexError, AttributeError):
                    # If expand fails (e.g., no groups), do simple replacement
                    return template

            return re._old_sub(pattern, replacement, string, count, flags)
        return re._old_sub(pattern, repl, string, count, flags)

    def new_split(pattern, string, maxsplit=0, flags=0):
        # Ensure we use our patched sub() for internal operations
        return re._old_split(pattern, string, maxsplit, flags)

    if not hasattr(re, '_old_sub'):
        re._old_sub = re.sub
        re.sub = new_sub
        re._old_split = re.split
        re.split = new_split

        # Also patch modules that captured re.sub at import time
        try:
            import _strptime
            _strptime.re_sub = lambda p, r, s, c=0, f=0: new_sub(p, r, s, c, f)
        except Exception:
            pass

def patch_django():
    from django.utils import dateformat

    # Patch the regex functions in dateformat
    original_format = dateformat.Formatter.format
    def new_format(self, formatstr):
        try:
            # First try the normal path with our patched re.sub
            pieces = []
            for i, piece in enumerate(dateformat.re_formatchars.split(str(formatstr))):
                if i % 2:
                    if type(self.data) is date and hasattr(dateformat.TimeFormat, piece):
                        raise TypeError(
                            "The format for date objects may not contain "
                            "time-related format specifiers (found '%s')." % piece
                        )
                    pieces.append(str(getattr(self, piece)()))
                elif piece:
                    # Handle escaped characters with our safe sub
                    pieces.append(re.sub(dateformat.re_escaped.pattern,
                                       lambda m: m.group(1),
                                       piece))
            return "".join(pieces)
        except Exception as e:
            # Fallback to character-by-character processing if regex fails
            result = []
            escape = False
            for char in str(formatstr):
                if escape:
                    result.append(char)
                    escape = False
                elif char == '\\':
                    escape = True
                elif hasattr(self, char):
                    result.append(str(getattr(self, char)()))
                else:
                    result.append(char)
            return ''.join(result)

    # Apply the patch
    dateformat.Formatter.format = new_format

def unpatch_re():
    if hasattr(re, '_old_sub'):
        re.sub = re._old_sub
        del re._old_sub
    if hasattr(re, '_old_split'):
        re.split = re._old_split
        del re._old_split

# Apply patches
patch_re()
patch_django()
