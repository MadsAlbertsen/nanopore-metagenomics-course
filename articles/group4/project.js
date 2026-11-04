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

// Figure 1a: Bray-Curtis of each day to the days 1-5 mean (species mix)
function fig1a() {
  lineChart($("a4F1a"), { x: D.days, series: [{ name: "species mix", values: D.to_first.taxa, color: "var(--c1)" }],
    xLabel: "Day", xName: "Day", yLabel: "Bray-Curtis to the days 1-5 mean", marks: SWITCH, zero: true });
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
// Figure 2a: the same distance for the species mix and the CAZyme gene profile
function fig2a() {
  lineChart($("a4F2a"), { x: D.days, series: [{ name: "species mix", values: D.to_first.taxa, color: "var(--c1)" },
    { name: "CAZyme genes", values: D.to_first.functions, color: "var(--c3)" }],
    xLabel: "Day", xName: "Day", yLabel: "Bray-Curtis to the days 1-5 mean", marks: SWITCH, zero: true });
}
// Figure 2b: how many MAGs carry a CAZy family against its day-to-day variation
function fig2b() {
  scatter($("a4F2b"), { points: D.redundancy.map((r) => ({ x: r.carriers, y: r.cv, label: r.family, color: "var(--c3)", extra: `${r.mean} genes per 1,000 genes` })),
    xLabel: "Common MAGs carrying the family (log scale)", yLabel: "Day-to-day variation (CV, %)", logX: true, height: 300 });
}
// Figure 3a: share of the species-mix change and of the gene-profile change by family
function fig3a() {
  const F = D.drivers.families.slice(0, 6);
  barChart($("a4F3a"), { labels: F.map((f) => f.family), horizontal: true, height: 330,
    groups: [{ name: "species-mix change", values: F.map((f) => f.sp) }, { name: "CAZyme-profile change", values: F.map((f) => f.gp) }],
    yLabel: "Share of the change between the periods (%)", unit: "%", fmt: (v) => v.toFixed(0) });
}
// Figure 3b: CAZyme genes of the MAG against its change (the 25 MAGs of the report's bubble plot)
function fig3b() {
  const col = (m) => (m.family === "Lachnospiraceae" ? "var(--c2)" : m.phylum === "Bacteroidota" ? "var(--c1)" : "var(--faint)");
  scatter($("a4F3b"), { points: D.bubble.mags.map((m) => ({ x: m.v.slice(0, 4).reduce((a, b) => a + b, 0), y: m.log2, label: m.name, color: col(m),
    extra: `${m.family}${m.stable ? " (stable reference)" : ""}` })),
    xLabel: "CAZyme genes of the MAG (per 1,000 genes)", yLabel: "Change, log2 (days 7-10 over days 1-6)", yFmt: (v) => v.toFixed(0), height: 330 });
  legend("a4F3bLeg", [{ name: "Lachnospiraceae", color: "var(--c2)" }, { name: "Bacteroidota", color: "var(--c1)" }, { name: "other", color: "var(--faint)" }]);
}
// Figure 4a: variant sites against day-to-day variation
function fig4a() {
  const col = (r) => (r.log2 >= 1 ? "var(--c2)" : r.log2 <= -1 ? "var(--c1)" : "var(--faint)");
  scatter($("a4F4a"), { points: D.strains.map((r) => ({ x: r.var, y: r.cv, label: r.name, color: col(r), extra: `${r.phylum} · change log2 ${r.log2}` })),
    logX: true, xLabel: "Variant sites (% of the MAG's positions, log scale)", yLabel: "Day-to-day variation (CV, %)", height: 330 });
  legend("a4F4aLeg", [{ name: "Rose at least 2-fold", color: "var(--c2)" }, { name: "Fell at least 2-fold", color: "var(--c1)" }, { name: "less than 2-fold", color: "var(--faint)" }]);
}
// Figure 4b: how many MAGs rose or fell at least 2-fold, by third of the variant sites
function fig4b() {
  const T = D.thirds;
  barChart($("a4F4b"), { labels: ["Fewest variant sites", "Middle", "Most variant sites"], height: 330,
    groups: [{ name: "fell at least 2-fold", values: T.map((t) => t.down) }, { name: "rose at least 2-fold", values: T.map((t) => t.up) }],
    colors: undefined, yLabel: "MAGs (count)", fmt: (v) => v.toFixed(0) });
}
function drawAll() { fig1a(); fig1b(); fig2a(); fig2b(); fig3a(); fig3b(); fig4a(); fig4b(); }
drawAll();
