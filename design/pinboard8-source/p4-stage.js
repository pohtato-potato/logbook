function applyStage(){
  const G = ground(), r = document.documentElement.style;
  r.setProperty("--scr-base", G.base); r.setProperty("--scr-ink", G.ink); r.setProperty("--scr-card", G.card); r.setProperty("--scr-solid", G.solid);
  r.setProperty("--scr-muted", G.muted); r.setProperty("--scr-rule", G.rule); r.setProperty("--scr-line", G.line); r.setProperty("--scr-tag", G.tag); r.setProperty("--scr-scrim", G.scrim); r.setProperty("--ts", String(tsize)); r.setProperty("--dayglow", rgba(pal()[OVERALL], G.dark ? .2 : .22)); r.setProperty("--sp", motion === "lively" ? "2.2" : "1");
  document.body.classList.toggle("still", motion === "still"); document.body.classList.toggle("grey", grey); document.body.classList.toggle("ts-big", tsize > 1);
}
function renderDemos(){
  document.querySelectorAll("[data-demo]").forEach(el => { const fn = DEMOS[el.dataset.demo]; try { el.innerHTML = fn ? fn() : ""; } catch(e){ el.textContent = "This sample couldn’t be drawn in this browser."; console.error("Sample failed: " + el.dataset.demo + ": " + (e && e.message)); } });
}
function syncControls(){ document.querySelectorAll("[data-set]").forEach(b => { const cur = {flav, bg, motion, tsize:String(tsize), grey:grey ? "on" : "off"}[b.dataset.set]; b.setAttribute("aria-pressed", String(b.dataset.val === cur)); }); }
function applyView(){
  applyStage(); syncControls(); renderDemos(); fitLaptops(); renderProto(); purgeScenes(); mountScenes(document); start();
  try { localStorage.setItem("logbook-pinboard8-view", JSON.stringify({flav, bg, motion, tsize, grey})); } catch(e){}
}
let rt = 0;
window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(redrawAll, 150); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) start(); });
