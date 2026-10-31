// Module 3: binning. DATA = {space, bins} from the example analysis (np26 scripts/20_course_binning.py).
const SP = DATA.space;
const space = { shown: true, pin: -1, hover: -1, hoverContig: -1, sel: null, selMag: null, ex: -1, drag: null };
const VIEWS = SP ? [
  { key: "gcdepth", label: "GC against depth (all reads)", purity: "GC + pooled depth", note: "GC content against depth over all reads pooled (log scale). The classic first look: genomes differ in GC and in how abundant they are, but many MAGs overlap in both." },
  { key: "pair", label: "Depth in one sample against another", purity: null, note: "Depth in two samples (log scale). A genome's contigs share its abundance in every sample, so they line up; genomes whose abundance changes differently between the samples move apart. Samples differ in how much was sequenced, which shifts all contigs together." },
  { key: "depth", label: "Map: depth in all 10 samples", map: "depth", purity: "Depth, 10 samples", note: "t-SNE map of the depth profile across all 10 samples (log depth). Contigs that rise and fall together sit together. t-SNE keeps neighbours, not distances: the gaps between groups and their sizes mean little." },
  { key: "tnf", label: "Map: tetranucleotides", map: "tnf", purity: "Tetranucleotides", note: "t-SNE map of tetranucleotide frequencies (the 136 four-letter words, a word and its reverse complement counted together). Composition is a genome-wide signature, but noisy for short contigs: one 10 kb piece cut from each long MAG contig scores 0.28 against 0.67 for the full contigs. Short contigs in MAGs still score high here, likely because binners mostly add a short contig when its composition fits." },
  { key: "methylation", label: "Map: methylation", map: "methylation", purity: "Methylation", note: "t-SNE map of the share of methylated sites per motif (motifs Nanomotif found in any MAG). Only contigs with 5x depth or more have methylation data. Each genome's methyltransferases set its pattern, so related strains can still differ. The motifs were found within these MAGs, which favours this feature in the scores." },
  { key: "combined_all", label: SP.maps.tnf ? "Map: depth, tetranucleotides and GC" : "Map: depth and GC", map: "combined_all", purity: "Combined", note: "t-SNE map of the feature sets together, each with equal weight. This is closest to what binners do." },
  { key: "combined_meth", label: "Map: all features with methylation", map: "combined_meth", purity: "Combined + methylation", note: "As the combined map, with methylation added (contigs with 5x depth or more)." },
].filter((v) => !v.map || SP.maps[v.map]) : [];
const DEFAULTS = { a: "gcdepth", b: VIEWS.some((v) => v.key === "combined_all") ? "combined_all" : "depth", color: "phylum", len: "purity" };
const MAPS = [...document.querySelectorAll(".maps [data-map]")].map((host) => ({
  key: host.dataset.map, host, box: host.querySelector(".plotbox"), base: host.querySelector(".base"), over: host.querySelector(".over"),
  vsel: host.querySelector(".vsel"), xsel: host.querySelector(".xsel"), ysel: host.querySelector(".ysel"), pair: host.querySelector(".pair"), note: host.querySelector(".vnote"),
  pts: null, grid: null,
}));
const log10d = (v) => v === null ? null : Math.log10(v + 0.1);
const VIR = viridis;
const binOf = (i) => SP.bin[i] >= 0 ? DATA.bins[SP.bin[i]] : null;
const viewOf = (m) => VIEWS.find((v) => v.key === m.vsel.value) || VIEWS[0];
const shortView = (v) => v.label.replace(/^Map: (.)/, (_, c) => c.toUpperCase());
const checkm = (b) => `${b.q}, ${b.comp}% complete, ${b.cont}% contamination (CheckM2)`;

