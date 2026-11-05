// Numbers (data-n), slide 4 depth chart (Figure 1 of Revision 1, articles/group5-r1), slide 5 chart (Figure 1 of the group's article: articles/group5/project.js drawCtx, adapted to the slide size)
const D = DATA, N = D.numbers;
// numbers for slides 7 (abundance): derived from the three Bifidobacterium MAGs in data.json (shares in %)
{
  const [ang, ado, lon] = D.mags;
  const peak = (m) => { const v = Math.max(...m.share); return [v, D.days[m.share.indexOf(v)]]; };
  [N.a_peak, N.a_peak_day] = peak(ang); [N.d_peak, N.d_peak_day] = peak(ado); [N.l_peak, N.l_peak_day] = peak(lon);
  N.a_high = ang.mean_high; N.a_low = ang.mean_low;
  N.a_peak = N.a_peak.toFixed(2); N.d_peak = N.d_peak.toFixed(2); N.l_peak = N.l_peak.toFixed(3);
  N.a_high = N.a_high.toFixed(2); N.a_low = N.a_low.toFixed(2);
}
document.querySelectorAll("[data-n]").forEach((e) => { e.textContent = N[e.dataset.n] ?? "?"; });
const CTX = [["hq", "HQ MAGs", "var(--c1)"], ["mq", "MQ MAGs", "var(--c3)"], ["unbinned", "Unbinned contigs", "var(--c4)"], ["off", "Not on the assembly", "var(--c2)"]];
function drawCtx() {
  const host = $("g5Ctx"), S = D.context;
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 270);
    const box = { l: 52, r: W - 8, t: 22, b: H - 44 };
    const n = S.length, band = (box.r - box.l) / n, bw = band * 0.72;
    const y = scale(0, 100, box.b, box.t);
    axes(svg, () => 0, y, box, { yLabel: "Share of the filtered bases (%)", xTicks: [], yTicks: y.ticks(5) });
    const hi = S.filter((s) => s.diet === "high_carb").length;
    el("text", { x: box.l + (band * hi) / 2, y: box.t - 8, "text-anchor": "middle", class: "note" }, svg).textContent = "high carb";
    el("text", { x: box.l + band * (hi + (n - hi) / 2), y: box.t - 8, "text-anchor": "middle", class: "note" }, svg).textContent = "low carb";
    S.forEach((s, i) => {
      const xc = box.l + band * (i + 0.5);
      let acc = 0;
      for (const [k, name, color] of CTX) {
        const v = s[k];
        const rect = el("rect", { x: xc - bw / 2, y: y(acc + v), width: bw, height: y(acc) - y(acc + v), style: `fill:${color}` }, svg);
        tipOn(rect, `<b>${esc(s.sample)} · day ${s.day}</b> (${s.gbp.toFixed(2)} Gbp)<br>${esc(name)}: ${v.toFixed(1)}%`);
        acc += v;
      }
      el("text", { x: xc, y: box.b + 16, "text-anchor": "middle" }, svg).textContent = String(s.day);
    });
    el("line", { x1: box.l + band * hi, x2: box.l + band * hi, y1: box.t, y2: box.b, class: "mark" }, svg);
    el("text", { x: (box.l + box.r) / 2, y: box.b + 34, "text-anchor": "middle", class: "lab" }, svg).textContent = "Day";
    chartLegend(host, CTX.map(([, name, color]) => ({ name, color })));
  });
}
drawCtx();

