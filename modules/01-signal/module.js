// Module 1: signal. DATA from the example analysis (np26 scripts/30_course_signal.py): source (run settings), reads
// (counts and the move-table check), dwell (samples per base by the move table), speed, ts, trace (one read's current:
// envelope of the whole read, every sample of its first second, move-table boundaries and bases there), fit (model
// against measured current), stretches (40 reference bases each: samples, read bases on the move table, reference bases
// on Remora's boundaries, model and measured level), bins, kmers (crude motif search), motifs (per motif and bin: calls,
// current around the modified base), bam (read starts; read errors over each motif).
const D = DATA, T = D.trace, F = D.fit, BINS = D.bins.map((b) => b.id), M = D.motifs;
const num = (n) => Number(n).toLocaleString("en");
const pct = (x, d = 0) => `${(100 * x).toFixed(d)}%`;
const BINCOL = Object.fromEntries(BINS.map((b, i) => [b, `var(--c${i + 1})`]));
const ZOOMS = [[1000, "1 s"], [200, "0.2 s"], [50, "0.05 s"]];
const BOUNDS = [["refined", "refined (Remora)"], ["move", "move table"]];
const DEFAULTS = { zw: 1000, zs: 0, stretch: 1, fitb: "refined", motif: "GATC", bound: "refined", split: 0, kbin: BINS[0], kmod: "6mA" };
const st = { ...DEFAULTS };
const OFF = []; for (let o = D.offsets[0]; o <= D.offsets[1]; o++) OFF.push(o);
const width = (id, min = 280) => Math.max(min, $(id).clientWidth || min);
const tipOn = (node, html) => { node.addEventListener("mousemove", (ev) => showTip(ev, html)); node.addEventListener("mouseleave", hideTip); };
const text = (svg, x, y, s, attrs = {}) => { const t = el("text", { x, y, class: "lbl", ...attrs }, svg); t.textContent = s; return t; };
const motifOf = (name) => M.find((m) => m.motif === name);
// a motif with its modified base underlined (HTML)
const motifHtml = (m, pos) => `<span class="mono">${esc(m.slice(0, pos))}<u>${esc(m[pos])}</u>${esc(m.slice(pos + 1))}</span>`;
// measured minus model per offset: the motif's methylating bin against the mean of the others
function effect(m, key = "refined") {
  const mb = m.methylated_in, own = m.bins[mb][key].mean, others = BINS.filter((b) => b !== mb);
  return own.map((v, i) => v - others.reduce((s, b) => s + m.bins[b][key].mean[i], 0) / others.length);
}
const range = (a, f, unit = "") => { const lo = Math.min(...a), hi = Math.max(...a); return (lo === hi ? f(lo) : `${f(lo)}-${f(hi)}`) + unit; };
const atLeast = (h, from) => h.slice(from).reduce((s, x) => s + x, 0);

// --- numbers in the text, all from the data
function fillNumbers() {
  const R = D.reads, dw = D.dwell, tot = dw.hist.reduce((s, x) => s + x, 0);
  const eff = M.map((m) => Math.max(...effect(m).map(Math.abs)));
  const mlHigh = M.map((m) => { const v = m.bins[m.methylated_in]; return atLeast(v.hist, 16) / v.calls; });
  const mlLow = M.flatMap((m) => BINS.filter((b) => b !== m.methylated_in).map((b) => { const v = m.bins[b]; return (v.hist.slice(0, 4).reduce((s, x) => s + x, 0) + v.implicit) / v.calls; }));
  const eb = Object.values(D.bam.error_per_base);
  const N = {
    nReads: num(R.n), speedSet: D.source.speed_setting, rate: num(D.source.rate), perBase: (D.source.rate / D.source.speed_setting).toFixed(1),
    traceLen: `${(T.n / T.rate).toFixed(1)} s`, traceBases: num(T.length), traceTs: `${num(T.ts)} samples (${(T.ts / T.rate).toFixed(2)} s)`,
    tsMedian: `${D.ts.median_s.toFixed(2)} s`, leadShare: pct(D.bam.lead_le10), traceTail: `${((T.n - T.ns) / T.rate).toFixed(2)} s`,
    stride: dw.stride, dwell6: pct(dw.hist[dw.stride] / tot), dwellMedian: dw.median, dwellMean: dw.mean.toFixed(1), speedMedian: D.speed.median,
    movesOk: `${num(R.moves_ok)} of ${num(R.n)}`, readMove: F.read_r.move.toFixed(3), readRefined: F.read_r.refined.toFixed(3),
    rShuffled: F.median.r_shuffled.toFixed(3), nShuffled: num(F.n_shuffled), rMove: F.median.r_move.toFixed(3), rRefined: F.median.r_refined.toFixed(3),
    scalePa: Math.round(F.scale_pa), effect: range(eff, (x) => x.toFixed(2)), mlHigh: range(mlHigh, (x) => (100 * x).toFixed(0), "%"), mlLow: range(mlLow, (x) => (100 * x).toFixed(0), "%"),
    siteLow: (() => { const sc = motifOf("GATC").site_check; return `${num(sc.observed[0] + sc.observed[1])} sites below 40% against ${num(Math.round(sc.expected[0] + sc.expected[1]))} expected, of ${num(sc.sites)}`; })(),
    errBase: `${range(eb, (x) => (100 * x).toFixed(2), "%")} of aligned reference bases`,
  };
  for (const e of document.querySelectorAll("[data-n]")) e.textContent = N[e.dataset.n] ?? "?";
  $("sgStats").innerHTML = [
    [num(R.n), "reads (8 samples, 4 genome bins)"], [`${(R.bases / 1e6).toFixed(1)} Mb`, "of read bases"], [num(R.length_median), "bases: median read length"],
    [`Q${R.qs_median}`, "median read quality"], [num(D.source.rate), "samples per second"], [D.speed.median, "bases per second (median read)"],
  ].map(([n, t]) => `<div class="stat"><b>${n}</b><span>${t}</span></div>`).join("");
}

