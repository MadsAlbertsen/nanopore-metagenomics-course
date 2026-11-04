// Group 1 article: community shift, genome change and carbohydrate-active enzymes over the ten days. Chart code and data copied from the group's report (projects/group1); every number comes from DATA (data.json).
const D = DATA, N = D.numbers;
const SWITCH = [{ x: 5.5, label: "diet switch" }];

// numbers: data-n = key in D.numbers; data-s = path into D (last index is a day, 1-based), data-d = decimals
function fillNumbers() {
  for (const e of document.querySelectorAll("[data-n]")) {
    const v = N[e.dataset.n];
    e.textContent = Array.isArray(v) ? v.join(" and ") : v ?? "?";
  }
  for (const e of document.querySelectorAll("[data-s]")) {
    const p = e.dataset.s.split(".");
    let v = D;
    p.forEach((k, i) => { v = v?.[i === p.length - 1 ? +k - 1 : k]; });
    e.textContent = typeof v === "number" ? v.toFixed(+(e.dataset.d ?? 1)) : "?";
  }
}

const FAM = [["Lachnospiraceae", "var(--c3)"], ["Bacteroidaceae", "var(--c4)"], ["other families", "var(--c5)"]];
const famColor = (f) => (FAM.find(([n]) => n === f) || FAM[2])[1];
const lg = (v) => Math.log10(Math.max(v, N.heatFloor));
const pct = (v) => (v === null ? "–" : 10 ** v <= N.heatFloor * 1.0001 ? `< ${N.heatFloor}%` : `${fmtNum(+(10 ** v).toPrecision(3))}%`);
// long labels: a placeholder species (sp000...) keeps its genus and loses the accession; a Latin epithet keeps the
// epithet and the genus is cut to its first letter
const shortName = (s) => {
  if (s.length <= 34) return s;
  const [genus, epithet, ...rest] = s.split(" ");
  return /^sp\d/.test(epithet) ? [genus, "sp.", ...rest].join(" ") : [genus[0] + ".", epithet, ...rest].join(" ");
};

// end labels of lines that end close together are drawn at least 17 px apart (the kit keeps 13 px)
function spreadEndLabels(host, gap = 17) {
  const fix = () => {
    const labs = [...host.querySelectorAll("text.dlab")].sort((a, b) => +a.getAttribute("y") - +b.getAttribute("y"));
    for (let i = 1; i < labs.length; i++) {
      const prev = +labs[i - 1].getAttribute("y"), y = +labs[i].getAttribute("y");
      if (y - prev < gap) labs[i].setAttribute("y", prev + gap);
    }
  };
  fix();
  if (!host._spread) { host._spread = new MutationObserver(fix); host._spread.observe(host, { childList: true }); }
}

// Figure 1: all pairs of days
function drawHeat() {
  const values = D.bc.values.map((row, i) => row.map((v, j) => (i === j ? null : v)));
  heatmap($("g1Heat"), { rows: D.bc.labels, cols: D.bc.labels, values, label: "Bray-Curtis", cell: 30, colLabelHeight: 50,
    format: (v) => (v === null ? "–" : v.toFixed(3)) });
}

// Figure 2: distance of each day to reference states (a) and to the day before (b)
function drawTiming() {
  const t = D.timing;
  lineChart($("g1Timing"), {
    x: D.days, xLabel: "Day", xName: "Day", yLabel: "Bray-Curtis dissimilarity", zero: true, marks: SWITCH,
    series: [{ name: "to day 1", values: t.toDay1 }, { name: "to days 2-5", values: t.toEarly }, { name: "to days 8-10", values: t.toLate }],
  });
  spreadEndLabels($("g1Timing"));
  barChart($("g1Steps"), { labels: t.stepLabels.map((s) => "day " + s), values: t.steps, yLabel: "Bray-Curtis to the day before",
    colors: t.stepLabels.map((s) => (s === "5 to 6" ? "var(--c2)" : "var(--c1)")), fmt: (v) => v.toFixed(3), height: 240 });
}

