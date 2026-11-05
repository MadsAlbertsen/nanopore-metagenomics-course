// Group 2 presentation. Chart code copied from the group's article (articles/group2/project.js: drawFig2, forest = Fig. 4a,
// drawFig5, drawFig8) and, for the second Fig. 8 heatmap (other capabilities), from the group's report (projects/group2/project.js).
// Data: slides/group2/data.json, taken from those data files; every number on the slides comes from DATA.numbers.
const D = DATA, N = D.numbers;
document.querySelectorAll("[data-n]").forEach((e) => { const v = N[e.dataset.n]; e.textContent = v === undefined ? "?" : e.dataset.d !== undefined ? Number(v).toFixed(+e.dataset.d) : String(v); });
const SWITCH = [{ x: 5.5, label: "diet switch" }];
const PHYLA = D.phyla.map((p) => p.name);
const phylumColor = (p) => `var(--c${(PHYLA.includes(p) ? PHYLA.indexOf(p) : PHYLA.indexOf("Other phyla")) + 1})`;

// Fig. 2a heatmap and 2b PCoA
{
  const vals = D.bc.values.map((row, i) => row.map((v, j) => (i === j ? null : v)));
  heatmap($("g2Heat"), { rows: D.bc.days, cols: D.bc.days, values: vals, label: "Bray-Curtis dissimilarity", format: (v) => (v === null ? "–" : v.toFixed(2)), cell: 18, colLabelHeight: 36 });
  scatter($("g2Pcoa"), { points: D.pcoa.map((p) => ({ x: p.x, y: p.y, label: `Day ${p.day}`, group: p.period })), labelled: true, height: 250,
    xLabel: `PCoA axis 1 (${N.pc1}%)`, yLabel: `PCoA axis 2 (${N.pc2}%)`, xFmt: (v) => v.toFixed(2), yFmt: (v) => v.toFixed(2) });
}

// Fig. 4a forest plot, split into the falling and the rising MAGs (same x axis)
function forest(host, rows, xr, rowH) {
  return mountChart(host, () => {
    const top = 8, bottom = 40;
    const { svg, W } = newSvg(host, top + rows.length * rowH + bottom);
    const labW = Math.min(215, W * 0.5), maxCh = Math.floor((labW - 8) / 5.6);
    const box = { l: labW, r: W - 10, t: top, b: top + rows.length * rowH };
    const x = scale(xr[0], xr[1], box.l + 6, box.r);
    axes(svg, x, () => 0, box, { xLabel: "log2 change, days 6-10 / days 1-5", xTicks: x.ticks(5), yTicks: [] });
    for (const t of [-1, 0, 1]) el("line", { x1: x(t), x2: x(t), y1: box.t, y2: box.b, class: t === 0 ? "base" : "mark" }, svg);
    rows.forEach((m, i) => {
      const y = top + i * rowH + rowH / 2, color = phylumColor(m.phylum);
      const name = m.name.length > maxCh ? m.name.slice(0, maxCh - 1) + "…" : m.name;
      el("text", { x: box.l - 6, y: y + 4, "text-anchor": "end", class: "dlab", style: "font-size:11px" }, svg).textContent = name;
      el("line", { x1: x(m.lo), x2: x(m.hi), y1: y, y2: y, style: `stroke:${color};stroke-width:2` }, svg);
      const c = el("circle", { cx: x(m.log2), cy: y, r: 3.8, class: "dot", style: m.stays ? `fill:${color};stroke:${color}` : `fill:var(--surface);stroke:${color};stroke-width:1.6` }, svg);
      tipOn(c, `<b>${esc(m.name)}</b><br>${esc(m.phylum)}, ${esc(m.quality)}<br>log2 change ${m.log2.toFixed(2)} (interval ${m.lo.toFixed(2)} to ${m.hi.toFixed(2)})`);
    });
  });
}
{
  const big = D.mags.filter((m) => m.big).sort((a, b) => a.log2 - b.log2);
  const all = big.flatMap((m) => [m.lo, m.hi, m.log2]).concat([-1, 1]);
  const pad = (Math.max(...all) - Math.min(...all)) * 0.04, xr = [Math.min(...all) - pad, Math.max(...all) + pad];
  forest($("g2ForestDown"), big.filter((m) => m.log2 < 0), xr, 15);
  forest($("g2ForestUp"), big.filter((m) => m.log2 > 0), xr, 11.5);
  const seen = [...new Set(big.map((m) => (PHYLA.includes(m.phylum) ? m.phylum : "Other phyla")))];
  chartLegend($("g2ForestLeg"), seen.map((p) => ({ name: p, color: phylumColor(p) })));
}

