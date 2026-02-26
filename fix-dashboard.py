import os
import re

files = [
    'components/Dashboard.tsx'
]

replacements = {
    r'from-dark-900': 'from-slate-100 dark:from-dark-900',
    r'from-dark-800': 'from-slate-100 dark:from-dark-800',
    r'to-dark-900': 'to-slate-100 dark:to-dark-900',
    r'bg-gradient-to-br from-dark-800 to-dark-900': 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-dark-800 dark:to-dark-900',
    r'fill-slate-700': 'fill-slate-300 dark:fill-slate-700',
    r'fill-slate-800': 'fill-slate-300 dark:fill-slate-800',
    r'text-white': 'text-slate-900 dark:text-white',
    r'text-slate-200': 'text-slate-800 dark:text-slate-200',
    r'text-slate-300': 'text-slate-700 dark:text-slate-300',
    r'text-slate-400': 'text-slate-600 dark:text-slate-400',
}

for filepath in files:
    full_path = os.path.join('/Users/maximilianoguzman/CFT-CORREO', filepath)
    if not os.path.exists(full_path): continue
    
    with open(full_path, 'r') as f:
        content = f.read()

    for old, new in replacements.items():
        content = re.sub(r'(?<!dark:)\b' + re.escape(old) + r'\b', new, content)

    with open(full_path, 'w') as f:
        f.write(content)

print("Dashboard replacement complete.")
