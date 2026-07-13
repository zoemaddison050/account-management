import re

files_to_fix = [
    ("src/pages/client/Dashboard.tsx", re.compile(r"const latestPortfolio ="), "const _latestPortfolio ="),
    ("src/pages/client/Portfolio.tsx", re.compile(r"item\.quantity \* item\.price"), "item.value"),
]

for file_path, pattern, replacement in files_to_fix:
    with open(file_path, 'r') as f:
        content = f.read()
    content = pattern.sub(replacement, content)
    with open(file_path, 'w') as f:
        f.write(content)
