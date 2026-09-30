function sizeScene(sc){
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = sc.canvas.clientWidth, h = sc.canvas.clientHeight;
  if (!w || !h) return;
  sc.canvas.width = Math.round(w * dpr); sc.canvas.height = Math.round(h * dpr);
  sc.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); sc.w = w; sc.h = h; sc.pat = null;
}
function drawScene(sc){
  if (!sc.w) sizeScene(sc); if (!sc.w) return;
  try { sc.def.fn(sc.ctx, sc.w, sc.h, sc.def.anim ? T : 0, sc); sc.drawn = true; }
  catch(e){ console.error("Sample failed: " + sc.canvas.dataset.scene + ": " + (e && e.message)); sc.def = {anim:false, fn(){}}; }
}
function mountScenes(root){
  root.querySelectorAll("canvas[data-scene]").forEach(c => {
    if (c._sc) return;
    const def = SCENES[c.dataset.scene], ctx = def && c.getContext && c.getContext("2d");
    if (!ctx) return;
    const sc = {canvas:c, ctx, def, args:Object.assign({}, c.dataset), visible:true, w:0, h:0, pat:null, drawn:false, sel:null};
    c._sc = sc; scenes.push(sc); sizeScene(sc); drawScene(sc);
    if (io) io.observe(c);
  });
}
function purgeScenes(){ for (let i = scenes.length - 1; i >= 0; i--){ if (!scenes[i].canvas.isConnected){ if (io) io.unobserve(scenes[i].canvas); scenes.splice(i, 1); } } }
function speed(){ return motion === "still" ? 0 : motion === "lively" ? 2.2 : 1; }
function frame(now){
  const dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now;
  T += dt * speed();
  scenes.forEach(sc => { if (sc.visible && (sc.def.anim || !sc.drawn)) drawScene(sc); });
  if (speed() > 0 && !document.hidden) requestAnimationFrame(frame); else { running = false; last = 0; }
}
function start(){ if (!running && speed() > 0){ running = true; last = 0; requestAnimationFrame(frame); } }
function redrawAll(){ scenes.forEach(sc => { sizeScene(sc); drawScene(sc); }); }
if ("IntersectionObserver" in window){ io = new IntersectionObserver(entries => entries.forEach(en => { if (en.target._sc) en.target._sc.visible = en.isIntersecting; }), {rootMargin:"160px"}); }