// --- a row of toggle buttons (segmented control)
function seg(id, items, key, redraw) {
  const host = $(id);
  host.innerHTML = items.map(([v, l]) => `<button type="button" data-v="${v}">${esc(l)}</button>`).join("");
  host.addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (!b) return; st[key] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v; redraw(); write(); });
}
const segShow = (id, v) => { for (const b of $(id).querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.v === String(v))); };

// --- 1. the whole read and a window of its first second
const REG = [["adapter and barcode (before ts, not basecalled)", "var(--c7)"], ["genome", "var(--c1)"], ["after ns (not basecalled)", "var(--c5)"]];
function drawTrace() {
  const w = width("sgTrace", 520), h = 150, m = { l: 40, r: 8, t: 8, b: 24 };
  const svg = el("svg", { width: w, height: h, role: "img", "aria-label": "Current of the whole read" });
  const n = T.n, x = (s) => m.l + (s / n) * (w - m.l - m.r), lo = 30, hi = 180;
  const y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (h - m.t - m.b);
  for (const [a, b, c] of [[0, T.ts, REG[0][1]], [T.ns, n, REG[2][1]]]) el("rect", { x: x(a), y: m.t, width: Math.max(1, x(b) - x(a)), height: h - m.t - m.b, fill: c, "fill-opacity": 0.18 }, svg);
  for (const v of [50, 100, 150]) { el("line", { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), class: "grid" }, svg); text(svg, m.l - 4, y(v) + 4, v, { "text-anchor": "end" }); }
  const k = T.lo.length, xs = (i) => m.l + ((i + 0.5) / k) * (w - m.l - m.r);
  const lower = []; for (let i = k - 1; i >= 0; i--) lower.push(`${xs(i).toFixed(1)},${y(T.lo[i]).toFixed(1)}`);
  el("polygon", { points: T.hi.map((v, i) => `${xs(i).toFixed(1)},${y(v).toFixed(1)}`).concat(lower).join(" "), fill: "var(--ink)", "fill-opacity": 0.55 }, svg);
  const zs = st.zs * T.rate / 1000, ze = (st.zs + st.zw) * T.rate / 1000;
  el("rect", { x: x(zs), y: m.t - 2, width: Math.max(2, x(ze) - x(zs)), height: h - m.t - m.b + 4, fill: "none", stroke: "var(--accent)", "stroke-width": 2 }, svg);
  el("rect", { x: x(0), y: m.t, width: x(T.full.length) - x(0), height: h - m.t - m.b, fill: "var(--accent)", "fill-opacity": 0.06 }, svg);
  for (let s = 0; s <= n / T.rate; s += n / T.rate > 20 ? 5 : 2) text(svg, x(s * T.rate), h - 8, `${s} s`, { "text-anchor": "middle" });
  text(svg, 4, 12, "pA");
  const hit = el("rect", { x: m.l, y: 0, width: w - m.l - m.r, height: h, fill: "transparent", style: "cursor:pointer" }, svg);
  hit.addEventListener("click", (ev) => {
    const r = svg.getBoundingClientRect(), s = ((ev.clientX - r.left - m.l) / (w - m.l - m.r)) * n / T.rate * 1000;
    if (s > 1000) return;
    st.zs = Math.max(0, Math.min(1000 - st.zw, Math.round((s - st.zw / 2) / 5) * 5)); drawZoom(); write();
  });
  tipOn(hit, `Whole read: ${num(n)} samples, ${(n / T.rate).toFixed(1)} s, ${num(T.length)} bases. Click in the first second (light band) to move the window.`);
  $("sgTrace").replaceChildren(svg);
  $("sgTraceLegend").innerHTML = [REG[0], REG[2]].map(([l, c]) => `<span><i class="sw" style="background:${c};opacity:0.35"></i>${esc(l)}</span>`).join("") + `<span>· unshaded: the genome (basecalled)</span><span>· frame: the window shown below</span><span>· detail: bases coloured by quality (viridis, Q 0-50)</span>`;
}
function drawDetail() {
  const w = width("sgDetail", 520), h = 210, m = { l: 40, r: 8, t: 26, b: 24 };
  const a = Math.round(st.zs * T.rate / 1000), b = Math.min(T.full.length, Math.round((st.zs + st.zw) * T.rate / 1000));
  const svg = el("svg", { width: w, height: h, role: "img", "aria-label": "Current, sample by sample" });
  const seg_ = T.full.slice(a, b), lo = Math.min(...seg_) - 5, hi = Math.max(...seg_) + 5;
  const x = (s) => m.l + ((s - a) / (b - a)) * (w - m.l - m.r), y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (h - m.t - m.b);
  if (a < T.ts) el("rect", { x: x(a), y: m.t, width: x(Math.min(b, T.ts)) - x(a), height: h - m.t - m.b, fill: REG[0][1], "fill-opacity": 0.18 }, svg);
  const step = Math.ceil((hi - lo) / 4 / 10) * 10;
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { el("line", { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), class: "grid" }, svg); text(svg, m.l - 4, y(v) + 4, v, { "text-anchor": "end" }); }
  const showBases = st.zw <= 200, letters = st.zw <= 50;
  if (showBases) {
    T.bounds.forEach((s, i) => {
      if (s < a || s > b || i >= T.bases.length) return;
      const e = Math.min(b, T.bounds[i + 1]), q = T.q[i];
      el("line", { x1: x(s), x2: x(s), y1: m.t - 2, y2: h - m.b, stroke: "var(--faint)", "stroke-width": 0.6 }, svg);
      const r = el("rect", { x: x(s), y: 2, width: Math.max(1, x(e) - x(s) - 0.5), height: 16, fill: viridis(Math.min(q, 50) / 50), "fill-opacity": 0.85 }, svg);
      tipOn(r, `base ${i + 1}: ${T.bases[i] === "." ? "not shown (not aligned)" : T.bases[i]}, Q ${q}, ${T.bounds[i + 1] - s} samples (${((T.bounds[i + 1] - s) / T.rate * 1000).toFixed(1)} ms)`);
      if (letters && x(e) - x(s) > 8) { const t = text(svg, (x(s) + x(e)) / 2, 14, T.bases[i], { "text-anchor": "middle", class: "mlbl" }); t.style.fill = q > 27 ? "#15212b" : "#fff"; t.style.pointerEvents = "none"; }
    });
  }
  const d = []; for (let s = a; s < b; s++) d.push(`${s === a ? "M" : "L"}${x(s).toFixed(1)},${y(T.full[s]).toFixed(1)}`);
  el("path", { d: d.join(""), fill: "none", stroke: "var(--ink)", "stroke-width": letters ? 1.2 : 0.8 }, svg);
  if (letters) for (let s = a; s < b; s++) el("circle", { cx: x(s), cy: y(T.full[s]), r: 1.6, fill: "var(--ink)" }, svg);
  const tick = st.zw >= 1000 ? 100 : st.zw >= 200 ? 20 : 5;
  for (let ms = Math.ceil(st.zs / tick) * tick; ms <= st.zs + st.zw; ms += tick) text(svg, x(ms * T.rate / 1000), h - 8, `${ms} ms`, { "text-anchor": "middle" });
  if (T.ts > a && T.ts < b) { el("line", { x1: x(T.ts), x2: x(T.ts), y1: m.t, y2: h - m.b, stroke: "var(--c7)", "stroke-width": 2 }, svg); text(svg, x(T.ts) + 4, m.t + 12, "ts: first base"); }
  $("sgDetail").replaceChildren(svg);
  $("sgTraceNote").textContent = `Window ${st.zs}-${st.zs + st.zw} ms of the read (${num(b - a)} samples). ` +
    (showBases ? `Coloured boxes: the bases by the move table, ${T.bounds.filter((s, i) => s >= a && s < b && i < T.bases.length).length} in this window; hover for quality and samples. ` : "Choose 0.2 s or 0.05 s to see the bases. ") +
    `Read of bin ${T.bin}, mean Q ${T.qs}. Bases outside the aligned part would be shown as '.'.`;
}
function drawZoom() { segShow("sgZoom", st.zw); $("sgZs").max = 1000 - st.zw; $("sgZs").value = st.zs; $("sgZsv").textContent = `${st.zs} ms`; drawTrace(); drawDetail(); }

