"""Stage 2c: ports the approved calendar-tab styles (Gallery, Year, Life, Feelings) into src/styles/app-3b.css,
with the same conversions as port-css.py. Rules already in app.css are left out."""
import re, pathlib
src = pathlib.Path('design/pinboard8-source/p7-phone.css').read_text(encoding='utf-8')
src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
have = pathlib.Path('src/styles/app.css').read_text(encoding='utf-8')
SIZE = {'--f14': '--f13', '--f15': '--f14', '--f17': '--f16', '--f20': '--f18', '--f24': '--f22', '--f30': '--f26'}
WANT = re.compile(r'(\.hpost|\.hp-)')
out = []
for m in re.finditer(r'([^{}@]+)\{([^{}]*)\}', src):
    sel, body = m.group(1).strip(), m.group(2).strip()
    parts = [re.sub(r'^\.phone\s+', '', p.strip()).replace('body.ts-big .phone', 'html[data-big-text]').replace('body.ts-big', 'html[data-big-text]') for p in sel.split(',') if p.strip() and WANT.search(p) and 'laptop' not in p]
    if not parts: continue
    body = body.replace('--scr-', '--').replace('var(--u)', '1rem')
    body = re.sub(r'--f(14|15|17|20|24|30)\b', lambda k: SIZE['--f' + k.group(1)], body)
    rule = f"{','.join(parts)}{{{body}}}"
    if rule not in have: out.append(rule)
pathlib.Path('src/styles/app-3b.css').write_text('/* Stage 3b styles (Health postcard), ported from the approved phone styles by scripts/port-css-3b.py. */\n' + '\n'.join(out) + '\n', encoding='utf-8')
print(len(out), 'rules')
