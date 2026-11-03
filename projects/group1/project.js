// Group 1 report: Bray-Curtis between days, timing of the change, changing MAGs, variable positions of core MAGs.
// Every number comes from DATA (data.json, np26 scripts/41_project_group1.py).
const D = DATA, N = D.numbers;
const st = { mag: null, xaxis: "depth" };
const SWITCH = [{ x: 5.5, label: "diet switch" }];

function fillNumbers() {
  for (const e of document.querySelectorAll("[data-n]")) {
    const v = N[e.dataset.n];
    e.textContent = Array.isArray(v) ? v.join(" and ") : v ?? "?";
  }
}

function stats() {
  const items = [[D.days.length, "daily samples"], [N.mags, "MAGs"], [N.nChange, "MAGs that change at least two-fold"], [N.nCore, "core MAGs (all ten days)"]];
  $("pjStats").innerHTML = items.map(([n, t]) => `<div class="stat"><b>${n}</b><span>${esc(t)}</span></div>`).join("");
}

function magOptions() {
  const sel = $("pjMag");
  const sorted = [...D.movers].sort((a, b) => b.log2 - a.log2);
  sel.innerHTML = sorted.map((m) => `<option value="${esc(m.mag)}">${esc(m.name)} (${m.dir === "up" ? "rises" : "falls"})</option>`).join("");
  st.mag = st.mag || sorted[0].mag;
  sel.value = st.mag;
  sel.addEventListener("change", () => { st.mag = sel.value; drawMovers(); });
}

function drawHeat() {
  const values = D.bc.values.map((row, i) => row.map((v, j) => (i === j ? null : v)));
  heatmap($("pjHeat"), { rows: D.bc.labels, cols: D.bc.labels, values, label: "Bray-Curtis", cell: 30, colLabelHeight: 50,
    format: (v) => (v === null ? "–" : v.toFixed(3)) });
}

function drawTiming() {
  const t = D.timing;
  lineChart($("pjTiming"), {
    x: D.days, xLabel: "Day", xName: "Day", yLabel: "Bray-Curtis dissimilarity", zero: true, marks: SWITCH,
    series: [{ name: "to day 1", values: t.toDay1 }, { name: "to days 2-5", values: t.toEarly }, { name: "to days 8-10", values: t.toLate }],
  });
  barChart($("pjSteps"), { labels: t.stepLabels.map((s) => "day " + s), values: t.steps, yLabel: "Bray-Curtis to the day before",
    colors: t.stepLabels.map((s) => (s === "5 to 6" ? "var(--c2)" : "var(--c1)")), fmt: (v) => v.toFixed(3), height: 240 });
  lineChart($("pjPhyla"), { x: D.days, xLabel: "Day", xName: "Day", yLabel: "Share of the sample's bases (%)", unit: "%",
    series: D.phyla.series, marks: SWITCH, logY: true });
}

function drawMovers() {
  const m = D.movers.find((x) => x.mag === st.mag) || D.movers[0];
  $("pjMag").value = m.mag;
  lineChart($("pjMagLine"), {
    x: D.days, xLabel: "Day", xName: "Day", yLabel: "Share of the sample's bases (%)", unit: "%", marks: SWITCH, zero: true,
    series: [{ name: m.name, values: m.share }, { name: "midpoint", values: D.days.map(() => m.mid), color: "var(--faint)" }],
  });
  const s = D.settle;
  const keep = s.labels.map((l, i) => i).filter((i) => i >= 4 || s.up[i] + s.down[i] > 0).filter((i) => s.labels[i] !== "not settled" || s.up[i] + s.down[i] > 0);
  barChart($("pjSettle"), { labels: keep.map((i) => (s.labels[i] === "not settled" ? "not settled" : "day " + s.labels[i])),
    groups: [{ name: "rising MAGs", values: keep.map((i) => s.up[i]) }, { name: "falling MAGs", values: keep.map((i) => s.down[i]) }],
    yLabel: "Number of MAGs", unit: "MAGs", height: 240 });
}

function drawCore() {
  const pts = [...D.allMags].sort((a, b) => a.core - b.core).map((m) => ({
    x: st.xaxis === "depth" ? m.depth : m.mean, y: m.var, label: m.name, group: m.core ? "core MAG" : "other MAG",
    size: m.core ? 5 : 3.5, extra: st.xaxis === "depth" ? `mean share ${m.mean}%` : `depth ${m.depth}x`,
  }));
  $("pjX").value = st.xaxis;
  scatter($("pjScatter"), { points: pts, logX: true, logY: true, yLabel: "Variable positions (% of positions)",
    xLabel: st.xaxis === "depth" ? "Depth (pooled reads, x)" : "Mean share over ten days (%)" });
  table($("pjTable"), {
    columns: [{ key: "name", label: "MAG" }, { key: "family", label: "Family" }, { key: "mean", label: "Mean share (%)", num: true },
      { key: "min", label: "Lowest share (%)", num: true }, { key: "depth", label: "Depth (x)", num: true },
      { key: "var", label: "Variable positions (%)", num: true }, { key: "log2", label: "log2 change", num: true }],
    rows: D.core, filter: true, sortKey: "var", maxRows: 15,
  });
}

const FAM = [["Lachnospiraceae", "var(--c3)"], ["Bacteroidaceae", "var(--c4)"], ["other families", "var(--c5)"]];
const famColor = (f) => (FAM.find(([n]) => n === f) || FAM[2])[1];

function drawChange() {
  const rows = [...D.movers].sort((a, b) => b.log2 - a.log2);
  barChart($("pjChange"), { labels: rows.map((m) => m.name), values: rows.map((m) => m.log2), horizontal: true,
    colors: rows.map((m) => famColor(m.family)), yLabel: "log2 change, days 6-10 vs days 1-5", fmt: (v) => v.toFixed(1) });
  chartLegend($("pjChangeLeg"), FAM.map(([name, color]) => ({ name, color })));
}

function drawAll() { drawHeat(); drawTiming(); drawChange(); drawMovers(); drawCore(); }

$("pjX").addEventListener("change", () => { st.xaxis = $("pjX").value; drawCore(); });
fillNumbers();
stats();
magOptions();
drawAll();