// --- bar charts
function bars(id, values, labels, opts = {}) {
  const w = width(id), h = opts.h || 170, m = { l: 44, r: 8, t: 8, b: 34 };
  const svg = el("svg", { width: w, height: h, role: "img", "aria-label": opts.label || "Bar chart" });
  const ymax = Math.max(...values) * 1.05, bw = (w - m.l - m.r) / values.length;
  const y = (v) => h - m.b - (v / ymax) * (h - m.t - m.b);
  for (const f of [0, 0.5, 1]) { const v = ymax * f / 1.05; el("line", { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), class: "grid" }, svg); text(svg, m.l - 4, y(v) + 4, opts.fmt ? opts.fmt(v) : num(Math.round(v)), { "text-anchor": "end" }); }
  values.forEach((v, i) => {
    const r = el("rect", { x: m.l + i * bw + 0.5, y: y(v), width: Math.max(1, bw - 1), height: h - m.b - y(v), fill: opts.color || "var(--c1)" }, svg);
    tipOn(r, opts.tip ? opts.tip(i, v) : `${labels[i]}: ${num(v)}`);
    if (labels[i] !== "" && (i % (opts.every || 1) === 0)) text(svg, m.l + (i + 0.5) * bw, h - m.b + 14, labels[i], { "text-anchor": "middle" });
  });
  if (opts.xlab) text(svg, (w + m.l) / 2, h - 2, opts.xlab, { "text-anchor": "middle" });
  $(id).replaceChildren(svg);
}
function drawDwell() {
  const dw = D.dwell, s = dw.stride, tot = dw.hist.reduce((a, b) => a + b, 0), vals = [], labels = [];
  for (let k = s; k <= 60; k += s) { vals.push(dw.hist[k] / tot); labels.push(k); }
  vals.push(dw.hist[dw.hist.length - 1] / tot); labels.push(">60");
  bars("sgDwell", vals, labels, { fmt: (v) => pct(v), xlab: "samples per base (move table)", tip: (i, v) => `${labels[i]} samples${typeof labels[i] === "number" ? ` (${(labels[i] / D.source.rate * 1000).toFixed(1)} ms)` : ""}: ${pct(v, 1)} of bases`, label: "Samples per base" });
}
function drawSpeed() {
  const sp = D.speed, labels = sp.hist.map((_, i) => sp.start + i * sp.step);
  bars("sgSpeed", sp.hist, labels.map((l, i) => (i % 5 === 0 ? l : "")), { xlab: "bases per second (per read; the end bars hold all slower or faster reads)", tip: (i, v) => `${labels[i]}-${labels[i] + sp.step} bases/s: ${num(v)} reads`, color: "var(--c3)", label: "Bases per second" });
}

