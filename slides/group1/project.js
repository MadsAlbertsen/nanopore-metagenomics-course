// Group 1 deck: data from articles/group1/data.json (Bray-Curtis table, distances to reference days, settled days).
const D = DATA, N = D.numbers;
document.querySelectorAll("[data-n]").forEach((e) => { e.textContent = N[e.dataset.n] ?? "?"; });
const SWITCH = [{ x: 5.5, label: "diet switch" }];
const heat = $("g1sHeat");
if (heat) {
  const values = D.bc.values.map((row, i) => row.map((v, j) => (i === j ? null : v)));
  heatmap(heat, { rows: D.bc.labels, cols: D.bc.labels.map((l) => l.replace("Day ", "")), values, label: "Bray-Curtis", cell: 20, colLabelHeight: 28,
    format: (v) => (v === null ? "–" : v.toFixed(3)) });
}
const tim = $("g1sTiming");
if (tim) {
  lineChart(tim, { x: D.days, xLabel: "Day", xName: "Day", yLabel: "Bray-Curtis dissimilarity", zero: true, marks: SWITCH, height: 240,
    series: [{ name: "to day 1", values: D.timing.toDay1 }, { name: "to days 8-10", values: D.timing.toLate }] });
}
const set = $("g1sSettle");
if (set) {
  const s = D.settle, keep = [5, 6, 7, 8, 9];
  barChart(set, { labels: keep.map((i) => "day " + s.labels[i]),
    groups: [{ name: "rising MAGs", values: keep.map((i) => s.up[i]) }, { name: "falling MAGs", values: keep.map((i) => s.down[i]) }],
    yLabel: "Number of MAGs", unit: "MAGs", height: 240, fmt: (v) => (Number.isInteger(v) ? String(v) : "") });
}
