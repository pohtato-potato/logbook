/* ---------- phone kit, round 7: every size in the phone is set in em, so it grows with the phone's text setting ---------- */
const IC = {
  today:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>`,
  cal:`<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>`,
  plus:`<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
  shelves:`<svg viewBox="0 0 24 24"><path d="M5 20V5M10 20V8M14.5 20l3-14 2.8.8-3 13.2"/><path d="M3 20h18"/></svg>`,
  almanac:`<svg viewBox="0 0 24 24"><path d="M5 4.5h11.5a2.5 2.5 0 0 1 2.5 2.5v12.5H7.5A2.5 2.5 0 0 1 5 17z"/><path d="M5 17a2.5 2.5 0 0 1 2.5-2.5H19M9 8.5h6"/></svg>`,
  first:`<svg viewBox="0 0 24 24"><path d="M12 3l2 7h7l-5.6 4 2.1 7L12 16.8 6.5 21l2.1-7L3 10h7z"/></svg>`,
  gift:`<svg viewBox="0 0 24 24"><rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M3.5 13h17M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"/></svg>`,
  lock:`<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>`,
  quiet:`<svg viewBox="0 0 24 24"><path d="M3 12s3.5-6 9-6c1.8 0 3.3.6 4.6 1.4M21 12s-3.5 6-9 6c-1.8 0-3.3-.6-4.6-1.4M4 4l16 16"/></svg>`,
  search:`<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/></svg>`,
  gear:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>`,
  more:`<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/></svg>`,
  back:`<svg viewBox="0 0 24 24"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>`,
  next:`<svg viewBox="0 0 24 24"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>`,
  photo:`<svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><circle cx="9" cy="10.5" r="1.8"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/></svg>`,
  down:`<svg viewBox="0 0 24 24"><path d="M6 9.5l6 6 6-6"/></svg>`,
  up:`<svg viewBox="0 0 24 24"><path d="M6 14.5l6-6 6 6"/></svg>`,
  close:`<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>`
};
const MARKS = [["first","First",IC.first],["gift","Gift",IC.gift],["priv","Private",IC.lock],["quiet","Don’t bring back",IC.quiet]];
const sbar = () => `<div class="sbar" aria-hidden="true"><span>11:24</span><span class="sb-ic"><i></i><i></i><b></b></span></div>`;
/* The tab that should light up is the one you came from: a tag opened from Today keeps Today lit. */
const TABOF = {today:"today", settings:"today", search:"today", cal:"cal", day:"cal", shelves:"shelves", shelf:"shelves", almanac:"almanac"};
function currentTab(){ const root = ST.hist.length ? ST.hist[0] : ST.screen; return TABOF[root] || TABOF[ST.screen] || "today"; }
function tabsP(active){
  const on = active === undefined ? currentTab() : active;
  const it = [["today","Today","screen:today"],["cal","Calendar","screen:cal"],["plus","Add","addsheet"],["shelves","Shelves","screen:shelves"],["almanac","Almanac","screen:almanac"]];
  return `<nav class="tabs" aria-label="Main">${it.map(([k, lab, go]) => k === "plus" ? `<button type="button" class="plus" data-go="${go}" aria-label="Add">${IC.plus}</button>` : `<button type="button" class="tab${k === on ? " on" : ""}" data-go="${go}"${k === on ? ` aria-current="page"` : ""} aria-label="${lab}">${IC[k]}<i>${lab}</i></button>`).join("")}</nav>`;
}
/* A face: the initial on a quiet ground, ringed in the thread colour you picked for that person. Never a feeling colour. */
const face = (i, seen, big) => { const c = personCol(i); return `<button type="button" class="face${big ? " big" : ""}${seen ? " seen" : ""}" data-go="person:${i}" style="--pc:${c}" aria-label="Friend ${i}${seen ? ", seen today" : ""}">${i}</button>`; };
const faceStatic = (i, big) => `<span class="face${big ? " big" : ""}" style="--pc:${personCol(i)}" aria-hidden="true">${i}</span>`;
const faces = (onlySeen) => PEOPLE.filter(p => !onlySeen || p[1] <= 1).map(([i, d]) => face(i, d <= 1)).join("");
const formCanvas = (f, f2, label) => `<canvas data-scene="form" data-f="${f}"${f2 ? ` data-f2="${f2}"` : ""} role="img" aria-label="${esc(label || FN[f] + (f2 ? " with " + FN[f2].toLowerCase() : ""))}"></canvas>`;
const glyphCanvas = (f, label) => `<canvas data-scene="glyph" data-f="${f}" role="img" aria-label="${esc(label || FN[f])}"></canvas>`;
/* # tags, @ people, and : feelings (a colon at the start of a word, so times like 5:30 don't count) */
const TOKEN_RE = /(#[\p{L}\p{N}_-]+)|(@[A-Za-z]+)|((?<=^|\s):[\p{L}][\p{L}'-]*)/gu;
/* Tags keep the colour of the feeling they usually come with (loved in round 5), and always show their # and name. */
const tagChip = t => { const c = pal()[tagFam(t)]; return `<button type="button" class="tagchip" data-go="tag:${esc(t)}" style="--tc:${c}"><b aria-hidden="true">#</b>${esc(t)}</button>`; };
function hlHTML(text){
  let out = "", i = 0; TOKEN_RE.lastIndex = 0; let m;
  while ((m = TOKEN_RE.exec(text))){
    out += esc(text.slice(i, m.index));
    if (m[1]){ const c = pal()[tagFam(m[1].slice(1).toLowerCase())]; out += `<mark class="h-tag" style="--tc:${c}">${esc(m[1])}</mark>`; }
    else if (m[2]){ const p = PEOPLE.find(q => q[0] === m[2].slice(1).toUpperCase()); out += p ? `<mark class="h-person" style="--pc:${personCol(p[0])}">${esc(m[2])}</mark>` : esc(m[2]); }
    else { const x = feelingOf(m[3].slice(1)); out += x ? `<mark class="h-feel" style="--fc:${pal()[x.f]}">${esc(m[3])}</mark>` : `<mark class="h-unknown">${esc(m[3])}</mark>`; }
    i = m.index + m[0].length;
  }
  return out + esc(text.slice(i)) + "\n";
}
/* In a kept entry, a feeling is a fixed chip. Tapping it opens its card: what the word means, and a way to remove it. */
function richText(text, src){
  let out = "", i = 0; TOKEN_RE.lastIndex = 0; let m;
  while ((m = TOKEN_RE.exec(text))){
    out += esc(text.slice(i, m.index));
    if (m[1]) out += tagChip(m[1].slice(1).toLowerCase());
    else if (m[2]){ const who = m[2].slice(1).toUpperCase(), p = PEOPLE.find(q => q[0] === who); out += p ? `<button type="button" class="mention" data-go="person:${who}" style="--pc:${personCol(who)}"><b aria-hidden="true">@</b>${who}</button>` : esc(m[2]); }
    else { const x = feelingOf(m[3].slice(1)); out += x ? `<button type="button" class="feelchip" data-gloss="${esc(x.w)}"${src != null ? ` data-src="${esc(src)}"` : ""} style="--fc:${pal()[x.f]}" aria-label="${esc(x.w)}, a feeling. Open its card">${esc(x.w)}</button>` : esc(m[3]); }
    i = m.index + m[0].length;
  }
  return out + esc(text.slice(i));
}
function markStyle(k){ return `--mc:${pal()[MARKCOL[k]]}`; }
function styleMark(el, on){ el.classList.toggle("on", on); el.setAttribute("aria-pressed", String(on)); }
function marksMeta(marks){ return MARKS.filter(([k]) => marks && marks[k]).map(([k, lab, icon]) => `<span class="mpill" style="${markStyle(k)}">${icon}${lab}</span>`).join(""); }
