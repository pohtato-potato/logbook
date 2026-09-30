/* ---------- reactions: saved to the page's database when available ---------- */
const R = {}, N = {};
let mode = "waiting", db = null;
const dirty = new Set(), dirtyNotes = new Set(), chains = {}, timers = {};
function applyCard(id){
  const card = document.getElementById("c-" + id); if (!card) return;
  const r = R[id] || {v:"", n:""};
  card.dataset.v = r.v || "";
  card.querySelectorAll(".v").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === r.v)));
  const ta = document.getElementById("t-" + id);
  if (document.activeElement !== ta) ta.value = r.n || "";
  if (r.n){ document.getElementById("n-" + id).hidden = false; card.querySelector(".notebtn").setAttribute("aria-expanded", "true"); }
}
function applyNotes(){ document.querySelectorAll("[data-secnote]").forEach(ta => { if (document.activeElement !== ta) ta.value = N[ta.dataset.secnote] || ""; }); }
function updateCount(){
  const n = Object.keys(ITEMS).filter(id => R[id] && R[id].v).length;
  document.getElementById("count").textContent = `${n} of ${TOTAL} reacted`;
  document.getElementById("meterfill").style.width = (100 * n / TOTAL).toFixed(1) + "%";
}
function applyAll(){ Object.keys(ITEMS).forEach(applyCard); applyNotes(); updateCount(); }
function setStatus(){
  document.getElementById("status").textContent = {
    waiting:"Connecting…",
    on:"Your reactions save to this page as you go. I can read them directly, so just tell me in chat when you’re done.",
    off:"Your reactions are saved in this browser only. When you’re done, tap Copy my reactions and paste them into our chat.",
    readonly:"This view can’t save reactions. Tap Copy my reactions and paste them into our chat."
  }[mode];
}
function markSaved(key, text){ const el = document.querySelector(`[data-saved="${key}"]`); if (el) el.textContent = text; }
function chain(key, fn){ chains[key] = (chains[key] || Promise.resolve()).then(fn).catch(() => {}); }
function localSave(){ try { localStorage.setItem("logbook-pinboard-8", JSON.stringify({R, N})); } catch(e){} }
function localLoad(){ try { const x = JSON.parse(localStorage.getItem("logbook-pinboard-8") || "null"); if (x){ Object.assign(R, x.R || {}); Object.assign(N, x.N || {}); } } catch(e){} }
function fail(e){ if (e && (e.code === "invalid_argument" || e.code === "not_granted" || e.code === "revoked")){ mode = "readonly"; setStatus(); localSave(); } }
async function writeItem(id){
  const it = ITEMS[id], r = R[id] || {v:"", n:""};
  try {
    const ref = db.doc("reactions/" + id);
    if (!r.v && !r.n) await ref.delete();
    else await ref.set({name:it.title, section:it.secTitle, verdict:r.v || "", verdictLabel:r.v ? VLABEL[r.v] : "", note:r.n || "", pass:8, preview:{palette:flav, background:bg, motion, textSize:tsize, greyscale:grey}, updated:new Date().toISOString()});
    dirty.delete(id); markSaved(id, r.n ? "Saved" : "");
  } catch(e){ fail(e); }
}
async function writeNote(key){
  const text = N[key] || "";
  try {
    const ref = db.doc("notes/" + key);
    if (!text) await ref.delete();
    else await ref.set({section:key === "overall" ? "Overall" : key === "try" ? "Try it" : (SECTIONS.find(s => s.id === key) || {}).title || key, text, pass:8, updated:new Date().toISOString()});
    dirtyNotes.delete(key); markSaved(key, text ? "Saved" : "");
  } catch(e){ fail(e); }
}
function persistItem(id){ dirty.add(id); if (mode === "on") chain("r-" + id, () => writeItem(id)); else if (mode !== "waiting"){ localSave(); markSaved(id, R[id] && R[id].n ? "Saved in this browser" : ""); } }
function persistNote(key){ dirtyNotes.add(key); if (mode === "on") chain("n-" + key, () => writeNote(key)); else if (mode !== "waiting"){ localSave(); markSaved(key, N[key] ? "Saved in this browser" : ""); } }