// --- 2. a stretch: samples, levels and bases
function drawStretch() {
  const S = D.stretches[st.stretch - 1];
  $("sgStretchPick").innerHTML = D.stretches.map((s, k) => `<button role="listitem" data-k="${k + 1}" aria-current="${k + 1 === st.stretch}">${k + 1}. ${esc(s.title)}</button>`).join("");
  const n = S.pa.length, m = { l: 40, r: 8, t: 10 }, plotH = 190, rowH = 20;
  const px = Math.max(2.2, (width("sgStretch", 520) - m.l - m.r) / n), w = m.l + m.r + n * px;
  const h = m.t + plotH + 12 + rowH * 2 + 26 + 24;
  const svg = el("svg", { width: w, height: h, role: "img", "aria-label": "Samples, levels and bases of a stretch" });
  const vals = S.pa.concat(S.expected.filter((v) => v !== null)), lo = Math.min(...vals) - 4, hi = Math.max(...vals) + 4;
  const x = (s) => m.l + s * px, y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * plotH;
  for (let v = Math.ceil(lo / 20) * 20; v <= hi; v += 20) { el("line", { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), class: "grid" }, svg); text(svg, m.l - 4, y(v) + 4, v, { "text-anchor": "end" }); }
  text(svg, 4, m.t + 8, "pA");
  S.refined.forEach((s) => el("line", { x1: x(s), x2: x(s), y1: m.t, y2: m.t + plotH, stroke: "var(--line)", "stroke-width": 1 }, svg));
  S.pa.forEach((v, i) => el("circle", { cx: x(i + 0.5), cy: y(v), r: 1.5, fill: "var(--faint)" }, svg));
  for (let i = 0; i < S.ref.length; i++) {
    const a = x(S.refined[i]), b = x(S.refined[i + 1]);
    if (S.expected[i] !== null) el("line", { x1: a, x2: b, y1: y(S.expected[i]), y2: y(S.expected[i]), stroke: "var(--c2)", "stroke-width": 2.5, "stroke-dasharray": "5 3" }, svg);
    if (S.measured[i] !== null) el("line", { x1: a, x2: b, y1: y(S.measured[i]), y2: y(S.measured[i]), stroke: "var(--ink)", "stroke-width": 2 }, svg);
  }
  // rows: reference bases on Remora's boundaries, read bases on the move table's
  const yRef = m.t + plotH + 12, yRead = yRef + rowH + 6;
  text(svg, m.l - 4, yRef + 14, "ref", { "text-anchor": "end" }); text(svg, m.l - 4, yRead + 14, "read", { "text-anchor": "end" });
  const refRead = {}; for (const [q, r] of S.ops) if (q >= 0 && r >= 0) refRead[r] = q;
  const insAfter = new Set(S.ops.filter(([q, r]) => r < 0).map(([q]) => q));
  for (let i = 0; i < S.ref.length; i++) {
    const a = x(S.refined[i]), b = x(S.refined[i + 1]), q = refRead[i];
    const missing = q === undefined, wrong = !missing && S.read[q] !== S.ref[i];
    const r = el("rect", { x: a, y: yRef, width: Math.max(1, b - a - 0.6), height: rowH, fill: missing ? "var(--v1)" : "var(--accent-soft)", stroke: "var(--line)", "stroke-width": 0.5 }, svg);
    tipOn(r, `reference base ${i + 1}: ${S.ref[i]}<br>model level ${S.expected[i] ?? "–"} pA, measured ${S.measured[i] ?? "–"} pA<br>${S.refined[i + 1] - S.refined[i]} samples (Remora)${missing ? "<br><b>missing in the read (deletion)</b>" : wrong ? `<br><b>read has ${S.read[q]}</b>` : ""}`);
    if (b - a > 8) { const t = text(svg, (a + b) / 2, yRef + 14, S.ref[i], { "text-anchor": "middle", class: "mlbl" }); t.style.fill = "var(--ink)"; t.style.pointerEvents = "none"; }
  }
  for (let i = 0; i < S.read.length; i++) {
    const a = x(S.move[i]), b = x(S.move[i + 1]), q = S.q[i], ins = insAfter.has(i);
    const r_ = Object.keys(refRead).find((k) => refRead[k] === i), wrong = r_ !== undefined && S.ref[r_] !== S.read[i];
    const r = el("rect", { x: a, y: yRead, width: Math.max(1, b - a - 0.6), height: rowH, fill: viridis(Math.min(q, 50) / 50), stroke: wrong || ins ? "var(--v1)" : "none", "stroke-width": wrong || ins ? 2.5 : 0 }, svg);
    const p = S.p6ma[i];
    tipOn(r, `read base ${i + 1}: ${S.read[i]}, Q ${q}<br>${S.move[i + 1] - S.move[i]} samples (move table)${p !== null ? `<br>6mA probability ${p.toFixed(2)}` : ""}${ins ? "<br><b>extra base (insertion)</b>" : wrong ? `<br><b>reference has ${S.ref[r_]}</b>` : ""}`);
    if (b - a > 8) { const t = text(svg, (a + b) / 2, yRead + 14, S.read[i], { "text-anchor": "middle", class: "mlbl" }); t.style.fill = q > 27 ? "#15212b" : "#fff"; t.style.pointerEvents = "none"; }
    if (p !== null && p >= 0.5) el("path", { d: `M${(a + b) / 2},${yRead + rowH + 3} l4,7 h-8 z`, fill: "var(--c3)" }, svg);
  }
  for (let ms = 0; ms * T.rate / 1000 <= n; ms += 10) text(svg, x(ms * T.rate / 1000), h - 6, `${ms} ms`, { "text-anchor": "middle" });
  $("sgStretch").replaceChildren(svg);
  $("sgStretchLegend").innerHTML = `<span><i class="sw" style="background:var(--faint)"></i>samples</span><span><i class="sw" style="background:var(--ink)"></i>measured mean per reference base</span><span><i class="sw" style="background:var(--c2)"></i>model level (9-mer table, scaled to the read)</span><span><i class="sw" style="background:${VIRIDIS[0]}"></i><i class="sw" style="background:${VIRIDIS[9]}"></i>read base quality (Q 0-50)</span><span><i class="sw" style="box-shadow:0 0 0 2px var(--v1)"></i>differs from the reference</span><span><i class="sw" style="background:var(--c3)"></i>6mA called (probability 0.5 or more)</span>`;
  const qmin = Math.min(...S.q), diffs = S.expected.map((e, i) => (e !== null && S.measured[i] !== null ? S.measured[i] - e : 0));
  const k = diffs.reduce((b, v, i) => (Math.abs(v) > Math.abs(diffs[b]) ? i : b), 0);
  $("sgStretchNote").textContent = `${S.why} Bin ${S.bin}; ${S.ref.length} reference bases, ${S.read.length} read bases, ${num(n)} samples (${(n / T.rate * 1000).toFixed(0)} ms); lowest quality Q ${qmin}. ` +
    `Largest gap between measured and model: ${diffs[k].toFixed(1)} pA at reference base ${k + 1}. Remora's boundaries can be as short as 4 samples; the move table's come in steps of ${D.dwell.stride}.`;
}

