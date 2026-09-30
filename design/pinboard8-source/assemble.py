import os
D = os.path.dirname(os.path.abspath(__file__))
def rd(n): return open(os.path.join(D, n), encoding='utf-8').read()
head = '''<title>Logbook Pinboard 8</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,800&display=swap">
<style>'''
css = ['p4-base.css', 'p7-phone.css', 'p7-board.css']
js = ['p4-colour.js', 'atlas-data.js', 'p7-data.js', 'p7-data2.js', 'p4-exdata.js', 'p4-scenehead.js', 'p7-forms.js', 'p4-scenes.js', 'p4-year.js', 'p4-pixels.js',
      'p7-scenes.js', 'p7-scenes2.js', 'p4-engine.js', 'p7-kit.js', 'p7-screens.js', 'p7-screens2.js', 'p7-nav.js', 'p4-applysugg.js', 'p7-demos.js', 'p4-cards.js', 'p4-stage.js', 'p4-react.js', 'p7-events.js', 'p4-tail.js']
out = [head] + [rd(c) for c in css] + ['</style>', '', rd('p7-body.html'), '<script>'] + [rd(j) for j in js] + ['</script>', '']
res = '\n'.join(out)
open(os.path.join(D, 'logbook-pinboard-8.html'), 'w', encoding='utf-8').write(res)
print('written', len(res), 'chars,', res.count('\n'), 'lines')
