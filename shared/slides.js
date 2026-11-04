// Slide deck navigation (loaded after the deck's own script). Keys: right/left arrow, space, Page Up/Down, Home/End;
// O or G overview, N speaker notes (<aside class="notes"> in a slide), F full screen, Esc leaves the overview.
// The slide number is kept in the address (#3), so a link opens that slide; ?overview opens the overview and ?thumb
// shows slide 1 without controls (the thumbnails on presentations.html).
(() => {
  const stage = $("stage"), view = $("viewport"), body = document.body;
  const slides = [...stage.querySelectorAll(":scope > section.slide")];
  const W = 960, H = 540;
  const query = new URLSearchParams(location.search), thumb = query.has("thumb");
  let cur = 0;
  if (thumb) body.classList.add("thumb");
  slides.forEach((s, i) => {
    const n = document.createElement("span");
    n.className = "slno";
    n.textContent = `${DECK.label} · ${i + 1} / ${slides.length}`;
    if (i) s.appendChild(n);
    s.addEventListener("click", () => { if (body.classList.contains("grid")) { grid(false); go(i); } });
  });
  function fit() {
    if (body.classList.contains("grid")) return;
    const k = Math.min(view.clientWidth / W, view.clientHeight / H);
    stage.style.transform = `translate(${(view.clientWidth - W * k) / 2}px, ${(view.clientHeight - H * k) / 2}px) scale(${k})`;
  }
  function go(i) {
    cur = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, k) => s.classList.toggle("on", k === cur));
    $("deckPos").textContent = `${cur + 1} / ${slides.length}`;
    $("deckBar").style.width = `${(100 * (cur + 1)) / slides.length}%`;
    const notes = slides[cur].querySelector("aside.notes");
    $("notesPane").innerHTML = notes ? notes.innerHTML : "<p class=\"muted\">No notes for this slide.</p>";
    if (!thumb) history.replaceState(null, "", `#${cur + 1}`);
    hideTip();
  }
  function grid(on) {
    body.classList.toggle("grid", on);
    document.querySelector('[data-act="grid"]').setAttribute("aria-pressed", on);
    if (on) { stage.style.transform = ""; slides[cur].scrollIntoView({ block: "nearest" }); } else fit();
  }
  function notes() {
    const p = $("notesPane");
    p.hidden = !p.hidden;
    document.querySelector('[data-act="notes"]').setAttribute("aria-pressed", !p.hidden);
    fit();
  }
  const full = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
  const acts = { prev: () => go(cur - 1), next: () => go(cur + 1), grid: () => grid(!body.classList.contains("grid")), notes, full };
  document.querySelectorAll(".deckbtns [data-act]").forEach((b) => b.addEventListener("click", (ev) => { acts[b.dataset.act](); ev.currentTarget.blur(); }));
  addEventListener("keydown", (ev) => {
    if (thumb || ev.metaKey || ev.ctrlKey || ev.altKey || ev.target.closest("input, select, textarea")) return;
    const k = ev.key;
    if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(k)) go(cur + 1);
    else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(k)) go(cur - 1);
    else if (k === "Home") go(0);
    else if (k === "End") go(slides.length - 1);
    else if (k === "o" || k === "g") acts.grid();
    else if (k === "Escape" && body.classList.contains("grid")) grid(false);
    else if (k === "n") notes();
    else if (k === "f") full();
    else return;
    ev.preventDefault();
  });
  // swipe on touch screens
  let x0 = null;
  view.addEventListener("touchstart", (ev) => { x0 = ev.touches[0].clientX; }, { passive: true });
  view.addEventListener("touchend", (ev) => {
    if (x0 === null) return;
    const dx = ev.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50 && !body.classList.contains("grid")) go(cur + (dx < 0 ? 1 : -1));
    x0 = null;
  });
  addEventListener("resize", fit);
  addEventListener("hashchange", () => go((parseInt(location.hash.slice(1), 10) || 1) - 1));
  fit();
  go(thumb ? 0 : (parseInt(location.hash.slice(1), 10) || 1) - 1);
  if (query.has("overview")) grid(true);
})();
