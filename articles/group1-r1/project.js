// Group 1 article, revision 1 (by Claude): figures of the timing, the per-genome steps, the Prevotella copri_B fall,
// the CAZyme gene content and the null-model test. Every number comes from DATA (data.json, written by np26
// scripts/41_project_group1.py, section R1).
const D = DATA, N = D.numbers;
const SWITCH = [{ x: 5.5, label: "diet switch" }];

// data-n = key in D.numbers; data-s = path into DATA whose last part is a 1-based index (for lists of two values)
function fillNumbers() {
  for (const e of document.querySelectorAll("[data-n]")) {
    const v = N[e.dataset.n];
    e.textContent = Array.isArray(v) ? v.join(" and ") : (v ?? "?");
  }
  for (const e of document.querySelectorAll("[data-s]")) {
    const p = e.dataset.s.split(".");
    let v = DATA;
    p.forEach((k, i) => { v = v?.[i === p.length - 1 ? +k - 1 : k]; });
    e.textContent = v === undefined || v === null ? "?" : String(v);
  }
}

const FAM = [["Bacteroidaceae", "var(--c4)"], ["Lachnospiraceae", "var(--c3)"], ["other families", "var(--c5)"]];
const famColor = (f) => (FAM.find(([n]) => n === f) || FAM[2])[1];
const lg = (v) => Math.log10(Math.max(v, N.heatFloor));
const pct = (v) => (v === null ? "–" : 10 ** v <= N.heatFloor * 1.0001 ? `< ${N.heatFloor}%` : `${fmtNum(+(10 ** v).toPrecision(3))}%`);
const shortName = (s) => {
  if (s.length <= 34) return s;
  const [genus, epithet, ...rest] = s.split(" ");
  return /^sp\d/.test(epithet) ? [genus, "sp.", ...rest].join(" ") : [genus[0] + ".", epithet, ...rest].join(" ");
};

// Table 1: sequencing and binning per day
function drawTable1() {
  table($("r1Table1"), {
    columns: [
      { key: "day", label: "Day", num: true, fmt: (v) => String(v) },
      { key: "reads", label: "Reads", num: true },
      { key: "gbp", label: "Gbp", num: true, fmt: (v) => v.toFixed(2) },
      { key: "n50", label: "Read N50 (kb)", num: true, fmt: (v) => v.toFixed(1) },
      { key: "q", label: "Mean read Q", num: true, fmt: (v) => v.toFixed(1) },
      { key: "binned", label: "Bases in MAGs (%)", num: true, fmt: (v) => v.toFixed(1) },
    ],
    rows: N.seqRows, sortable: false,
  });
}

// Figure 1: a, all pairs of days; b, distance to reference states; c, pseudo-F of the contiguous splits
function drawTiming() {
  const values = D.bc.values.map((row, i) => row.map((v, j) => (i === j ? null : v)));
  heatmap($("r1Heat"), { rows: D.bc.labels, cols: D.bc.labels, values, label: "Bray-Curtis", cell: 30, colLabelHeight: 50,
    format: (v) => (v === null ? "–" : v.toFixed(3)) });
  const t = D.timing;
  lineChart($("r1TimingLines"), {
    x: D.days, xLabel: "Day", xName: "Day", yLabel: "Bray-Curtis dissimilarity", zero: true, marks: SWITCH,
    series: [{ name: "to day 1", values: t.toDay1 }, { name: "to days 2-5", values: t.toEarly }, { name: "to days 8-10", values: t.toLate }],
  });
  barChart($("r1Cont"), { labels: D.days.slice(0, 9).map((d) => `1-${d} | ${d + 1}-10`), values: D.contF,
    colors: D.days.slice(0, 9).map((d) => (d === 5 ? "var(--c2)" : "var(--c1)")),
    yLabel: "Pseudo-F of the split", fmt: (v) => v.toFixed(2), height: 260 });
}

// Figure 2: a, step boundaries against the shuffled-day null; b, period contrast against the late contrast
function drawSteps() {
  const s = D.steps;
  barChart($("r1StepBars"), { labels: s.bounds.map((b) => "days " + b),
    groups: [{ name: "observed", values: s.obs }, { name: "shuffled days (mean)", values: s.null }],
    yLabel: "Number of MAGs with their step here", unit: "MAGs", height: 280, fmt: (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)) });
  const pts = D.scatter.map((p) => ({
    x: p.x, y: p.y, label: p.name, group: p.family,
    size: p.copri ? 7 : 4.5, color: p.copri ? "var(--c2)" : undefined,
    extra: `${p.inMid ? "two-fold vs days 6-10" : "not two-fold vs days 6-10"}; ${p.inLate ? "two-fold vs days 8-10" : "not two-fold vs days 8-10"}`,
  }));
  scatter($("r1Scatter"), { points: pts, diagonal: true,
    xLabel: "log2 change, days 6-10 vs days 1-5", yLabel: "log2 change, days 8-10 vs days 1-5", height: 380 });
}