// --- model against measured
function drawScatter() {
  segShow("sgFitB", st.fitb);
  const sc = F.scatter, ys = sc[st.fitb], xs = sc.expected, w = Math.min(width("sgScatter"), 460), h = Math.min(w, 380), m = { l: 40, r: 10, t: 10, b: 34 };
  const svg = el("svg", { width: w, height: h, role: "img", "aria-label": "Measured against model level" });
  const all = xs.concat(ys).filter((v) => v !== null), lo = Math.max(-4, Math.min(...all)), hi = Math.min(4, Math.max(...all));
  const x = (v) => m.l + ((v - lo) / (hi - lo)) * (w - m.l - m.r), y = (v) => h - m.b - ((v - lo) / (hi - lo)) * (h - m.t - m.b);
  for (let v = Math.ceil(lo); v <= hi; v++) { el("line", { x1: x(v), x2: x(v), y1: m.t, y2: h - m.b, class: "grid" }, svg); el("line", { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), class: "grid" }, svg); text(svg, x(v), h - m.b + 14, v, { "text-anchor": "middle" }); text(svg, m.l - 4, y(v) + 4, v, { "text-anchor": "end" }); }
  el("line", { x1: x(lo), y1: y(lo), x2: x(hi), y2: y(hi), stroke: "var(--faint)", "stroke-dasharray": "4 3" }, svg);
  const col = st.fitb === "refined" ? "var(--c2)" : "var(--c1)";
  xs.forEach((v, i) => { if (v !== null && ys[i] !== null && ys[i] >= lo && ys[i] <= hi) el("circle", { cx: x(v), cy: y(ys[i]), r: 1.8, fill: col, "fill-opacity": 0.5 }, svg); });
  text(svg, (w + m.l) / 2, h - 2, "model level (normalised)", { "text-anchor": "middle" });
  text(svg, m.l + 4, m.t + 10, `measured, ${st.fitb === "refined" ? "refined" : "move-table"} boundaries: r = ${F.read_r[st.fitb].toFixed(3)}`);
  $("sgScatter").replaceChildren(svg);
}
function drawRHist() {
  const w = width("sgRHist"), h = 220, m = { l: 44, r: 8, t: 8, b: 34 }, [x0, x1, k] = F.hist_edges, from = 20;
  const svg = el("svg", { width: w, height: h, role: "img", "aria-label": "Correlation per read" });
  const series = [["r_move", "var(--c1)"], ["r_refined", "var(--c2)"], ["r_shuffled", "var(--c4)"]].map(([key, c]) => { const t = F[key].reduce((a, b) => a + b, 0); return [key, c, F[key].map((v) => v / t)]; });
  const ymax = Math.max(...series.flatMap((s) => s[2]));
  const bw = (x1 - x0) / k, x = (r) => m.l + ((r - from * bw) / (x1 - from * bw)) * (w - m.l - m.r), y = (v) => h - m.b - (v / ymax) * (h - m.t - m.b);
  for (const v of [0, 0.5, 1]) { el("line", { x1: m.l, x2: w - m.r, y1: y(v * ymax), y2: y(v * ymax), class: "grid" }, svg); text(svg, m.l - 4, y(v * ymax) + 4, pct(v * ymax), { "text-anchor": "end" }); }
  for (const [key, c, s] of series) {
    let d = `M${x(from * bw)},${y(0)}`;
    for (let i = from; i < k; i++) d += `L${x(i * bw)},${y(s[i])}L${x((i + 1) * bw)},${y(s[i])}`;
    const p = el("path", { d, fill: "none", stroke: c, "stroke-width": 2 }, svg);
    tipOn(p, `${key.replace("r_", "")}: median r ${F.median[key].toFixed(3)}`);
  }
  if (F.r_move.slice(0, from).some((v) => v > 0)) text(svg, m.l + 4, m.t + 10, `${num(F.r_move.slice(0, from).reduce((a, b) => a + b, 0))} reads below r = ${(from * bw).toFixed(1)} not shown`);
  for (let r = 0.4; r <= 1.0001; r += 0.1) text(svg, x(r), h - m.b + 14, r.toFixed(1), { "text-anchor": "middle" });
  text(svg, (w + m.l) / 2, h - 2, "correlation r per read (share of reads)", { "text-anchor": "middle" });
  $("sgRHist").replaceChildren(svg);
}