// Fig. 5a (all degrading CAZyme genes per day) and 5b (the MAGs that add most to the change)
{
  lineChart($("g2CzLine"), { x: D.days, series: [{ name: "All CAZyme genes", values: D.cazy.per_day.all }], xLabel: "Day", xName: "Day", height: 250,
    yLabel: "Genes per 1,000 genes", unit: "per 1,000 genes", marks: SWITCH, zero: true });
  const host = $("g2CzBar"), top = D.cazy.top.all;
  barChart(host, { labels: top.map((t) => t.name), values: top.map((t) => t.value), horizontal: true, colors: top.map((t) => phylumColor(t.phylum)), height: 230,
    yLabel: "Contribution (genes per 1,000 genes)", fmt: (v) => v.toFixed(2) });
  const seen = [...new Set(top.map((t) => (PHYLA.includes(t.phylum) ? t.phylum : "Other phyla")))];
  chartLegend(host, seen.map((p) => ({ name: p, color: phylumColor(p) })));
}

// Fig. 8: curated features with q < 0.1 (metabolic potential on top, other capabilities below), fallers then risers.
// Row labels are padded to one width so the columns of the two heatmaps line up; the lower one has no column labels.
{
  const shortMag = (s) => { const w = s.split(" "); return `${w[0]} ${w[1]} ${w[w.length - 1]}`; };
  const shortFeat = (f) => f.replace(/ \(per 1,000 genes\)$/, "").replace(/^CAZy family (.+)$/, "$1 (CAZy family)").replace(/^CAZyme genes: (.+)$/, "$1 CAZyme genes").split(":")[0].replace("Sugar phosphotransferase system (PTS)", "PTS sugar uptake").replace("SusC/SusD outer-membrane glycan uptake", "SusC/SusD glycan uptake").replace("Sporulation (stage II-V, coat, germination)", "Sporulation").replace("Multidrug efflux and named resistance genes", "Efflux and resistance").replace("CRISPR-associated proteins", "CRISPR-associated");
  const gap = D.traits_heat.mags.findIndex((mg) => mg.startsWith("↑"));
  const ins = (a, v) => [...a.slice(0, gap), v, ...a.slice(gap)];
  const sel = (area) => D.traits_heat.rows.filter((r) => r.area === area);
  const lab = (r) => `${shortFeat(r.feature)} · q ${r.q}`;
  const W = Math.max(...D.traits_heat.rows.map((r) => lab(r).length));
  const pad = (s) => " ".repeat(W - s.length) + s;
  const draw = (id, area, cols, top) => {
    const rows = sel(area);
    heatmap($(id), { rows: rows.map((r) => pad(lab(r))), cols, values: rows.map((r) => ins(r.scaled, null)), cell: 9, colLabelHeight: top, min: 0, max: 1,
      label: "Relative to the row maximum (markers: 1 = present)", format: (v) => (v === null ? "–" : v.toFixed(2)) });
  };
  draw("g2Met", "metabolic", ins(D.traits_heat.mags.map(shortMag), " "), 104);
  draw("g2Oth", "other", ins(D.traits_heat.mags.map(() => ""), " "), 4);
}
