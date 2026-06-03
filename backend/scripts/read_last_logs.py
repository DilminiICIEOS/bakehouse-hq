from pathlib import Path
path = Path('backend/logs/bakery_hq.log')
print('path', path.resolve())
print('exists', path.exists())
if path.exists():
    lines = path.read_text(errors='ignore').splitlines()
    for line in lines[-40:]:
        print(line)