// --- state <-> link
function setSelection(set, mag = null) { space.sel = set && set.size ? set : null; space.selMag = space.sel ? mag : null; }
function magContigs(bi) { const s = new Set(); for (let i = 0; i < SP.bin.length; i++) if (SP.bin[i] === bi) s.add(i); return s; }
function stateHash() {
  const p = new Map();
  p.set("a", MAPS[0].vsel.value); p.set("b", MAPS[1].vsel.value);
  for (const m of MAPS) if (m.vsel.value === "pair") { p.set(m.key + "x", m.xsel.value); p.set(m.key + "y", m.ysel.value); }
  p.set("color", $("spColor").value);
  if ($("spBinned").checked) p.set("only", "1");
  if ($("spLen").value !== "purity") p.set("len", $("spLen").value);
  if (space.pin >= 0) p.set("mark", DATA.bins[space.pin].id);
  if (space.selMag) p.set("sel", space.selMag);
  else if (space.sel && space.sel.size <= 400) p.set("sel", "c" + [...space.sel].map((i) => i.toString(36)).join("-"));
  if (examples.current >= 0) p.set("ex", examples.current + 1);
  return Object.fromEntries(p);
}
function writeHash() { writeHashParams(stateHash()); }
function applyState(st) {
  const setSel = (el, v, ok) => { if (v !== undefined && v !== null && ok(String(v))) el.value = String(v); };
  const isView = (v) => VIEWS.some((w) => w.key === v), isSample = (v) => SP.samples.includes(v);
  setSel(MAPS[0].vsel, st.a ?? DEFAULTS.a, isView); setSel(MAPS[1].vsel, st.b ?? DEFAULTS.b, isView);
  for (const m of MAPS) { setSel(m.xsel, st[m.key + "x"] ?? SP.samples[0], isSample); setSel(m.ysel, st[m.key + "y"] ?? SP.samples[SP.samples.length - 1], isSample); }
  setSel($("spColor"), st.color ?? DEFAULTS.color, (v) => [...$("spColor").options].some((o) => o.value === v));
  setSel($("spLen"), st.len ?? DEFAULTS.len, (v) => [...$("spLen").options].some((o) => o.value === v));
  $("spBinned").checked = String(st.only) === "1";
  const bi = (id) => DATA.bins.findIndex((b) => b.id === id);
  space.pin = st.mark ? bi(st.mark) : -1;
  $("spFind").value = "";
  setSelection(null);
  if (st.sel && String(st.sel).startsWith("c")) setSelection(new Set(String(st.sel).slice(1).split("-").map((s) => parseInt(s, 36)).filter((i) => i >= 0 && i < SP.ids.length)));
  else if (st.sel && bi(st.sel) >= 0) setSelection(magContigs(bi(st.sel)), st.sel);
}
// --- setup
function spaceSetup() {
  const opts = VIEWS.map((v) => `<option value="${v.key}">${esc(v.label)}</option>`).join("");
  const samples = SP.samples.map((s, k) => `<option value="${s}">${s} (day ${SP.day[k]})</option>`).join("");
  for (const m of MAPS) { m.vsel.innerHTML = opts; m.xsel.innerHTML = samples; m.ysel.innerHTML = samples; }
  $("spMags").innerHTML = DATA.bins.map((b) => `<option value="${b.id} ${esc(b.name)}">`).join("");
  applyState({});
  for (const el of [...MAPS.flatMap((m) => [m.vsel, m.xsel, m.ysel]), $("spColor"), $("spBinned"), $("spLen")]) el.addEventListener("input", () => drawSpace());
  $("prScale").addEventListener("input", () => { drawProfile(); });
  $("spFind").addEventListener("change", (e) => {
    const i = DATA.bins.findIndex((b) => b.id === e.target.value.split(" ")[0]);
    if (i >= 0) { space.pin = i; refresh(); }
  });
  $("spCopy").addEventListener("click", async () => {
    writeHash();
    let ok = true; try { await navigator.clipboard.writeText(location.href); } catch (e) { ok = false; }
    $("spCopied").textContent = ok ? "Copied." : "Copy the address from the browser bar.";
    setTimeout(() => { $("spCopied").textContent = ""; }, 2500);
  });
  for (const m of MAPS) mapEvents(m);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && space.shown && space.sel) { setSelection(null); refresh(true); } });
}

