function applySugg(val){
  const ta = document.getElementById("p-line"), box = document.getElementById("p-sugg"); if (!ta || !box) return;
  const start = +box.dataset.start, end = ta.selectionStart;
  ta.value = ta.value.slice(0, start) + val + " " + ta.value.slice(end);
  const caret = start + val.length + 1; ta.focus(); ta.setSelectionRange(caret, caret);
  ta.dispatchEvent(new Event("input")); box.hidden = true;
}
