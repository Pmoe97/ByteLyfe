#!/usr/bin/env python3
"""Bump the ?v=N cache-buster in index.html for every shipped file changed since a git ref (default: HEAD).
   python3 dev/bump-versions.py [ref]   -- run before committing, as the README says."""
import re, subprocess, sys
ref = sys.argv[1] if len(sys.argv) > 1 else 'HEAD'
changed = set(subprocess.run(['git', 'diff', '--name-only', ref], capture_output=True, text=True).stdout.split())
changed |= set(subprocess.run(['git', 'ls-files', '--others', '--exclude-standard'], capture_output=True, text=True).stdout.split())
html = open('index.html').read()
done = []
def bump(m):
    path, v = m.group(1), int(m.group(2))
    if path in changed:
        done.append(path.rsplit('/', 1)[-1])
        return f'{path}?v={v + 1}'
    return m.group(0)
# a file that is new (not in the previous index.html) keeps its v=1
old = subprocess.run(['git', 'show', f'{ref}:index.html'], capture_output=True, text=True).stdout
html2 = re.sub(r'(src/src/srcfiles/(?:js|css)/[^"?]+)\?v=(\d+)', lambda m: bump(m) if m.group(1) in old else m.group(0), html)
open('index.html', 'w').write(html2)
print('bumped:', ', '.join(done) or 'nothing')