// Figure 3: log2 change of the changing MAGs (a) and their settled day (b)
function drawChange() {
  const rows = [...D.movers].sort((a, b) => b.log2 - a.log2);
  barChart($("g1Change"), { labels: rows.map((m) => m.name), values: rows.map((m) => m.log2), horizontal: true,
    colors: rows.map((m) => famColor(m.family)), yLabel: "log2 change, days 6-10 vs days 1-5", fmt: (v) => v.toFixed(1) });
  chartLegend($("g1ChangeLeg"), FAM.map(([name, color]) => ({ name, color })));
  const s = D.settle;
  const keep = s.labels.map((l, i) => i).filter((i) => i >= 4 || s.up[i] + s.down[i] > 0).filter((i) => s.labels[i] !== "not settled" || s.up[i] + s.down[i] > 0);
  barChart($("g1Settle"), { labels: keep.map((i) => (s.labels[i] === "not settled" ? "not settled" : "day " + s.labels[i])),
    groups: [{ name: "rising MAGs", values: keep.map((i) => s.up[i]) }, { name: "falling MAGs", values: keep.map((i) => s.down[i]) }],
    yLabel: "Number of MAGs", unit: "MAGs", height: 240, fmt: (v) => (Number.isInteger(v) ? String(v) : "") });
}

// Table 1: robustness of each changing MAG under leave-one-day-out reruns
function drawRobust() {
  table($("g1Robust"), {
    columns: [{ key: "name", label: "MAG" }, { key: "dir", label: "Direction" }, { key: "log2", label: "log2 change", num: true },
      { key: "kept", label: "Changing in reruns (of 10)", num: true, fmt: (v) => String(v) }, { key: "settled", label: "Settled day", num: true, fmt: (v) => (v === null ? "not settled" : String(v)) },
      { key: "range", label: "Settled day in reruns" }, { key: "step", label: "Largest step days 1-5 (log2)", num: true }],
    rows: D.robust, filter: true, sortKey: "kept", maxRows: 35,
  });
}

// Figure 4: the changing MAGs (share per day, left) and their degrading CAZyme genes per 1,000 genes (right), same rows
function drawPair() {
  const c = D.cazy, byName = Object.fromEntries(D.heatChange.map((r) => [r.name, r]));
  const short = { "plant fibre": "fibre", "host glycan": "host", "all degrading": "total" };
  const labels = [], left = [], right = [], blank = [];
  let grp = null;
  for (const r of c.rows) {
    if (r.grp !== grp) { grp = r.grp; labels.push(grp); left.push(D.days.map(() => null)); right.push(c.cats.map(() => null)); }
    labels.push(shortName(r.name));
    left.push(byName[r.name].share.map(lg));
    right.push(r.per);
  }
  const rowsR = labels.map(() => "");
  heatmap($("g1PairL"), { rows: labels, cols: D.days.map((d) => "Day " + d), values: left, label: "Share of the bases", format: pct, cell: 16, colLabelHeight: 56 });
  heatmap($("g1PairR"), { rows: rowsR, cols: c.cats.map((x) => short[x] || x), values: right, label: "Genes per 1,000 genes", cell: 16, colLabelHeight: 56,
    format: (v) => (v === null ? "–" : v.toFixed(1)) });
}

// Figure 5: degrading CAZyme genes per 1,000 genes per day (all MAGs, changing MAGs, core MAGs), one common y axis
function drawCazyDays() {
  const c = D.cazy, p = c.perDay, sub = c.perDaySub;
  const opts = { x: D.days, xLabel: "Day", xName: "Day", yLabel: "Genes per 1,000 genes", zero: true, yRange: [0, 36], marks: SWITCH };
  lineChart($("g1CzAll"), { ...opts, series: p.cats.map((name, i) => ({ name, values: p.values[i] })) });
  sub.panels.forEach((pn, k) => lineChart($(k === 0 ? "g1CzChg" : "g1CzCore"), { ...opts, series: sub.cats.map((name, i) => ({ name, values: pn.values[i] })) }));
}

function drawAll() { drawHeat(); drawTiming(); drawChange(); drawRobust(); drawPair(); drawCazyDays(); }
fillNumbers();
drawAll();
