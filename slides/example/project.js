// Example deck: DATA from projects/group5/data.json (days, diet, the three Bifidobacterium MAGs, genome numbers).
const D = DATA, N = D.numbers;
document.querySelectorAll("[data-n]").forEach((e) => { e.textContent = N[e.dataset.n] ?? "?"; });
lineChart($("exShare"), {
  x: D.days,
  xLabel: "Day",
  yLabel: "Share of bases (%)",
  height: 330,
  bands: [{ from: 1, to: 5, label: "high-carbohydrate" }],
  series: D.mags.map((m) => ({ name: m.name.replace(/^Bifidobacterium /, "B. ").replace(/ \(.*\)$/, ""), values: m.share })),
  unit: "%",
});