// --- 3. motifs
function drawMotifTable() {
  let html = `<table class="ct"><thead><tr><th>Motif</th><th>Modification</th>${D.bins.map((b) => `<th class="r">Bin ${esc(b.id)}</th>`).join("")}</tr></thead><tbody>`;
  for (const m of M) {
    html += `<tr class="click${m.motif === st.motif ? " hl" : ""}" data-motif="${m.motif}"><td>${motifHtml(m.motif, m.pos)}</td><td>${m.mod}</td>` + BINS.map((b) => {
      const v = m.bins[b], c = viridis(v.share);
      return `<td class="r sgcell" style="background:${c};color:${v.share > 0.5 ? "#15212b" : "#fff"}" title="${num(Math.round(v.share * v.calls))} of ${num(v.calls)} calls">${pct(v.share, 0)}</td>`;
    }).join("") + "</tr>";
  }
  html += `</tbody></table><p class="note">Bins: ${D.bins.map((b) => `${esc(b.id)} (${b.contigs} contig${b.contigs > 1 ? "s" : ""}, ${fmtBp(b.bp)}, GC ${b.gc}%, ${num(b.reads)} reads)`).join("; ")}. Click a motif to show its current below.</p>`;
  $("sgMotifTable").innerHTML = html;
}
function drawKmers() {
  $("sgKbin").value = st.kbin; $("sgKmod").value = st.kmod;
  const K = D.kmers[st.kbin][st.kmod];
  let html = `<table class="ct"><thead><tr><th>Sequence</th><th class="r">Length</th><th class="r">Modified</th><th class="r">Calls</th></tr></thead><tbody>`;
  for (const [s, pos, share, n] of K.top) html += `<tr><td>${motifHtml(s, pos)}</td><td class="r">${s.length}</td><td class="r">${pct(share, 0)}</td><td class="r">${num(n)}</td></tr>`;
  $("sgKmers").innerHTML = html + `</tbody></table><p class="note">Bin ${esc(st.kbin)}, ${st.kmod}: the ${K.top.length / 3} highest shares among sequences of 4, 5 and 6 bases with at least 200 calls. All ${num(K.calls)} calls of the bin: ${pct(K.all, 1)} modified.</p>`;
}
function drawProfile() {
  segShow("sgBound", st.bound); $("sgMotif").value = st.motif; $("sgSplit").checked = !!st.split;
  const m = motifOf(st.motif), mb = m.methylated_in, key = st.bound;
  const w = width("sgProfile"), h = 280, mg = { l: 50, r: 10, t: 12, b: 36 };
  const svg = el("svg", { width: w, height: h, role: "img", "aria-label": "Measured minus model around the modified base" });
  const lines = BINS.map((b) => [b, m.bins[b][key].mean]);
  const band = m.bins[mb][key];
  const extra = st.split && key === "refined" ? [["called modified", m.bins[mb].high], ["called unmodified", m.bins[mb].low]] : [];
  const all = lines.flatMap((l) => l[1]).concat(extra.flatMap((e) => e[1].mean)).concat(band.q25, band.q75);
  const lo = Math.min(...all) - 0.02, hi = Math.max(...all) + 0.02;
  const x = (o) => mg.l + ((o - OFF[0]) / (OFF.length - 1)) * (w - mg.l - mg.r), y = (v) => mg.t + (1 - (v - lo) / (hi - lo)) * (h - mg.t - mg.b);
  for (const o of [-2.5, 6.5]) el("line", { x1: x(o), x2: x(o), y1: mg.t, y2: h - mg.b, stroke: "var(--muted)", "stroke-dasharray": "4 3" }, svg);
  text(svg, x(2), mg.t + 10, "← the model's 9-mer contains the A →", { "text-anchor": "middle" });
  const step = hi - lo > 0.4 ? 0.1 : 0.05;
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { el("line", { x1: mg.l, x2: w - mg.r, y1: y(v), y2: y(v), class: "grid" }, svg); text(svg, mg.l - 4, y(v) + 4, (Math.abs(v) < 1e-9 ? 0 : v).toFixed(2), { "text-anchor": "end" }); }
  el("line", { x1: mg.l, x2: w - mg.r, y1: y(0), y2: y(0), stroke: "var(--faint)" }, svg);
  const area = OFF.map((o, i) => `${x(o)},${y(band.q75[i])}`).concat(OFF.map((o, i) => `${x(o)},${y(band.q25[i])}`).reverse());
  el("polygon", { points: area.join(" "), fill: BINCOL[mb], "fill-opacity": 0.12 }, svg);
  const path = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${x(OFF[i]).toFixed(1)},${y(v).toFixed(1)}`).join("");
  for (const [b, vals] of lines) {
    const p = el("path", { d: path(vals), fill: "none", stroke: BINCOL[b], "stroke-width": b === mb ? 3 : 1.6, opacity: b === mb ? 1 : 0.85 }, svg);
    tipOn(p, `bin ${b}${b === mb ? " (methylates " + m.motif + ")" : ""}: ${num(m.bins[b][key].n)} occurrences`);
    vals.forEach((v, i) => { const c = el("circle", { cx: x(OFF[i]), cy: y(v), r: b === mb ? 3.5 : 2.5, fill: BINCOL[b] }, svg); tipOn(c, `bin ${b}, position ${OFF[i] > 0 ? "+" : ""}${OFF[i]}: ${v.toFixed(3)} (${(v * F.scale_pa).toFixed(1)} pA)`); });
  }
  extra.forEach(([lab, pr], j) => { const p = el("path", { d: path(pr.mean), fill: "none", stroke: "var(--ink)", "stroke-width": 1.6, "stroke-dasharray": j ? "2 3" : "6 3" }, svg); tipOn(p, `bin ${mb}, ${lab}: ${num(pr.n)} occurrences`); });
  OFF.forEach((o) => text(svg, x(o), h - mg.b + 14, o > 0 ? `+${o}` : o, { "text-anchor": "middle" }));
  text(svg, (w + mg.l) / 2, h - 4, `position relative to the motif's A (${m.motif}, read direction)`, { "text-anchor": "middle" });
  text(svg, 12, (mg.t + h - mg.b) / 2, "measured minus model", { transform: `rotate(-90 12 ${(mg.t + h - mg.b) / 2})`, "text-anchor": "middle" });
  $("sgProfile").replaceChildren(svg);
  $("sgProfileLegend").innerHTML = BINS.map((b) => `<span><i class="sw" style="background:${BINCOL[b]}"></i>bin ${esc(b)}${b === mb ? " (methylates it)" : ""}</span>`).join("") +
    (extra.length ? `<span>· dashed: bin ${esc(mb)} called modified; dotted: called unmodified</span>` : "") + `<span>· shaded: middle half of bin ${esc(mb)}'s occurrences</span>`;
  const e = effect(m, key), k = e.reduce((b, v, i) => (Math.abs(v) > Math.abs(e[b]) ? i : b), 0);
  const others = BINS.filter((b) => b !== mb), spread = Math.max(...OFF.map((_, i) => Math.max(...others.map((b) => m.bins[b][key].mean[i])) - Math.min(...others.map((b) => m.bins[b][key].mean[i]))));
  $("sgProfileNote").textContent = `${m.motif} with ${key === "refined" ? "Remora's" : "the move table's"} boundaries, normalised units. Bin ${mb} against the mean of the other three: largest difference ${e[k].toFixed(3)} at position ${OFF[k] > 0 ? "+" : ""}${OFF[k]}; the other three differ from each other by at most ${spread.toFixed(3)}.` +
    (st.split && key === "refined" ? ` Split by Dorado's call in bin ${mb}: ${num(m.bins[mb].high.n)} occurrences called modified, ${num(m.bins[mb].low.n)} unmodified.` : st.split ? " The split is shown with Remora's boundaries only." : "");
  drawMl(); drawSites();
}
function drawMl() {
  const m = motifOf(st.motif), mb = m.methylated_in, w = width("sgMl"), h = 220, mg = { l: 44, r: 8, t: 8, b: 34 };
  const svg = el("svg", { width: w, height: h, role: "img", "aria-label": "Probability of 6mA at the motif's A" });
  const series = BINS.map((b) => { const v = m.bins[b], s = v.hist.map((c, i) => (i === 0 ? c + v.implicit : c) / v.calls); return [b, s]; });
  const ymax = Math.max(...series.flatMap((s) => s[1]));
  const x = (i) => mg.l + (i / 20) * (w - mg.l - mg.r), y = (v) => h - mg.b - (v / ymax) * (h - mg.t - mg.b);
  for (const f of [0, 0.5, 1]) { el("line", { x1: mg.l, x2: w - mg.r, y1: y(f * ymax), y2: y(f * ymax), class: "grid" }, svg); text(svg, mg.l - 4, y(f * ymax) + 4, pct(f * ymax), { "text-anchor": "end" }); }
  el("line", { x1: x(10), x2: x(10), y1: mg.t, y2: h - mg.b, stroke: "var(--faint)", "stroke-dasharray": "3 3" }, svg);
  for (const [b, s] of series) {
    let d = `M${x(0)},${y(0)}`; s.forEach((v, i) => { d += `L${x(i)},${y(v)}L${x(i + 1)},${y(v)}`; });
    const p = el("path", { d, fill: "none", stroke: BINCOL[b], "stroke-width": b === mb ? 3 : 1.6 }, svg);
    tipOn(p, `bin ${b}: ${num(m.bins[b].calls)} calls; ${pct(atLeast(m.bins[b].hist, 10) / m.bins[b].calls)} at 0.5 or more`);
  }
  for (let i = 0; i <= 20; i += 4) text(svg, x(i), h - mg.b + 14, (i / 20).toFixed(1), { "text-anchor": "middle" });
  text(svg, (w + mg.l) / 2, h - 2, "6mA probability (Dorado's ML tag)", { "text-anchor": "middle" });
  $("sgMl").replaceChildren(svg);
  $("sgMlLegend").innerHTML = BINS.map((b) => `<span><i class="sw" style="background:${BINCOL[b]}"></i>bin ${esc(b)}</span>`).join("") + `<span>· dashed: 0.5</span>`;
}
function drawSites() {
  const m = motifOf(st.motif), sc = m.site_check, labels = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"];
  const w = width("sgSites"), h = 200, mg = { l: 50, r: 8, t: 8, b: 34 };
  const svg = el("svg", { width: w, height: h, role: "img", "aria-label": "Methylated share per site" });
  const ymax = Math.max(...sc.observed, ...sc.expected) * 1.05, gw = (w - mg.l - mg.r) / 5, y = (v) => h - mg.b - (v / ymax) * (h - mg.t - mg.b);
  for (const f of [0, 0.5, 1]) { el("line", { x1: mg.l, x2: w - mg.r, y1: y(f * ymax / 1.05), y2: y(f * ymax / 1.05), class: "grid" }, svg); text(svg, mg.l - 4, y(f * ymax / 1.05) + 4, num(Math.round(f * ymax / 1.05)), { "text-anchor": "end" }); }
  labels.forEach((l, i) => {
    [[sc.observed[i], "var(--c1)", "observed"], [sc.expected[i], "var(--faint)", "expected"]].forEach(([v, c, lab], j) => {
      const r = el("rect", { x: mg.l + i * gw + 4 + j * (gw - 8) / 2, y: y(v), width: (gw - 8) / 2 - 2, height: h - mg.b - y(v), fill: c }, svg);
      tipOn(r, `${l} of reads called modified: ${lab} ${num(Math.round(v))} sites`);
    });
    text(svg, mg.l + (i + 0.5) * gw, h - mg.b + 14, l, { "text-anchor": "middle" });
  });
  text(svg, (w + mg.l) / 2, h - 2, "share of a site's reads called modified", { "text-anchor": "middle" });
  $("sgSites").replaceChildren(svg);
  $("sgSitesNote").textContent = `${m.motif} in bin ${m.methylated_in}: ${num(sc.sites)} sites with 3 or more reads (strands counted separately). Expected: each read's call independent, modified with the motif's pooled share (${pct(m.bins[m.methylated_in].share)}).`;
}
function drawErrors() {
  const E = D.bam.motif_errors;
  let html = `<table class="ct"><thead><tr><th>Motif</th>${BINS.map((b) => `<th class="r">Bin ${esc(b)}</th>`).join("")}</tr></thead><tbody>`;
  for (const m of M) html += `<tr><td>${motifHtml(m.motif, m.pos)}</td>` + BINS.map((b) => { const [k, n] = E[`${b}|${m.motif}`]; const own = b === m.methylated_in; return `<td class="r${own ? " sgown" : ""}" title="${num(k)} of ${num(n)} occurrences">${pct(k / n, 1)}${own ? " (methylated)" : ""}</td>`; }).join("") + "</tr>";
  $("sgErrors").innerHTML = html + "</tbody></table>";
}

