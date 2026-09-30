const VERDICTS = [["love","Love it"],["like","Like"],["unsure","Not sure"],["no","Not for me"]];
const VLABEL = Object.fromEntries(VERDICTS);
const ITEMS = {};
TRY.forEach(c => { ITEMS[c.id] = Object.assign({sec:"try", secTitle:"Try it"}, c); });
SECTIONS.forEach(s => s.cards.forEach(c => { ITEMS[c.id] = Object.assign({sec:s.id, secTitle:s.title}, c); }));
const TOTAL = Object.keys(ITEMS).length;
const reactRow = c => `<div class="row" role="group" aria-label="Your reaction to ${esc(c.title)}">${VERDICTS.map(([v, label]) => `<button type="button" class="v" data-id="${c.id}" data-v="${v}" aria-pressed="false">${label}</button>`).join("")}<button type="button" class="notebtn" data-note="${c.id}" aria-expanded="false" aria-controls="n-${c.id}">Add a note</button></div>
  <div hidden id="n-${c.id}"><label class="sr" for="t-${c.id}">Note on ${esc(c.title)}</label><textarea class="note" id="t-${c.id}" data-item="${c.id}" placeholder="What works, what doesn’t, what you’d change"></textarea><span class="saved" data-saved="${c.id}"></span></div>`;
document.getElementById("flows").innerHTML = TRY.map(c => `<article class="card" id="c-${c.id}" data-v=""><h3 class="c-name">${esc(c.title)}</h3><ol class="steps">${c.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol><div class="row"><button type="button" class="showme" data-flow="${c.flow}">Show me</button></div>${reactRow(c)}</article>`).join("");
document.getElementById("sections").innerHTML = SECTIONS.map(s => `
  <section class="sec" id="s-${s.id}">
    <div class="sec-h"><h2>${esc(s.title)}</h2><p class="sec-q">${esc(s.q)}</p></div>
    <div class="cards">${s.cards.map(c => `<article class="card${c.wide ? " wide" : ""}" id="c-${c.id}" data-v=""><h3 class="c-name">${esc(c.title)}</h3><p class="insp">${esc(c.insp)}</p><div data-demo="${c.demo}"></div><p>${esc(c.text)}</p>${reactRow(c)}</article>`).join("")}</div>
    <div class="secnote"><label for="note-${s.id}">Anything about this section?</label>
      <textarea id="note-${s.id}" data-secnote="${s.id}" placeholder="Mixes, favourites, what to push further"></textarea>
      <span class="saved" data-saved="${s.id}"></span></div>
  </section>`).join("");