// Figure 3: a, the P. copri_B trajectories; b (Table 2), the MAG pairs of one species
function drawCopri() {
  lineChart($("r1Traj"), { x: D.days, xLabel: "Day", xName: "Day", yLabel: "Share of the sample's bases (%)", unit: "%",
    zero: true, marks: SWITCH, series: D.traj });
  table($("r1Pairs"), {
    columns: [
      { key: "species", label: "Species" },
      { key: "a", label: "MAG 1" }, { key: "la", label: "log2 change", num: true, fmt: (v) => v.toFixed(2) },
      { key: "b", label: "MAG 2" }, { key: "lb", label: "log2 change", num: true, fmt: (v) => v.toFixed(2) },
      { key: "frac", label: "Aligned (% of the smaller genome)", num: true, fmt: (v) => v.toFixed(0) },
      { key: "id", label: "Identity (%)", num: true, fmt: (v) => v.toFixed(2) },
    ],
    rows: N.pairRows, sortable: false,
  });
}

// Figure 4: the changing MAGs (share per day) beside their CAZyme genes per 1,000 genes, same rows
function drawPair() {
  const c = D.cazy, byName = Object.fromEntries(D.heatChange.map((r) => [r.name, r]));
  const short = { "plant fibre": "fibre", "host glycan": "host", "all degrading": "total" };
  const labels = [], left = [], right = [];
  let grp = null;
  for (const r of c.rows) {
    if (r.grp !== grp) { grp = r.grp; labels.push(grp); left.push(D.days.map(() => null)); right.push(c.cats.map(() => null)); }
    labels.push(shortName(r.name));
    left.push(byName[r.name].share.map(lg));
    right.push(r.per);
  }
  heatmap($("r1PairL"), { rows: labels, cols: D.days.map((d) => "Day " + d), values: left, label: "Share of the bases", format: pct, cell: 16, colLabelHeight: 56 });
  heatmap($("r1PairR"), { rows: labels.map(() => ""), cols: c.cats.map((x) => short[x] || x), values: right,
    label: "Genes per 1,000 genes", cell: 16, colLabelHeight: 56, format: (v) => (v === null ? "–" : v.toFixed(1)) });
}

// Figure 5: a, community density per day; b, the two null distributions; c, the shift-share parts
function drawNull() {
  lineChart($("r1Dens"), { x: D.days, xLabel: "Day", xName: "Day", yLabel: "Degrading CAZyme genes per 1,000 genes",
    zero: true, marks: SWITCH, series: [{ name: "all MAGs", values: D.commDens }, { name: "without P. copri_B", values: D.noCopriDens }] });
  const h = D.nullHist;
  barChart($("r1NullHist"), { labels: h.x.map((v) => v.toFixed(2)),
    groups: [{ name: "null A: gene content shuffled between all MAGs", values: h.a },
             { name: "null B: shuffled within families", values: h.b }],
    yLabel: `Percent of permutations (observed: ${h.obs} per 1,000 genes)`, unit: "%", height: 300, fmt: (v) => v.toFixed(1) });
  barChart($("r1Shift"), { labels: D.shiftShare.map((r) => r.name), horizontal: true,
    groups: [{ name: "between families (weights change)", values: D.shiftShare.map((r) => r.between) },
             { name: "within families (densities change)", values: D.shiftShare.map((r) => r.within) }],
    yLabel: "Contribution to the change (genes per 1,000 genes)", fmt: (v) => v.toFixed(2) });
}

// Figure 6: medians per family and direction of change
function drawCzBars() {
  const c = D.cazy;
  barChart($("r1CzBars"), { labels: c.cats, horizontal: true,
    groups: c.groups.map((g, i) => ({ name: g, values: c.median.map((row) => row[i]) })),
    yLabel: "Median genes per 1,000 genes", fmt: (v) => v.toFixed(1) });
}

fillNumbers();
drawTable1();
drawTiming();
drawSteps();
drawCopri();
drawPair();
drawNull();
drawCzBars();