// --- state
function params() {
  const p = {};
  for (const k of Object.keys(DEFAULTS)) if (st[k] !== DEFAULTS[k]) p[k] = st[k];
  if (examples.current >= 0) p.ex = examples.current + 1;
  return p;
}
const write = () => writeHashParams(params());
function applyState(s) {
  const int = (v, d, lo, hi) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= lo && n <= hi ? n : d; };
  st.zw = ZOOMS.some(([z]) => z === +s.zw) ? +s.zw : DEFAULTS.zw;
  st.zs = Math.min(int(s.zs, DEFAULTS.zs, 0, 1000), 1000 - st.zw);
  st.stretch = int(s.stretch, DEFAULTS.stretch, 1, D.stretches.length);
  st.fitb = s.fitb === "move" ? "move" : "refined";
  st.motif = M.some((m) => m.motif === s.motif) ? s.motif : DEFAULTS.motif;
  st.bound = s.bound === "move" ? "move" : "refined";
  st.split = s.split === "1" || s.split === 1 || s.split === true ? 1 : 0;
  st.kbin = BINS.includes(String(s.kbin)) ? String(s.kbin) : DEFAULTS.kbin;
  st.kmod = D.kmers[st.kbin][s.kmod] ? s.kmod : DEFAULTS.kmod;
}
function drawAll(push = true) { drawZoom(); drawStretch(); drawScatter(); drawMotifTable(); drawKmers(); drawProfile(); if (push) write(); }

