import os
import re

directories = ['components', '...', '/Users/maximilianoguzman/CFT-CORREO']
files = [
    'App.tsx',
    'components/Dashboard.tsx',
    'components/Generator.tsx',
    'components/Login.tsx',
    'components/OfficialForm.tsx',
    'components/OfficialList.tsx',
    'components/TemplateEditor.tsx',
    'components/EmailEditor.tsx',
    'components/OrgChart.tsx',
    'components/ToastContainer.tsx'
]

replacements = {
    r'bg-dark-950': 'bg-slate-50 dark:bg-dark-950',
    r'bg-dark-900': 'bg-white dark:bg-dark-900',
    r'bg-dark-800': 'bg-slate-100 dark:bg-dark-800',
    r'bg-dark-700': 'bg-slate-200 dark:bg-dark-700',
    r'text-slate-200': 'text-slate-800 dark:text-slate-200',
    r'text-slate-300': 'text-slate-700 dark:text-slate-300',
    r'text-slate-400': 'text-slate-600 dark:text-slate-400',
    r'text-slate-500': 'text-slate-500 dark:text-slate-500',
    r'text-white': 'text-slate-900 dark:text-white',
    r'border-white/10': 'border-slate-200 dark:border-white/10',
    r'border-white/5': 'border-slate-100 dark:border-white/5',
    r'bg-white/5': 'bg-slate-900/5 dark:bg-white/5',
    r'bg-white/10': 'bg-slate-900/10 dark:bg-white/10',
    r'bg-black/10': 'bg-slate-900/5 dark:bg-black/10',
    r'border-slate-800': 'border-slate-200 dark:border-slate-800',
    r'border-slate-700': 'border-slate-300 dark:border-slate-700',
}

for filepath in files:
    full_path = os.path.join('/Users/maximilianoguzman/CFT-CORREO', filepath)
    if not os.path.exists(full_path): continue
    
    with open(full_path, 'r') as f:
        content = f.read()

    # Apply substitutions, taking care not to duplicate if we run twice
    for old, new in replacements.items():
        # Only replace if it doesn't already have dark: prefix in front of it and isn't part of another class
        content = re.sub(r'(?<!dark:)\b' + re.escape(old) + r'\b', new, content)

    with open(full_path, 'w') as f:
        f.write(content)

print("Replacement complete.")
