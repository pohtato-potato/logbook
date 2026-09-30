# The legibility probe

Run before every release, on the phone-sized preview (Chrome device mode, 360 x 780) and again with the phone's
text size at its largest (or `document.documentElement.style.fontSize = '150%'`).

1. `npm run dev`, open http://localhost:5174/#/today, load `tests/fixtures/starter.example.json` from Settings (or tap Later).
2. Keep a few lines with feelings, open the day page, the calendar, the picker and a feeling card.
3. In DevTools, run this on each screen. Expected: `small` and `tiny` are empty and `over` is false.

```js
(() => { const small = [], tiny = []; document.querySelectorAll('#app-root *').forEach(e => { if (e.closest('svg') || e.tagName === 'CANVAS') return; const r = e.getBoundingClientRect(); if (!r.width) return;
  const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (own && parseFloat(getComputedStyle(e).fontSize) < 12.95) small.push(e.className);
  if (e.matches('button, input:not([type=file]), textarea') && !e.matches('.tagchip, .mention, .feelchip') && (r.height < 43.5 || r.width < 43.5)) tiny.push(e.className); });
  const c = document.querySelector('.content'); return { small, tiny, over: c.scrollWidth > c.clientWidth + 1 }; })()
```

Tags, names and feelings inside sentences may be 36 px (the usual allowance for links within text); everything else is 44 px or more.
