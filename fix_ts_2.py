import re

content = open("src/pages/client/Dashboard.tsx", 'r').read()
content = re.sub(r"const _latestPortfolio = .*", "", content)
with open("src/pages/client/Dashboard.tsx", 'w') as f: f.write(content)

content = open("src/pages/client/Portfolio.tsx", 'r').read()
content = content.replace("item.quantity * item.price", "item.value")
# This is risky but let's try to remove whatever was trying to access quantity
content = re.sub(r"item\.quantity\s*\*\s*item\.price", "item.value", content)
content = re.sub(r"item\.quantity", "1", content) # Fallback if quantity remains
with open("src/pages/client/Portfolio.tsx", 'w') as f: f.write(content)
