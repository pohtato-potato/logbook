"""Stage 2a: ports the approved phone styles that Stage 1 left out (shelves, forms, the + sheet, person and tag pages, search)
into src/styles/app-2a.css, with the same conversions as port-css.py. Later-stage styles stay out."""
import re, pathlib
src = pathlib.Path('design/pinboard8-source/p7-phone.css').read_text(encoding='utf-8')
src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
SIZE = {'--f14': '--f13', '--f15': '--f14', '--f17': '--f16', '--f20': '--f18', '--f24': '--f22', '--f30': '--f26'}
STAGE2A = re.compile(r'(\.shelf|\.keepgrid|\.keeptile|\.bday|\.gift|\.addgrid|\.addtile|\.addico|\.sewrow|\.sewbtn|\.sewlab|\.keepslot|\.daterow|\.swatch|\.micbtn|mapmini|mapbig|\.curcard|\.tbars|\.tbar|\.tstrip|\.pgrid|\.pfilter|\.phead|\.pitem|\.phrow|\.ph\b|\.ph\.|\.spanbar|\.wave|\.qcard|\.keeprow|\.sres|\.sgroup|\.sitem|\.st-photos)')
LATER = re.compile(r'(\.sbar|\.wall|\.fake|\.hpost|\.hp-|\.gal\b|\.ycanvas|\.life|\.wrapped|\.song|\.art\b|\.stamps|\.stamp\b|\.poster|\.laptop|\.often|\.emo|\.minical|\.echo|\.pday|body\.still)')
out = []
for m in re.finditer(r'([^{}@]+)\{([^{}]*)\}', src):
    sel, body = m.group(1).strip(), m.group(2).strip()
    parts = [x.strip() for x in sel.split(',') if x.strip() and STAGE2A.search(x) and not LATER.search(x)]
    if not parts: continue
    parts = [re.sub(r'^\.phone\s+', '', p).replace('body.ts-big .phone', 'html[data-big-text]').replace('body.ts-big', 'html[data-big-text]') for p in parts]
    body = body.replace('--scr-', '--').replace('var(--u)', '1rem')
    body = re.sub(r'--f(14|15|17|20|24|30)\b', lambda k: SIZE['--f' + k.group(1)], body)
    out.append(f"{','.join(parts)}{{{body}}}")
pathlib.Path('src/styles/app-2a.css').write_text('/* Stage 2a styles, ported from the approved phone styles by scripts/port-css-2a.py. */\n' + '\n'.join(out) + '\n', encoding='utf-8')
print(len(out), 'rules')
