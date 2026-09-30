"""One-time port of the approved phone styles (design/pinboard8-source/p7-phone.css) into src/styles/app.css.
Conversions: .phone -> page level, --scr-X -> --X, --u -> 1rem, round-8 type sizes, pinboard-only rules dropped."""
import re, pathlib

src = pathlib.Path('design/pinboard8-source/p7-phone.css').read_text(encoding='utf-8')
src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
SIZE = {'--f14': '--f13', '--f15': '--f14', '--f17': '--f16', '--f20': '--f18', '--f24': '--f22', '--f30': '--f26'}
DROP = re.compile(r'(\.sbar|\.sb-ic|\.wall|\.fakebg|\.fr1|\.fr-|\.hpost|\.hp-|\.trouble|\.dstyles|\.gal\b|\.gc2|\.gd\b|\.ycanvas|\.life|\.wrapped|\.wcard|\.wk\b|\.wbig2|\.mast|\.rep-|\.notes|\.records|\.rec\b|\.headline|\.prompt|\.hline|\.rrow|\.thennow|\.fakeapp|\.fakevid|\.sharesheet|\.linkcard|\.sharenote|\.composer\.demo|\.fakeline|\.phone\.big|canvas\.wall|\.shelf|\.keepgrid|\.keeptile|\.bday|\.gift|\.addgrid|\.addtile|\.addico|\.posterrow|\.poster|\.sewrow|\.sewbtn|\.sewlab|\.keepslot|\.daterow|\.swatch|\.micbtn|mapmini|mapbig|\.curcard|\.tbars|\.tbar|\.tstrip|\.bl-scale2|\.pgrid|\.pfilter|\.phead|\.pitem|\.song|\.art\b|\.stamps|\.stamp\b|\.phrow|\.ph\b|\.ph\.|\.often|\.of-|\.emo|\.minical|\.sel-box|canvas\.clock|\.spanbar|\.wave|\.qcard|\.keeprow|\.sres|\.sgroup|\.sitem|\.echo|\.st-photos|\.pday|\.ds-score::before)')

def conv(block_sel, body):
    body = body.replace('--scr-', '--')
    body = body.replace('var(--u)', '1rem')
    body = re.sub(r'--f(14|15|17|20|24|30)\b', lambda m: SIZE['--f' + m.group(1)], body)
    return block_sel, body

out = []
for m in re.finditer(r'([^{}@]+)\{([^{}]*)\}', src):
    sel, body = m.group(1).strip(), m.group(2).strip()
    parts = [x.strip() for x in sel.split(',') if x.strip() and not DROP.search(x)]
    if not parts:
        continue
    sel = ','.join(parts)
    if sel.startswith('.phone{'):
        continue
    if sel == '.phone':
        continue
    if sel.startswith('.phone ') or sel.startswith('.phone,'):
        sel = re.sub(r'\.phone\s+', '', sel)
    if sel.startswith('body.ts-big'):
        sel = sel.replace('body.ts-big .phone', 'html[data-big-text]').replace('body.ts-big', 'html[data-big-text]')
    if sel.startswith('body.still'):
        continue
    sel, body = conv(sel, body)
    out.append(f'{sel}{{{body}}}')

head = '''/* The app stylesheet, ported from the approved phone styles (design/pinboard8-source/p7-phone.css) by scripts/port-css.py, then kept by hand. */
body{margin:0; background:var(--base); color:var(--ink); font-family:var(--body); font-size:var(--f16); line-height:1.45; -webkit-font-smoothing:antialiased; -webkit-tap-highlight-color:transparent}
button,input,textarea{font:inherit; color:inherit}
::selection{background:var(--ink); color:var(--base)}
:focus-visible{outline:3px solid var(--focus); outline-offset:2px}
'''
app_edges = '''
/* the app's screen frame (the pinboard drew these inside a phone mock) */
.scr{position:relative; height:100dvh; overflow:hidden}
.content{padding-top:max(8px, env(safe-area-inset-top))}
.sheet{position:fixed; max-width:720px; margin-inline:auto}
.toast{position:fixed; max-width:720px; margin-inline:auto}
.tabs{position:fixed; max-width:720px; margin-inline:auto}
.pinbar{position:fixed; max-width:720px; margin-inline:auto}
.tabs{grid-template-columns:1fr 1fr auto 1fr}
@media (min-width:1024px){ .content{max-width:720px; margin-inline:auto; width:100%} }
@media (prefers-reduced-motion: reduce){ *{animation:none !important; transition:none !important} }
'''
pathlib.Path('src/styles/app.css').write_text(head + '\n'.join(out) + app_edges, encoding='utf-8')
print(len(out), 'rules')