function mapEvents(m) {
  const pos = (ev) => { const r = m.over.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
  m.over.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0) return;
    space.drag = { m, path: [pos(ev)], add: ev.shiftKey, moved: false };
    try { m.over.setPointerCapture(ev.pointerId); } catch (e) {}
  });
  m.over.addEventListener("pointermove", (ev) => {
    const d = space.drag;
    if (d && d.m === m) {
      const p = pos(ev), [x0, y0] = d.path[0];
      d.path.push(p);
      if (!d.moved && Math.hypot(p[0] - x0, p[1] - y0) > 6) d.moved = true;
      if (d.moved) { hideTip(); drawOver(m); }
      return;
    }
    const i = nearest(m, ev), bin = i >= 0 ? SP.bin[i] : -1;
    if (bin !== space.hover || i !== space.hoverContig) { space.hover = bin; space.hoverContig = i; for (const n of MAPS) drawOver(n); hotLine(); }
    if (i < 0) { hideTip(); return; }
    const b = binOf(i), v = viewOf(m), pu = v.purity && SP.purity[v.purity] ? SP.purity[v.purity][i] : null;
    showTip(ev, `<b class="mono">${SP.ids[i]}</b><br>${fmtBp(SP.len[i])} · GC ${SP.gc[i]}% · ${SP.depth.pooled[i]}x${SP.phylum[i] >= 0 ? `<br>${esc(SP.phyla[SP.phylum[i]])} (Metabuli)` : ""}<br>${b ? `MAG <b>${esc(b.name)}</b> <span class="mono">${b.id}</span><br>${checkm(b)}` : "not in a MAG"}${pu !== null && pu !== undefined ? `<br>${Math.round(pu * 100)}% of its nearest contigs in the same MAG here` : ""}`);
  });
  m.over.addEventListener("pointerup", (ev) => {
    const d = space.drag; space.drag = null;
    if (!d || d.m !== m) return;
    if (d.moved && d.path.length > 2) {
      const hit = new Set(d.add && space.sel ? space.sel : []);
      for (const [i, [px, py]] of m.pts) if (inPolygon(px, py, d.path)) hit.add(i);
      setSelection(hit);
      refresh(true);
    } else {
      const i = nearest(m, ev);
      space.pin = i >= 0 ? SP.bin[i] : -1;
      refresh();
    }
  });
  m.over.addEventListener("pointercancel", () => { space.drag = null; drawOver(m); });
  m.over.addEventListener("pointerleave", () => { if (space.drag) return; hideTip(); space.hover = -1; space.hoverContig = -1; for (const n of MAPS) drawOver(n); hotLine(); });
}

function inPolygon(x, y, poly) {
  let inside = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, ya] = poly[a], [xb, yb] = poly[b];
    if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
  }
  return inside;
}

// redraw after a change of the ring or the selection (selection fades the other dots, so the maps redraw)
function refresh(maps = false) {
  if (maps) for (const m of MAPS) drawMap(m);
  for (const m of MAPS) drawOver(m);
  drawMagPanel(); drawSelPanel(); drawProfile(); writeHash();
}

function coords(m, v) {
  const n = SP.ids.length, x = new Array(n), y = new Array(n);
  if (v.key === "gcdepth") for (let i = 0; i < n; i++) { x[i] = SP.gc[i]; y[i] = log10d(SP.depth.pooled[i]); }
  else if (v.key === "pair") { const a = SP.depth[m.xsel.value], b = SP.depth[m.ysel.value]; for (let i = 0; i < n; i++) { x[i] = log10d(a[i]); y[i] = log10d(b[i]); } }
  else { const [mx, my] = SP.maps[v.map]; for (let i = 0; i < n; i++) { x[i] = mx[i]; y[i] = my[i]; } }
  return [x, y];
}

function colourFn(v) {
  const mode = $("spColor").value, pur = v.purity ? SP.purity[v.purity] : null;
  const cats = [1, 2, 3, 4, 5, 6, 7].map((k) => cssVar("--c" + k)), faint = cssVar("--faint"), accent = cssVar("--accent");
  const has = (a, i) => a && a[i] !== null && a[i] !== undefined;
  const viridis = (t) => VIR(0.12 + 0.88 * t);  // darkest step left out: it disappears on the dark surface
  if (mode === "phylum") return { fore: (i) => SP.phylum[i] >= 0, col: (i) => SP.phylum[i] >= 0 ? cats[SP.phylum[i]] : faint };
  if (mode === "binned") return { fore: (i) => SP.bin[i] >= 0, col: (i) => SP.bin[i] >= 0 ? accent : faint };
  if (mode === "comp") return { fore: (i) => SP.bin[i] >= 0, col: (i) => SP.bin[i] >= 0 ? viridis(Math.max(0, (binOf(i).comp - 50) / 50)) : faint };
  if (mode === "cont") return { fore: (i) => SP.bin[i] >= 0, col: (i) => SP.bin[i] >= 0 ? viridis(Math.min(1, binOf(i).cont / 10)) : faint };
  return { fore: (i) => has(pur, i), col: (i) => has(pur, i) ? viridis(pur[i]) : faint };
}

