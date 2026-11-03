// Report template: one call per figure (shared/charts.js); guided examples set the page state. DATA from data.json.
const D = DATA;
const st = { highlight: null };

function stats() {
  const items = [[D.series.length, "MAGs followed"], [D.days.length, "days"], [D.points.length, "points in Figure 3"]];
  $("pjStats").innerHTML = items.map(([n, t]) => `<div class="stat"><b>${n}</b><span>${esc(t)}</span></div>`).join("");
}

function drawAll() {
  lineChart($("pjLine"), {
    x: D.days, series: D.series, xLabel: "Day", xName: "Day", yLabel: "Share of the sample's bases (%)", unit: "%",
    marks: [{ x: 5.5, label: "diet switch" }], highlight: st.highlight,
  });
  barChart($("pjBar"), { labels: D.bars.labels, groups: D.bars.groups, yLabel: "Genes per MAG", unit: "genes" });
  scatter($("pjScatter"), {
    points: D.points.map((p) => ({ ...p, size: p.label === st.highlight ? 7 : 4.5 })),
    xLabel: "Mean share (%)", yLabel: "CAZyme genes", logX: true, labelled: true,
  });
  heatmap($("pjHeat"), { ...D.heat, label: "log2 change", diverging: true, format: (v) => (v === null ? "–" : v.toFixed(2)) });
  table($("pjTable"), {
    columns: [{ key: "mag", label: "MAG" }, { key: "genus", label: "Genus" }, { key: "mean", label: "Mean share (%)", num: true }, { key: "change", label: "log2 change", num: true }],
    rows: D.table, filter: true, sortKey: "mean",
  });
}

const applyState = (s) => { st.highlight = s.highlight || null; };
const examples = setupExamples($("pjExamples"), (k) => {
  applyState(EXAMPLES[k].state);
  drawAll();
  writeHashParams({ ex: k + 1 });
});
stats();
(function start() {
  const ex = parseInt(readHashParams().ex, 10);
  if (ex >= 1 && ex <= EXAMPLES.length) { examples.current = ex - 1; examples.draw(); applyState(EXAMPLES[ex - 1].state); }
  drawAll();
})();
