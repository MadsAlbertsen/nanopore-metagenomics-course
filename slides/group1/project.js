// Group 1 deck: data from articles/group1/data.json (Bray-Curtis table, distances to reference days, enzyme genes per day).
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
const cz = $("g1sCz");
if (cz) {
  lineChart(cz, { x: D.days, xLabel: "Day", xName: "Day", yLabel: "Genes per 1,000 genes", zero: true, yRange: [0, 36], marks: SWITCH, height: 270,
    series: D.cazy.cats.map((name, k) => ({ name: name === "all degrading" ? "all degrading" : name, values: D.cazy.values[k] })) });
}