// Slide 6: gene map (adapted from articles/group5/project.js drawMap; simplified colours, no labels)
const MAP = D.map, ML = MAP.length;
const gFam = (g) => (g[7] >= 0 ? MAP.families[g[7]] : "");
const gRole = (g) => (g[9] >= 0 ? MAP.roles[g[9]] : "");
const isGH13 = (g) => gRole(g) === "degrading" && /(^| )GH13( |$)/.test(gFam(g));
const GC = [
  ["GH13", "var(--c2)", (g) => isGH13(g)],
  ["Other degrading enzyme", "var(--c1)", (g) => gRole(g) === "degrading"],
  ["Other carbohydrate gene", "var(--c3)", (g) => gRole(g) !== ""],
  ["Other gene", "var(--v4)", () => true],
];
const gColor = (g) => GC.find(([, , f]) => f(g))[1];
const arcP = (cx, cy, r0, r1, a0, a1) => {
  const p = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)}A${r1},${r1} 0 ${large} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0},${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
};
function drawMap() {
  const host = $("g5Map");
  mountChart(host, () => {
    const W = Math.min(250, Math.max(220, host.clientWidth || 300)), H = W;
    host.innerHTML = "";
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Circular gene map" }, host);
    const cx = W / 2, cy = H / 2, R = W / 2 - 6;
    const ang = (pos) => (pos / ML) * 2 * Math.PI - Math.PI / 2;
    el("circle", { cx, cy, r: R - 15, fill: "none", class: "base" }, svg);
    for (const g of MAP.genes) {
      const a0 = ang(g[0]), a1 = Math.max(ang(g[1]), a0 + 0.005);
      const [r0, r1] = g[2] > 0 ? [R - 14, R] : [R - 32, R - 18];
      const p = el("path", { d: arcP(cx, cy, r0, r1, a0, a1), style: `fill:${gColor(g)}` }, svg);
      const name = gFam(g) || (g[4] >= 0 ? MAP.products[g[4]] : "");
      tipOn(p, `<b>${esc(name)}</b><br>position ${g[0].toLocaleString("en-US")}-${g[1].toLocaleString("en-US")}`);
    }
    [[D.focus.name.replace(/ \(.*\)$/, "").replace(/^Bifidobacterium /, "B. "), "lab"], [`${(ML / 1e6).toFixed(2)} Mb`, ""]]
      .forEach(([t, c], i) => { el("text", { x: cx, y: cy - 6 + i * 18, "text-anchor": "middle", class: c }, svg).textContent = t; });
  });
}
drawMap();
$("g5Legend").innerHTML = GC.map(([name, color, f]) => `<span><i class="sw" style="background:${color}"></i>${esc(name)}${f === GC[3][2] ? "" : " (" + MAP.genes.filter((g) => GC.find(([, , ff]) => ff(g)) === GC.find(([n]) => n === name)).length + ")"}</span>`).join("");

// Slide 4: sequencing depth (Figure 1 of Revision 1 (Claude): articles/group5-r1/project.js drawDepth; same numbers as the context table)
barChart($("g5Depth"), { labels: D.days.map((d) => `Day ${d}`), values: D.context.map((r) => r.gbp), yLabel: "Filtered bases (Gbp)", unit: "Gbp", fmt: (v) => v.toFixed(1), height: 270 });

// Slide 7: share of the three Bifidobacterium MAGs over the ten days, diet periods shaded
lineChart($("g5Line"), {
  x: D.days, xLabel: "Day", xName: "Day", yLabel: "Share of the sequenced bases (%)", unit: "%", height: 290, yFmt: (v) => String(+v.toPrecision(2)),
  series: [
    { name: "B. angulatum", values: D.mags[0].share, color: "var(--c2)" },
    { name: "B. adolescentis", values: D.mags[1].share, color: "var(--c1)" },
    { name: "B. longum", values: D.mags[2].share, color: "var(--c3)" },
  ],
  bands: [{ from: 1, to: 5.5, label: "high carbohydrate" }, { from: 5.5, to: 10, label: "low carbohydrate" }], marks: [{ x: 5.5 }],
});

// Slide 8: number of rising MAGs per day (days 5-10), day 5 highlighted
barChart($("g5Risers"), { labels: D.day5.counts.map((c) => `Day ${c.day}`), values: D.day5.counts.map((c) => c.risers),
  yLabel: `Rising MAGs (of ${N.d5_eligible})`, unit: "MAGs", fmt: (v) => String(Math.round(v)), height: 270,
  colors: D.day5.counts.map((c) => (c.day === 5 ? "var(--c2)" : "var(--v4)")) });
