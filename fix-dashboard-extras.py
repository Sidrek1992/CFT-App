import os
import re

content = open('/Users/maximilianoguzman/CFT-CORREO/components/Dashboard.tsx', 'r').read()

replacements = {
    r'fill-slate-700': 'fill-slate-300 dark:fill-slate-700',
    r'fill-slate-800': 'fill-slate-300 dark:fill-slate-800',
    r'bg-dark-900/50': 'bg-white/50 dark:bg-dark-900/50',
    r'bg-dark-800/50': 'bg-slate-50/50 dark:bg-dark-800/50',
    r'bg-dark-800': 'bg-white dark:bg-dark-800'
}

for old, new in replacements.items():
    content = re.sub(r'(?<!dark:)\b' + re.escape(old) + r'\b', new, content)

with open('/Users/maximilianoguzman/CFT-CORREO/components/Dashboard.tsx', 'w') as f:
    f.write(content)

print("Dashboard extras complete.")
