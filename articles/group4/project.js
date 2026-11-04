// Group 4 article: four figures, one per finding. DATA is a subset of projects/group4/data.json (the report);
// every number in the text comes from DATA.numbers (data-n).
const D = DATA, N = D.numbers;
for (const e of document.querySelectorAll("[data-n]")) {
  const v = N[e.dataset.n];
  if (v === undefined) throw new Error(`no number ${e.dataset.n} in data.json`);
  const s = typeof v !== "number" || e.dataset.d === undefined ? String(v) : v.toFixed(+e.dataset.d);
  e.textContent = e.dataset.sign && typeof v === "number" && v > 0 ? "+" + s : s;
}
const legend = (id, items) => { const h = $(id); h.innerHTML = ""; chartLegend(h, items); };
const SWITCH = [{ x: 5.5, label: "diet switch" }];

// Supplementary Figure S1: each substrate group per day as a percent of its days 1-5 mean (the report's Figure 1, "Relative to days 1-5")
function figS1() {
  const series = D.categories.map((c) => {
    const m = c.values.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    return { name: c.name, values: c.values.map((v) => (100 * v) / m) };
  });
  lineChart($("a4S1"), { x: D.days, series, xLabel: "Day", xName: "Day", unit: "%",
    yLabel: "Percent of the days 1-5 mean (%)", marks: SWITCH, zero: false });
}
// Figure 1a: drift line, each day's Bray-Curtis to the days 1-5 mean, species mix and CAZyme profile on one axis
function fig1a() {
  lineChart($("a4F1a"), { x: D.days, series: [{ name: "species mix", values: D.to_first.taxa, color: "var(--c1)" },
    { name: "CAZyme genes", values: D.to_first.functions, color: "var(--c3)" }],
    xLabel: "Day", xName: "Day", yLabel: "Bray-Curtis to the days 1-5 mean", marks: SWITCH, zero: true, height: 300 });
}
// Figure 1b: PCoA of the species mix, days joined in order
function fig1b() {
  const P = D.pcoa.taxa;
  mountChart($("a4F1b"), () => {
    const host = $("a4F1b");
    const { svg, W, H } = newSvg(host, 300);
    const box = { l: 60, r: W - 16, t: 14, b: H - 44 };
    const [x0, x1] = extent(P.pts.map((p) => p.x), { pad: 0.12 }), [y0, y1] = extent(P.pts.map((p) => p.y), { pad: 0.12 });
    const x = scale(x0, x1, box.l, box.r), y = scale(y0, y1, box.b, box.t);
    axes(svg, x, y, box, { xLabel: `PCoA axis 1 (${P.var[0].toFixed(0)}% of the variation)`, yLabel: `Axis 2 (${P.var[1].toFixed(0)}%)`,
      xTicks: x.ticks(6), yTicks: y.ticks(5), xFmt: (v) => v.toFixed(2), yFmt: (v) => v.toFixed(2) });
    const col = (p) => (p.period === "Days 1-5" ? "var(--c1)" : "var(--c3)");
    for (let i = 1; i < P.pts.length; i++) {
      const a = P.pts[i - 1], b = P.pts[i];
      el("line", { x1: x(a.x), y1: y(a.y), x2: x(b.x), y2: y(b.y), style: `stroke:${col(b)}`, "stroke-width": 1.6, opacity: 0.6 }, svg);
    }
    for (const p of P.pts) {
      const c = el("circle", { cx: x(p.x), cy: y(p.y), r: 5, style: `fill:${col(p)}`, class: "dot" }, svg);
      tipOn(c, `<b>Day ${p.day}</b><br>${esc(p.period)}`);
      el("text", { x: x(p.x) + 7, y: y(p.y) - 6, class: "dlab" }, svg).textContent = String(p.day);
    }
    chartLegend(host, [{ name: "Days 1-5", color: "var(--c1)" }, { name: "Days 6-10", color: "var(--c3)" }]);
  });
}
// Figure 1c: the report's redundancy scatter (carriers against day-to-day CV) with the median common MAG as a reference line
function fig1c() {
  const host = $("a4F1c"), pts = D.redundancy;
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 300);
    const box = { l: 56, r: W - 12, t: 14, b: H - 44 };
    const [x0, x1] = extent(pts.map((p) => p.carriers), { log: true }), [y0, y1] = extent(pts.map((p) => p.cv).concat([N.mag_cv_median]));
    const x = scale(x0, x1, box.l, box.r, true), y = scale(y0, y1, box.b, box.t);
    axes(svg, x, y, box, { xLabel: "Common MAGs carrying the family (log scale)", yLabel: "Day-to-day variation (CV, %)", xTicks: x.ticks(), yTicks: y.ticks(5) });
    el("line", { x1: box.l, x2: box.r, y1: y(N.mag_cv_median), y2: y(N.mag_cv_median), class: "mark" }, svg);
    el("text", { x: box.r - 4, y: y(N.mag_cv_median) - 5, "text-anchor": "end", class: "note" }, svg).textContent = "median common MAG";
    for (const p of pts) {
      const c = el("circle", { cx: x(p.carriers), cy: y(p.cv), r: 3.6, style: "fill:var(--c3)", class: "dot" }, svg);
      tipOn(c, `<b>${esc(p.family)}</b><br>carried by ${p.carriers} common MAGs<br>variation ${p.cv}%<br>${p.mean} genes per 1,000 genes`);
    }
  });
}
// Figure 2a: share of the species-mix change and of the CAZyme-profile change, by family
function fig2a() {
  const F = D.drivers.families.slice(0, 6);
  barChart($("a4F2a"), { labels: F.map((f) => f.family), horizontal: true, height: 360,
    groups: [{ name: "species-mix change", values: F.map((f) => f.sp) }, { name: "CAZyme-profile change", values: F.map((f) => f.gp) }],
    yLabel: "Share of the change between the periods (%)", unit: "%", fmt: (v) => v.toFixed(0) });
}
// Figure 2b: the report's bubble plot (Figure 7): MAGs ordered by log2 change, four substrate groups, bubble area = genes per 1,000 genes of the MAG
function fig2b() {
  const B = D.bubble, cols = ["Plant fibre", "Starch", "Fructan", "Host glycans"], nc = cols.length;
  const colr = (m) => (m.phylum === "Bacteroidota" ? "var(--c1)" : m.phylum === "Bacillota" ? "var(--c2)" : "var(--faint)");
  const lab = (m) => { const s = `${m.family}: ${m.name.replace(/ \(.*\)$/, "")}`; return s.length > 40 ? s.slice(0, 39) + "…" : s; };
  const vmax = Math.max(...B.mags.flatMap((m) => m.v.slice(0, nc)), ...B.rows.slice(0, 2).flatMap((r) => r.v.slice(0, nc)));
  const host = $("a4F2b");
  host.style.overflowX = "auto";
  mountChart(host, () => {
    host.innerHTML = "";
    const inner = document.createElement("div");
    host.appendChild(inner);
    const rowH = 21, colW = 62, labW = 270, barW = 110, top = 34, nm = B.mags.length, gap = 20;
    const W = labW + colW * nc + barW + 30, H = top + nm * rowH + gap + 2 * rowH + 64;
    inner.style.minWidth = W + "px";
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img" }, inner);
    const x0 = labW, r = (v) => 9.5 * Math.sqrt(v / vmax), bx = x0 + colW * nc + 14, bscale = (v) => (v / 5) * (barW / 2);
    cols.forEach((c, j) => el("text", { x: x0 + colW * (j + 0.5), y: top - 10, "text-anchor": "middle", class: "dlab" }, svg).textContent = c);
    el("text", { x: 4, y: top - 10, class: "dlab" }, svg).textContent = "Family: MAG";
    el("text", { x: bx + barW / 2, y: top - 10, "text-anchor": "middle", class: "dlab" }, svg).textContent = "log2 change";
    const rowY = (i) => top + i * rowH + rowH / 2;
    B.mags.forEach((m, i) => {
      const y = rowY(i), g = el("g", {}, svg);
      if (i === 20) el("line", { x1: 0, x2: W, y1: top + i * rowH, y2: top + i * rowH, class: "mark", "stroke-dasharray": "3 3" }, svg);
      el("text", { x: 4, y: y + 4, class: "dlab", style: `fill:${colr(m)}` }, g).textContent = lab(m);
      m.v.slice(0, nc).forEach((v, j) => {
        const c = el("circle", { cx: x0 + colW * (j + 0.5), cy: y, r: Math.max(v > 0 ? 1.5 : 0.8, r(v)), style: `fill:${v > 0 ? colr(m) : "none"};stroke:${v > 0 ? "none" : "var(--line)"};fill-opacity:.85` }, g);
        tipOn(c, `<b>${esc(m.name)}</b><br>${esc(m.family)} (${esc(m.phylum)})<br>${cols[j]}: ${v.toFixed(1)} genes per 1,000 genes of the MAG<br>log2 change ${m.log2.toFixed(2)}`);
      });
      const bar = el("rect", { x: Math.min(bx + barW / 2, bx + barW / 2 + bscale(m.log2)), y: y - 5, width: Math.abs(bscale(m.log2)), height: 10, style: "fill:var(--muted)" }, g);
      tipOn(bar, `<b>${esc(m.name)}</b><br>log2 change ${m.log2.toFixed(2)}`);
    });
    el("line", { x1: bx + barW / 2, x2: bx + barW / 2, y1: top, y2: top + nm * rowH, class: "mark" }, svg);
    [-4, -2, 0, 2, 4].forEach((t) => el("text", { x: bx + barW / 2 + bscale(t), y: top + nm * rowH + 12, "text-anchor": "middle", class: "dlab" }, svg).textContent = t);
    const y0 = top + nm * rowH + gap;
    el("line", { x1: 0, x2: W, y1: y0 - 4, y2: y0 - 4, class: "mark" }, svg);
    B.rows.slice(0, 2).forEach((row, i) => {
      const y = y0 + i * rowH + rowH / 2;
      el("text", { x: 4, y: y + 4, class: "dlab", style: "font-weight:600" }, svg).textContent = `Community, ${row.label} (weighted)`;
      row.v.slice(0, nc).forEach((v, j) => {
        const c = el("circle", { cx: x0 + colW * (j + 0.5), cy: y, r: r(v), style: "fill:var(--ink);fill-opacity:.55" }, svg);
        tipOn(c, `<b>Community, ${row.label}</b><br>${cols[j]}: ${v.toFixed(2)} genes per 1,000 genes (each MAG weighted by its share of the DNA times its number of genes)`);
      });
    });
    const ly = y0 + 2 * rowH + 22;
    let lx = 4;
    for (const [t, c] of [["Bacillota", "var(--c2)"], ["Bacteroidota", "var(--c1)"], ["other phyla", "var(--faint)"]]) {
      el("circle", { cx: lx + 6, cy: ly, r: 5, style: `fill:${c}` }, svg);
      el("text", { x: lx + 15, y: ly + 4, class: "dlab" }, svg).textContent = t;
      lx += 26 + t.length * 5.6;
    }
    for (const v of [1, 10, 40]) {
      el("circle", { cx: lx + 12, cy: ly, r: r(v), style: "fill:none;stroke:var(--muted)" }, svg);
      el("text", { x: lx + 12 + r(v) + 3, y: ly + 4, class: "dlab" }, svg).textContent = v;
      lx += 22 + r(v) * 2 + 8;
    }
    el("text", { x: lx + 4, y: ly + 4, class: "dlab" }, svg).textContent = "genes per 1,000 genes of the MAG";
  });
}
// Figure 2c: the report's strain scatter (Figure 8): variant sites against day-to-day variation
function fig2c() {
  const col = (r) => (r.log2 >= 1 ? "var(--c2)" : r.log2 <= -1 ? "var(--c1)" : "var(--faint)");
  scatter($("a4F2c"), { points: D.strains.map((r) => ({ x: r.var, y: r.cv, label: r.name, color: col(r), extra: `${r.phylum} · change log2 ${r.log2}` })),
    logX: true, xLabel: "Variant sites (% of the MAG's positions, log scale)", yLabel: "Day-to-day variation (CV, %)", height: 330 });
  legend("a4F2cLeg", [{ name: "rose at least 2-fold", color: "var(--c2)" }, { name: "fell at least 2-fold", color: "var(--c1)" }, { name: "less than 2-fold", color: "var(--faint)" }]);
}
function drawAll() { fig1a(); fig1b(); fig1c(); fig2a(); fig2b(); fig2c(); figS1(); }
drawAll();
