import os
import re

directory = "src"

replacements = {
    r'\bml-': 'ms-',
    r'\bmr-': 'me-',
    r'\bpl-': 'ps-',
    r'\bpr-': 'pe-',
    r'\btext-left\b': 'text-start',
    r'\btext-right\b': 'text-end',
    r'\bborder-l\b': 'border-s',
    r'\bborder-r\b': 'border-e',
    r'\bborder-l-': 'border-s-',
    r'\bborder-r-': 'border-e-',
    r'\brounded-l-': 'rounded-s-',
    r'\brounded-r-': 'rounded-e-',
    r'\brounded-tl-': 'rounded-ss-',
    r'\brounded-tr-': 'rounded-se-',
    r'\brounded-bl-': 'rounded-es-',
    r'\brounded-br-': 'rounded-ee-',
    r'\bleft-': 'start-',
    r'\bright-': 'end-',
}

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    new_content = content
    for pattern, replacement in replacements.items():
        # Careful with 'left-' and 'right-' to avoid modifying non-Tailwind keys inside JSON if any, 
        # but we are only processing .tsx files.
        new_content = re.sub(pattern, replacement, new_content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))

print("RTL conversion complete!")
