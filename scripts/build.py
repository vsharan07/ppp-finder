"""Build the three pages from their templates and the JSON files in data/.

    index.html   the finder families use              (from template.html)
    update.html  the form sites use to send updates   (from src/update.html)
    admin.html   the Parent Possible staff screen     (from src/admin.html)

Usage (from the repo root):
    python3 scripts/clean.py "Site Update 2025-26.xlsx" > data/sites.json
    python3 scripts/build.py
"""
import hashlib
import json
import os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
read = lambda p: open(os.path.join(root, p), encoding='utf-8').read()

sites = read('data/sites.json')
counties = read('data/co_counties.json')
fill = {
    '__SITES__': sites,
    '__MAP__': counties,
    '__ZIPS__': read('data/co_zips.json'),
    '__COUNTY_NAMES__': json.dumps(sorted(c['n'] for c in json.loads(counties))),
    # Changes whenever the site list changes, so the staff screen can tell when its saved edits are based on an older list.
    '__DATA_VERSION__': hashlib.sha1(sites.encode('utf-8')).hexdigest()[:10],
    '__SHARED__': read('src/shared.js'),
    '__BASE_CSS__': read('src/base.css'),
}

for source, target in (('template.html', 'index.html'), ('src/update.html', 'update.html'), ('src/admin.html', 'admin.html')):
    body = read(source)
    for key, value in fill.items():
        body = body.replace(key, value)
    page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '</head>\n<body>\n' + body + '\n</body>\n</html>\n')
    with open(os.path.join(root, target), 'w', encoding='utf-8') as f:
        f.write(page)
    print('Wrote ' + target)
