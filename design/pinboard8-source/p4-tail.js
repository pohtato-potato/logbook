document.addEventListener("input", ev => {
  const t = ev.target;
  if (t.matches("textarea.note")){ const id = t.dataset.item, cur = R[id] || {v:"", n:""}; R[id] = {v: cur.v || "", n: t.value}; markSaved(id, "…"); clearTimeout(timers["r-" + id]); timers["r-" + id] = setTimeout(() => persistItem(id), 800); }
  else if (t.matches("[data-secnote]")){ const key = t.dataset.secnote; N[key] = t.value; markSaved(key, "…"); clearTimeout(timers["n-" + key]); timers["n-" + key] = setTimeout(() => persistNote(key), 800); }
});
function reactionsText(){
  const lines = ["Logbook pinboard, round 8"];
  const groups = [{id:"try", title:"Try it", ids:TRY.map(c => c.id)}, ...SECTIONS.map(s => ({id:s.id, title:s.title, ids:s.cards.map(c => c.id)}))];
  groups.forEach(g => {
    const rows = g.ids.filter(id => R[id] && (R[id].v || R[id].n)).map(id => `- ${ITEMS[id].title}: ${R[id].v ? VLABEL[R[id].v] : "no verdict"}${R[id].n ? " — " + R[id].n.trim() : ""}`);
    const note = (N[g.id] || "").trim();
    if (rows.length || note){ lines.push("", `[${g.title}]`, ...rows); if (note) lines.push(`Section note: ${note}`); }
  });
  if ((N.overall || "").trim()) lines.push("", "[Overall]", N.overall.trim());
  return lines.join("\n");
}
async function copyReactions(){
  const text = reactionsText(), box = document.getElementById("copybox"), btn = document.getElementById("copy");
  try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; setTimeout(() => { btn.textContent = "Copy my reactions"; }, 2000); box.hidden = true; }
  catch(e){ box.value = text; box.hidden = false; box.focus(); box.select(); btn.textContent = "Select all and copy below"; }
}

/* ---------- start ---------- */
applyView(); applyAll(); setStatus();
(async () => {
  let d = null;
  try { d = (window.claude && typeof window.claude.use === "function") ? await window.claude.use("db") : null; } catch(e){ d = null; }
  if (!d){ mode = "off"; localLoad(); dirty.clear(); dirtyNotes.clear(); localSave(); applyAll(); setStatus(); return; }
  db = d; mode = "on"; setStatus();
  [...dirty].forEach(id => chain("r-" + id, () => writeItem(id)));
  [...dirtyNotes].forEach(k => chain("n-" + k, () => writeNote(k)));
  const onErr = e => { if (e && e.code === "revoked"){ mode = "readonly"; setStatus(); } };
  db.collection("reactions").onSnapshot(snap => {
    snap.docChanges().forEach(ch => { const id = ch.doc.id; if (!ITEMS[id] || dirty.has(id)) return; if (ch.type === "removed") delete R[id]; else { const x = ch.doc.data() || {}; R[id] = {v:x.verdict || "", n:x.note || ""}; } });
    applyAll();
  }, onErr);
  db.collection("notes").onSnapshot(snap => {
    snap.docChanges().forEach(ch => { const k = ch.doc.id; if (dirtyNotes.has(k)) return; if (ch.type === "removed") delete N[k]; else { const x = ch.doc.data() || {}; N[k] = x.text || ""; } });
    applyNotes();
  }, onErr);
})();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(redrawAll);
