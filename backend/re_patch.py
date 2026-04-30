import re

def expand_backreferences(repl, match):
    result = []
    i = 0
    while i < len(repl):
        if i < len(repl) - 1 and repl[i] == '\\' and repl[i+1].isdigit():
            num = int(repl[i+1])
            result.append(match.group(num) or '')
            i += 2
        else:
            result.append(repl[i])
            i += 1
    return ''.join(result)

def patched_sub(pattern, repl, string, count=0, flags=0):
    if callable(repl):
        return re.compile(pattern, flags).sub(repl, string, count)
    
    # For string repl, try Match.expand, and if it fails with the list error, fall back to manual expansion
    try:
        return re.compile(pattern, flags).sub(lambda m: m.expand(repl), string, count)
    except RuntimeError as e:
        if "result of compiling a replacement string is list" in str(e):
            return re.compile(pattern, flags).sub(lambda m: expand_backreferences(repl, m), string, count)
        else:
            raise

# Patch the re.sub function
if not hasattr(re, '_original_sub'):
    re._original_sub = re.sub
    re.sub = patched_sub