function drawMap(m) {
  const v = viewOf(m);
  m.pair.style.display = v.key === "pair" ? "flex" : "none";
  const W = Math.max(280, m.box.clientWidth), H = Math.round(Math.min(560, Math.max(280, W * 0.8)));
  m.box.style.height = H + "px";
  const dpr = window.devicePixelRatio || 1;
  for (const c of [m.base, m.over]) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px"; c.style.height = H + "px"; c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0); }
  const axes = v.key === "gcdepth" || v.key === "pair", mg = axes ? { l: 46, r: 10, t: 10, b: 36 } : { l: 10, r: 10, t: 10, b: 10 };
  const [x, y] = coords(m, v), onlyBinned = $("spBinned").checked;
  const idx = [];
  for (let i = 0; i < x.length; i++) if (x[i] !== null && y[i] !== null && !(onlyBinned && SP.bin[i] < 0)) idx.push(i);
  const ext = (a) => { let lo = Infinity, hi = -Infinity; for (const i of idx) { if (a[i] < lo) lo = a[i]; if (a[i] > hi) hi = a[i]; } const pad = (hi - lo) * 0.03 || 1; return [lo - pad, hi + pad]; };
  const [x0, x1] = ext(x), [y0, y1] = ext(y);
  const X = (val) => mg.l + ((val - x0) / (x1 - x0)) * (W - mg.l - mg.r), Y = (val) => H - mg.b - ((val - y0) / (y1 - y0)) * (H - mg.t - mg.b);
  const ctx = m.base.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  ctx.font = `11px ${cssVar("--sans")}`; ctx.fillStyle = cssVar("--muted"); ctx.strokeStyle = cssVar("--line"); ctx.lineWidth = 1;
  if (axes) {
    const logTicks = [0.1, 1, 10, 100, 1000, 10000];
    const xt = v.key === "gcdepth" ? [20, 30, 40, 50, 60, 70].map((t) => [t, t + "%"]) : logTicks.map((t) => [Math.log10(t + 0.1), t + "x"]);
    const yt = logTicks.map((t) => [Math.log10(t + 0.1), t + "x"]);
    ctx.textAlign = "center";
    for (const [t, lab] of xt) if (t >= x0 && t <= x1) { ctx.beginPath(); ctx.moveTo(X(t), mg.t); ctx.lineTo(X(t), H - mg.b); ctx.stroke(); ctx.fillText(lab, X(t), H - mg.b + 14); }
    ctx.textAlign = "right";
    for (const [t, lab] of yt) if (t >= y0 && t <= y1) { ctx.beginPath(); ctx.moveTo(mg.l, Y(t)); ctx.lineTo(W - mg.r, Y(t)); ctx.stroke(); ctx.fillText(lab, mg.l - 6, Y(t) + 4); }
    ctx.textAlign = "center";
    ctx.fillText(v.key === "gcdepth" ? "GC content" : `Depth in ${m.xsel.value}`, (mg.l + W - mg.r) / 2, H - 6);
    ctx.save(); ctx.translate(12, (mg.t + H - mg.b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(v.key === "gcdepth" ? "Depth, all reads" : `Depth in ${m.ysel.value}`, 0, 0); ctx.restore();
  }
  const { fore, col } = colourFn(v), sel = space.sel;
  const rad = (i) => 1.1 + 1.3 * Math.log10(SP.len[i] / 1e4);
  const rank = (i) => (sel && sel.has(i) ? 2 : 0) + (fore(i) ? 1 : 0);
  const order = idx.slice().sort((a, b) => rank(a) - rank(b));
  for (const i of order) {
    ctx.globalAlpha = sel && !sel.has(i) ? 0.12 : 0.8;
    ctx.fillStyle = col(i); ctx.beginPath(); ctx.arc(X(x[i]), Y(y[i]), rad(i), 0, 2 * Math.PI); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const pts = new Map(), cell = 8, grid = new Map();
  for (const i of idx) { const px = X(x[i]), py = Y(y[i]); pts.set(i, [px, py]); const k = `${Math.floor(px / cell)},${Math.floor(py / cell)}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); }
  Object.assign(m, { pts, grid, cell, rad, W, H });
  const binnedShown = idx.filter((i) => SP.bin[i] >= 0).length;
  m.note.textContent = `${v.note} Shown: ${idx.length.toLocaleString("en")} contigs, ${binnedShown.toLocaleString("en")} of them in MAGs.`;
}

function nearest(m, ev) {
  if (!m.grid) return -1;
  const r = m.over.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
  const cx = Math.floor(mx / m.cell), cy = Math.floor(my / m.cell);
  let best = -1, bd = 49;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const i of m.grid.get(`${cx + dx},${cy + dy}`) || []) {
    const [px, py] = m.pts.get(i), d = (px - mx) ** 2 + (py - my) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

function drawOver(m) {
  const ctx = m.over.getContext("2d");
  ctx.clearRect(0, 0, m.W, m.H);
  if (!m.pts) return;
  const ink = cssVar("--ink"), surface = cssVar("--surface"), accent = cssVar("--accent");
  const ring = (px, py, r, w, colour) => { ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.strokeStyle = surface; ctx.lineWidth = w + 2; ctx.stroke(); ctx.strokeStyle = colour; ctx.lineWidth = w; ctx.stroke(); };
  for (const [bin, w] of [[space.pin, 2], [space.hover === space.pin ? -1 : space.hover, 1.5]]) {
    if (bin < 0) continue;
    for (const [i, [px, py]] of m.pts) if (SP.bin[i] === bin) ring(px, py, m.rad(i) + 2.5, w, ink);
  }
  if (space.sel) for (const i of space.sel) { const p = m.pts.get(i); if (p) ring(p[0], p[1], m.rad(i) + 1.5, 1.25, accent); }
  const h = m.pts.get(space.hoverContig);
  if (h) ring(h[0], h[1], m.rad(space.hoverContig) + 5, 2.5, ink);
  const d = space.drag;
  if (d && d.m === m && d.moved) {
    ctx.beginPath(); d.path.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
    ctx.fillStyle = accent; ctx.globalAlpha = 0.08; ctx.fill(); ctx.globalAlpha = 1;
    ctx.setLineDash([4, 3]); ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
  }
}

function drawLegend() {
  const mode = $("spColor").value, ramp = (lo, hi) => `<span class="ramp" style="background:linear-gradient(90deg,${VIRIDIS.slice(1).join(",")})"></span><span>${lo} → ${hi}</span>`;
  const notIn = `<span><i class="sw" style="background:var(--faint)"></i>not in a MAG</span>`;
  const extra = `<span>· dot size: contig length · black rings: the ringed MAG · teal rings: the selection (other dots faded)</span>`;
  let html;
  if (mode === "phylum") html = SP.phyla.map((p, k) => `<span><i class="sw" style="background:var(--c${k + 1})"></i>${esc(p)}</span>`).join("") + `<span><i class="sw" style="background:var(--faint)"></i>other or unclassified</span>`;
  else if (mode === "binned") html = `<span><i class="sw" style="background:var(--accent)"></i>in a MAG</span>${notIn}`;
  else if (mode === "comp") html = `<span>CheckM2 completeness of the contig's MAG</span>${ramp("50% or less", "100%")}${notIn}`;
  else if (mode === "cont") html = `<span>CheckM2 contamination of the contig's MAG</span>${ramp("0%", "10% or more")}${notIn}`;
  else html = `<span>Share of nearest contigs in the same MAG, in each map's feature set</span>${ramp("0", "1")}<span><i class="sw" style="background:var(--faint)"></i>no score: not in a MAG, or a MAG of one contig</span><span>(no score for depth in two samples)</span>`;
  $("spLegend").innerHTML = html + extra;
}

function drawSpace(push = true) {
  for (const m of MAPS) drawMap(m);
  for (const m of MAPS) drawOver(m);
  drawLegend(); drawScores(); drawMagPanel(); drawSelPanel(); drawProfile();
  if (push) writeHash();
}

function drawMagPanel() {
  const host = $("spMag");
  if (space.pin < 0) { host.innerHTML = `<h2>Ringed MAG</h2><p class="note">Click a dot, or find a MAG above, to ring all contigs of its MAG in both maps. Then change the maps to see which features keep them together.</p>`; return; }
  const b = DATA.bins[space.pin], cur = MAPS.map((m) => viewOf(m).key);
  let n = 0;
  for (let i = 0; i < SP.bin.length; i++) if (SP.bin[i] === space.pin) n++;
  const rows = VIEWS.filter((w) => w.purity && SP.purity[w.purity]).map((w) => {
    let s = 0, c = 0; for (let i = 0; i < SP.bin.length; i++) if (SP.bin[i] === space.pin && SP.purity[w.purity][i] !== null) { s += SP.purity[w.purity][i]; c++; }
    return `<tr class="${cur.includes(w.key) ? "cur" : ""}"><td>${esc(shortView(w))}</td><td class="r">${c ? Math.round((s / c) * 100) + "%" : "–"}</td></tr>`;
  }).join("");
  host.innerHTML = `<h2>Ringed MAG</h2><h3 style="font-size:16px"><i>${esc(b.name)}</i> <span class="mono muted" style="font-size:12px">${b.id}</span></h3>
    <div class="facts"><span>${b.q}</span><span>CheckM2 <b>${b.comp}%</b> complete, <b>${b.cont}%</b> contamination</span><span><b>${b.n}</b> contigs, <b>${n}</b> of 10 kb or more</span><span>depth <b>${b.cov}x</b></span></div>
    ${b.n < 2 ? `<p class="note">A MAG of one contig: nothing to keep together.</p>` : `<table class="sc"><thead><tr><th>Feature set</th><th class="r">Same-MAG neighbours</th></tr></thead><tbody>${rows}</tbody></table>`}
    <div style="display:flex;flex-wrap:wrap;gap:6px 16px"><button class="link" id="spSelMag">Select its contigs</button><button class="link" id="spClear">Remove ring</button></div>`;
  $("spSelMag").addEventListener("click", () => { setSelection(magContigs(space.pin), b.id); refresh(true); });
  $("spClear").addEventListener("click", () => { space.pin = -1; $("spFind").value = ""; refresh(); });
}

function drawSelPanel() {
  const host = $("spSel");
  if (!space.sel) { host.innerHTML = `<h2>Selection</h2><p class="note">Draw around dots on either map to select those contigs; they stay highlighted in both maps and appear in the depth chart. Hold Shift to add to the selection, press Esc to clear it.</p>`; return; }
  const sel = [...space.sel], counts = new Map();
  let bp = 0, binned = 0;
  for (const i of sel) { bp += SP.len[i]; if (SP.bin[i] >= 0) { binned++; counts.set(SP.bin[i], (counts.get(SP.bin[i]) || 0) + 1); } }
  const size = new Map(); for (const bi of SP.bin) if (bi >= 0) size.set(bi, (size.get(bi) || 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8);
  host.innerHTML = `<div class="exhead"><h2>Selection</h2><button class="link" id="spSelClear">Clear selection</button></div>
    <div class="facts"><span><b>${sel.length.toLocaleString("en")}</b> contigs</span><span><b>${fmtBp(bp)}</b></span><span><b>${binned.toLocaleString("en")}</b> in ${counts.size} MAGs, <b>${(sel.length - binned).toLocaleString("en")}</b> not in a MAG</span></div>
    ${top.length ? `<table class="sc"><thead><tr><th>MAG</th><th class="r">Selected</th><th class="r">Of its contigs here</th><th></th></tr></thead><tbody>${top.map(([bi, c]) => { const b = DATA.bins[bi]; return `<tr><td><i>${esc(b.name)}</i> <span class="mono muted">${b.id}</span></td><td class="r">${c}</td><td class="r">${Math.round((c / size.get(bi)) * 100)}%</td><td><button class="link" data-ring="${bi}">Ring</button></td></tr>`; }).join("")}</tbody></table>${counts.size > top.length ? `<p class="note">and ${counts.size - top.length} more MAGs.</p>` : ""}` : ""}`;
  $("spSelClear").addEventListener("click", () => { setSelection(null); refresh(true); });
  for (const bt of host.querySelectorAll("[data-ring]")) bt.addEventListener("click", () => { space.pin = +bt.dataset.ring; refresh(); });
}

// depth across the samples for the ringed MAG and the selection
const PR_MAX = 300;
let prLines = [];
function drawProfile() {
  const host = $("profile"), perGb = $("prScale").value === "gb", S = SP.samples, n = S.length;
  const val = (i, k) => { const d = SP.depth[S[k]][i]; return d === null ? null : Math.log10((perGb ? d / SP.gb[k] : d) + (perGb ? 0.01 : 0.1)); };
  const groups = [];
  if (space.pin >= 0) groups.push({ name: `ringed: ${DATA.bins[space.pin].name}`, label: "ringed", colour: "var(--ink)", ids: [...magContigs(space.pin)] });
  if (space.sel) groups.push({ name: "selection", label: "selected", colour: "var(--accent)", ids: [...space.sel] });
  prLines = [];
  if (!groups.length) { host.innerHTML = ""; $("prLegend").innerHTML = ""; $("prNote").textContent = "Ring a MAG or select contigs to see their depth in each sample. Contigs of one genome should run in parallel."; return; }
  const W = Math.max(300, host.clientWidth), H = 250, mg = { l: 50, r: 66, t: 22, b: 34 };
  let lo = Infinity, hi = -Infinity;
  for (const g of groups) {
    const step = Math.max(1, Math.ceil(g.ids.length / PR_MAX));
    g.drawn = g.ids.filter((_, k) => k % step === 0);
    g.vals = g.ids.map((i) => S.map((_, k) => val(i, k)));
    for (const row of g.vals) for (const v of row) if (v !== null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  }
  lo = Math.floor(lo); hi = Math.ceil(hi); if (hi === lo) hi = lo + 1;
  const X = (k) => mg.l + (k / (n - 1)) * (W - mg.l - mg.r), Y = (v) => H - mg.b - ((v - lo) / (hi - lo)) * (H - mg.t - mg.b);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Depth of each contig in each sample" });
  // diet periods as bands
  let k0 = 0;
  for (let k = 1; k <= n; k++) if (k === n || SP.diet[k] !== SP.diet[k0]) {
    const xa = k0 === 0 ? mg.l : (X(k0 - 1) + X(k0)) / 2, xb = k === n ? W - mg.r : (X(k - 1) + X(k)) / 2;
    if (k0 > 0) el("rect", { class: "band", x: xa, y: mg.t, width: xb - xa, height: H - mg.t - mg.b }, svg);
    const t = el("text", { x: (xa + xb) / 2, y: mg.t - 8, "text-anchor": "middle", class: "lbl" }, svg); t.textContent = SP.diet[k0].replace(/_/g, "-") + " diet";
    k0 = k;
  }
  for (let e = lo; e <= hi; e++) {
    el("line", { class: "grid", x1: mg.l, x2: W - mg.r, y1: Y(e), y2: Y(e) }, svg);
    const t = el("text", { x: mg.l - 6, y: Y(e) + 4, "text-anchor": "end", class: "lbl" }, svg); t.textContent = `${10 ** e >= 1 ? 10 ** e : (10 ** e).toFixed(-e)}x`;
  }
  S.forEach((s, k) => { const t = el("text", { x: X(k), y: H - mg.b + 14, "text-anchor": "middle", class: "lbl" }, svg); t.textContent = SP.day[k]; });
  const xt = el("text", { x: (mg.l + W - mg.r) / 2, y: H - 4, "text-anchor": "middle", class: "lbl" }, svg); xt.textContent = "Day (samples DNA01-DNA10)";
  const yt = el("text", { x: 12, y: (mg.t + H - mg.b) / 2, "text-anchor": "middle", class: "lbl", transform: `rotate(-90 12 ${(mg.t + H - mg.b) / 2})` }, svg); yt.textContent = perGb ? "Depth per Gb sequenced" : "Depth";
  const path = (row) => row.map((v, k) => (v === null ? null : `${X(k).toFixed(1)},${Y(v).toFixed(1)}`)).filter(Boolean).join(" ");
  for (const g of groups) for (const i of g.drawn) {
    const row = g.vals[g.ids.indexOf(i)];
    const line = el("polyline", { class: "prl", points: path(row), stroke: g.colour }, svg);
    prLines.push({ i, row, line });
  }
  for (const g of groups) {
    const med = S.map((_, k) => { const v = g.vals.map((r) => r[k]).filter((x) => x !== null).sort((a, b) => a - b); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; });
    el("polyline", { class: "prm", points: path(med), stroke: "var(--surface)", style: "stroke-width:5" }, svg);
    el("polyline", { class: "prm", points: path(med), stroke: g.colour }, svg);
    if (med[n - 1] !== null) { const t = el("text", { x: X(n - 1) + 6, y: Y(med[n - 1]) + 4, class: "lbl" }, svg); t.textContent = g.label; }
  }
  svg.addEventListener("pointermove", (ev) => {
    const r = svg.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
    const k = Math.max(0, Math.min(n - 1, Math.round(((mx - mg.l) / (W - mg.l - mg.r)) * (n - 1))));
    let best = null, bd = 12;
    for (const L of prLines) if (L.row[k] !== null) { const d = Math.abs(Y(L.row[k]) - my); if (d < bd) { bd = d; best = L; } }
    const i = best ? best.i : -1;
    if (i !== space.hoverContig) { space.hoverContig = i; for (const m of MAPS) drawOver(m); hotLine(); }
    if (!best) { hideTip(); return; }
    const b = binOf(i), d = SP.depth[S[k]][i];
    showTip(ev, `<b class="mono">${SP.ids[i]}</b><br>${b ? `<i>${esc(b.name)}</i> <span class="mono">${b.id}</span>` : "not in a MAG"}<br>Day ${SP.day[k]} (${S[k]}): ${d}x, ${(d / SP.gb[k]).toFixed(2)}x per Gb (${SP.gb[k]} Gb sequenced)`);
  });
  svg.addEventListener("pointerleave", () => { hideTip(); space.hoverContig = -1; for (const m of MAPS) drawOver(m); hotLine(); });
  host.innerHTML = ""; host.appendChild(svg);
  $("prLegend").innerHTML = groups.map((g) => `<span><i class="sw" style="background:${g.colour}"></i>${esc(g.name)} (${g.ids.length} contigs${g.drawn.length < g.ids.length ? `, ${g.drawn.length} drawn` : ""})</span>`).join("") + `<span>· thick line: median · shaded: second diet period</span>`;
  $("prNote").textContent = perGb
    ? `One line per contig of 10 kb or more. Depth is divided by the Gb of reads sequenced in that sample (${Math.min(...SP.gb)}-${Math.max(...SP.gb)} Gb), so days can be compared. Day 2 has the fewest reads, so its values are the noisiest. One person, one sample per day: diet and time cannot be separated.`
    : `One line per contig of 10 kb or more, raw depth. Samples were sequenced to different amounts (${Math.min(...SP.gb)}-${Math.max(...SP.gb)} Gb), which moves all lines together; switch to depth per Gb to compare days.`;
}
function hotLine() { for (const L of prLines) L.line.classList.toggle("hot", L.i === space.hoverContig); }

function drawScores() {
  const key = $("spLen").value, cur = MAPS.map((m) => viewOf(m).purity);
  const by = {}; for (const r of SP.scores) { (by[r.feature] = by[r.feature] || {})[r.set] = r; }
  const bar = (r) => r && r[key] !== null && r[key] !== undefined ? `<div class="bar" title="${Math.round(r[key] * 100)}% (chance ${(r.chance * 100).toFixed(1)}%)"><span style="width:${r[key] * 100}%"></span><i style="left:${r.chance * 100}%"></i></div>` : "";
  const pct = (r) => r && r[key] !== null && r[key] !== undefined ? Math.round(r[key] * 100) + "%" : "–";
  const all = SP.scores.find((r) => r.set === "all"), me = SP.scores.find((r) => r.set === "methylation");
  $("spScores").innerHTML = `<table class="sc"><thead><tr><th>Feature set</th><th colspan="2">All MAG contigs (${all.n_scored.toLocaleString("en")})</th><th colspan="2">With methylation (${me.n_scored.toLocaleString("en")})</th></tr></thead><tbody>${Object.entries(by).map(([f, s]) => `<tr class="${cur.includes(f) ? "cur" : ""}"><td>${esc(f)}</td><td>${bar(s.all)}</td><td class="r">${pct(s.all)}</td><td>${bar(s.methylation)}</td><td class="r">${pct(s.methylation)}</td></tr>`).join("")}</tbody></table>`;
}

// --- start
const examples = setupExamples($("spExamples"), (k) => { applyState(EXAMPLES[k].state); drawSpace(); });
spaceSetup();
(function start() {
  const st = readHashParams(), ex = parseInt(st.ex, 10);
  if (ex >= 1 && ex <= EXAMPLES.length) { examples.current = ex - 1; examples.draw(); }
  applyState(st);
  drawSpace(false);
})();
let resizeTimer;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => drawSpace(false), 150); });