function setup() {
  fillNumbers(); drawDwell(); drawSpeed(); drawRHist(); drawErrors();
  seg("sgZoom", ZOOMS, "zw", () => { st.zs = Math.min(st.zs, 1000 - st.zw); drawZoom(); });
  seg("sgFitB", BOUNDS, "fitb", drawScatter);
  seg("sgBound", BOUNDS, "bound", drawProfile);
  $("sgZs").addEventListener("input", (e) => { st.zs = +e.target.value; drawZoom(); write(); });
  $("sgStretchPick").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (b) { st.stretch = +b.dataset.k; drawStretch(); write(); } });
  $("sgMotif").innerHTML = M.map((m) => `<option value="${m.motif}">${m.motif} (${m.mod}, bin ${m.methylated_in})</option>`).join("");
  $("sgMotif").addEventListener("input", (e) => { st.motif = e.target.value; drawMotifTable(); drawProfile(); write(); });
  $("sgMotifTable").addEventListener("click", (e) => { const r = e.target.closest("[data-motif]"); if (r) { st.motif = r.dataset.motif; drawMotifTable(); drawProfile(); write(); } });
  $("sgSplit").addEventListener("input", (e) => { st.split = e.target.checked ? 1 : 0; drawProfile(); write(); });
  $("sgKbin").innerHTML = BINS.map((b) => `<option value="${b}">${b}</option>`).join("");
  $("sgKmod").innerHTML = Object.keys(D.kmers[BINS[0]]).map((k) => `<option value="${k}">${k}</option>`).join("");
  $("sgKbin").addEventListener("input", (e) => { st.kbin = e.target.value; drawKmers(); write(); });
  $("sgKmod").addEventListener("input", (e) => { st.kmod = e.target.value; drawKmers(); write(); });
  $("sgCopy").addEventListener("click", async () => {
    write();
    let ok = true; try { await navigator.clipboard.writeText(location.href); } catch (e) { ok = false; }
    $("sgCopied").textContent = ok ? "Copied." : "Copy the address from the browser bar.";
    setTimeout(() => { $("sgCopied").textContent = ""; }, 2500);
  });
}
const examples = setupExamples($("sgExamples"), (k) => { applyState(EXAMPLES[k].state); drawAll(); });
setup();
(function start() {
  const s = readHashParams(), ex = parseInt(s.ex, 10);
  if (ex >= 1 && ex <= EXAMPLES.length) { examples.current = ex - 1; examples.draw(); applyState({ ...EXAMPLES[ex - 1].state, ...s }); }
  else applyState(s);
  drawAll(false);
})();
let resizeTimer;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { drawDwell(); drawSpeed(); drawRHist(); drawAll(false); }, 150); });
