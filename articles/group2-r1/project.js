// Group 2 article, revision 1 (Claude): fixed figures from DATA (np26 scripts/42_project_group2.py, r1_analyses).
// Every number in the text comes from DATA.numbers or is derived here from DATA.r1 (never typed by hand).
const D = DATA;
const N = D.numbers;
const R = D.r1;
const CI = Object.fromEntries(R.null.cats.map((c, i) => [c, i])); // all, starch, fructan, plant_fibre, host_glycan
const f1 = (v) => Number(v).toFixed(1);
const f2 = (v) => Number(v).toFixed(2);
const f3 = (v) => Number(v).toFixed(3);
const pctl = (v) => String(Math.round(100 * v));
const SWITCH = [{ x: 5.5, label: "diet switch" }];
const meanOf = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const bact = D.phyla.find((p) => p.name === "Bacteroidota").values;
const splitLabel = (days, k) => `${days[k - 1]}|${days[k]}`;
const modeSplit = (t) => t.best_split_counts.indexOf(Math.max(...t.best_split_counts)) + 1;

// derived numbers (r_ keys) for the text
Object.assign(N, {
  r_obs_all: f1(R.null.obs[CI.all]), r_obs_hg: f1(R.null.obs[CI.host_glycan]), r_obs_pf: f1(R.null.obs[CI.plant_fibre]),
  r_obs_fr_abs: f1(Math.abs(R.null.obs[CI.fructan])), r_obs_st_abs: f1(Math.abs(R.null.obs[CI.starch])),
  r_free_med_all: f1(R.null.free.median_abs[CI.all]),
  r_free_pct_all: pctl(R.null.free.pct[CI.all]), r_phy_pct_all: pctl(R.null.phylum.pct[CI.all]),
  r_fam_pct_all: pctl(R.null.family.pct[CI.all]), r_gen_pct_all: pctl(R.null.genus.pct[CI.all]),
  r_free_pct_hg: pctl(R.null.free.pct[CI.host_glycan]), r_phy_pct_hg: pctl(R.null.phylum.pct[CI.host_glycan]),
  r_fam_pct_hg: pctl(R.null.family.pct[CI.host_glycan]), r_gen_pct_hg: pctl(R.null.genus.pct[CI.host_glycan]),
  r_nopc_pct_hg: pctl(R.null.follow.no_pcopri_family.pct[CI.host_glycan]),
  r_dnaw_pct_hg: pctl(R.null.follow.dna_weight_family.pct[CI.host_glycan]),
  r_dnaw_pct_all: pctl(R.null.follow.dna_weight_family.pct[CI.all]),
  r_planted_pct: pctl(R.null.planted_pct),
  r_comp_pct: pctl(R.null.comp_pct), r_comp_lambda: f2(R.null.comp_lambda), r_null_p5: f1(R.null.null_p5_all),
  r_w_high: f1(R.weight.high[CI.all]), r_w_low: f1(R.weight.low[CI.all]), r_w_all: f1(R.weight.pct[CI.all]),
  r_w_hg: f1(R.weight.pct[CI.host_glycan]), r_w_pf: f1(R.weight.pct[CI.plant_fibre]),
  r_thin_reps: String(R.thin.a.reps), r_reps: "2,000",
  r_thin_a_m: f2(R.thin.a.target_reads / 1e6), r_thin_b_m: f2(R.thin.b.target_reads / 1e6),
  r_thin_a_w1: f2(R.thin.a.bc_w1[0]), r_thin_a_w2: f2(R.thin.a.bc_w2[0]), r_thin_a_b: f2(R.thin.a.bc_b[0]),
  r_thin_b_w1: f2(R.thin.b.bc_w1[0]), r_thin_b_w2: f2(R.thin.b.bc_w2[0]), r_thin_b_b: f2(R.thin.b.bc_b[0]),
  r_thin_a_67: String(R.thin.a.best_split_counts[R.thin.a.days.indexOf(6)]),
  r_floor_a: f3(R.thin.a.floor_median), r_floor_b: f3(R.thin.b.floor_median),
  r_thin_a_down: String(Math.round(R.thin.a.down[0])), r_thin_a_up: String(Math.round(R.thin.a.up[0])),
  r_thin_b_down: String(Math.round(R.thin.b.down[0])), r_thin_b_up: String(Math.round(R.thin.b.up[0])),
  r_bin_high: f1(R.binned.binned_high), r_bin_low: f1(R.binned.binned_low),
  r_bin_down: String(R.binned.same_down), r_bin_up: String(R.binned.same_up),
  r_sp_units: String(R.species.units), r_sp_multi: String(R.species.multi_species), r_sp_mags_multi: String(R.species.mags_in_multi),
  r_sp_down: String(R.species.down), r_sp_up: String(R.species.up),
  r_hq_down: String(D.quality[1].down), r_hq_up: String(D.quality[1].up),
  r_tr_beats: pctl(R.trend.axis1.null_beats), r_tr_obs: f2(R.trend.axis1.obs), r_tr_pct: pctl(R.trend.axis1.pct),
  r_tr_mags: String(R.trend.mags_above95), r_tr_line: pctl(R.trend.plant_line), r_tr_step: pctl(R.trend.plant_step),
  r_rho_all: f2(R.coupling.rho_all), r_p_all: f2(R.coupling.p_all), r_rho_within: f2(R.coupling.rho_within),
  r_p_within: f2(R.coupling.p_within), r_cp_n: String(R.coupling.n), r_cp_fam: String(R.coupling.families),
  r_cp_nw: String(R.coupling.n_within),
  r_bac_ch: f1(R.coupling.family_medians.Bacteroidaceae.changed), r_bac_not: f1(R.coupling.family_medians.Bacteroidaceae.not_changed),
  r_lach_ch: f1(R.coupling.family_medians.Lachnospiraceae.changed), r_lach_not: f1(R.coupling.family_medians.Lachnospiraceae.not_changed),
  r_bact_high: f1(meanOf(bact.slice(0, 5))), r_bact_low: f1(meanOf(bact.slice(5))),
  r_total_gbp: f1(D.depth.reduce((s, d) => s + d.gbp, 0)), r_d2_reads: f2(D.depth[1].reads / 1e6),
});
document.querySelectorAll("[data-n]").forEach((s) => {
  const v = N[s.dataset.n];
  s.textContent = v === undefined ? "?" : s.dataset.d !== undefined ? Number(v).toFixed(+s.dataset.d) : String(v);
});

const PHYLA = D.phyla.map((p) => p.name);
const phylumColor = (p) => `var(--c${(PHYLA.includes(p) ? PHYLA.indexOf(p) : PHYLA.indexOf("Other phyla")) + 1})`;

function fig1() {
  lineChart($("r2F1a"), { x: D.days, series: D.phyla.map((p) => ({ name: p.name, values: p.values })), xLabel: "Day", xName: "Day",
    yLabel: "Share of the day's bases (%)", unit: "%", marks: SWITCH, height: 300 });
  const lab = D.depth.map((d) => `Day ${d.day} · ${d.gbp.toFixed(1)} Gbp`);
  const vals = D.bc.values.map((row, i) => row.map((v, j) => (i === j ? null : v)));
  heatmap($("r2F1b"), { rows: lab, cols: D.days.map((d) => `Day ${d}`), values: vals, label: "Bray-Curtis", format: (v) => (v === null ? "–" : v.toFixed(2)), cell: 20, colLabelHeight: 52 });
  scatter($("r2F1c"), { points: D.pcoa.map((p) => ({ x: p.x, y: p.y, label: `Day ${p.day}`, group: p.period })), labelled: true, height: 300,
    xLabel: `Axis 1 (${N.pc1}%)`, yLabel: `Axis 2 (${N.pc2}%)`, xFmt: (v) => v.toFixed(2), yFmt: (v) => v.toFixed(2) });
}

function fig2() {
  const q = D.quality, t = R.thin;
  const settings = [
    ["Main shares", N.up2, N.down2, [N.bc_within_high, N.bc_within_low, N.bc_between]],
    ["Equal depth, day 5 (no day 2)", t.a.up[0], t.a.down[0], [t.a.bc_w1[0], t.a.bc_w2[0], t.a.bc_b[0]]],
    ["Equal depth, day 2", t.b.up[0], t.b.down[0], [t.b.bc_w1[0], t.b.bc_w2[0], t.b.bc_b[0]]],
    ["Binned bases", R.binned.same_up, R.binned.same_down, null],
    ["GTDB species", R.species.up, R.species.down, [R.species.bc_w1, R.species.bc_w2, R.species.bc_b]],
    ["High-quality MAGs only", q[1].up, q[1].down, [q[1].bc_w1, q[1].bc_w2, q[1].bc_b]],
  ];
  barChart($("r2F2a"), { labels: settings.map((s) => s[0]), horizontal: true, unit: "MAGs", yLabel: "MAGs (or species) changed ≥ 2-fold",
    groups: [{ name: "Rose", values: settings.map((s) => s[1]) }, { name: "Fell", values: settings.map((s) => s[2]) }], fmt: (v) => String(Math.round(v)) });
  const bcs = settings.filter((s) => s[3]);
  barChart($("r2F2b"), { labels: bcs.map((s) => s[0]), horizontal: true, yLabel: "Mean Bray-Curtis", fmt: (v) => v.toFixed(2),
    groups: ["Within days 1-5", "Within days 6-10", "Between periods"].map((g, k) => ({ name: g, values: bcs.map((s) => s[3][k]) })) });
}

function fig3() {
  const y = D.axis1.values, x = D.days;
  const mx = meanOf(x), my = meanOf(y);
  const b = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0) / x.reduce((s, xi) => s + (xi - mx) ** 2, 0);
  lineChart($("r2F3a"), { x, series: [{ name: "Axis 1", values: y, color: "var(--c1)" }, { name: "Straight line", values: x.map((xi) => my + b * (xi - mx)), color: "var(--v4)" }],
    xLabel: "Day", xName: "Day", yLabel: "Position on axis 1", marks: SWITCH, zero: false, yFmt: (v) => v.toFixed(2) });
  const splits = D.days.slice(0, -1).map((d, k) => splitLabel(D.days, k + 1));
  const obs = R.trend.axis1.obs_best - 1;
  barChart($("r2F3b"), { labels: splits, values: R.trend.axis1.null_best_counts, unit: "simulations", yLabel: "Simulations with their best split here",
    colors: splits.map((s, i) => (i === obs ? "var(--c2)" : "var(--c1)")), fmt: (v) => String(Math.round(v)) });
}

function fig4() {
  const cats = ["all", "starch", "fructan", "plant_fibre", "host_glycan"];
  const name = (c) => D.cazy.names[D.cazy.cats.indexOf(c)];
  lineChart($("r2F4a"), { x: D.days, series: cats.map((c) => ({ name: name(c), values: D.cazy.per_day[c] })), xLabel: "Day", xName: "Day", logY: true,
    yLabel: "Genes per 1,000 genes (log scale)", marks: SWITCH, height: 300 });
  barChart($("r2F4b"), { labels: cats.map(name), horizontal: true, unit: "%", yLabel: "Change, days 6-10 against days 1-5 (%)", fmt: (v) => v.toFixed(1),
    groups: [{ name: "Share × gene number (main)", values: R.weight.main_pct }, { name: "Share only (genes in the DNA)", values: R.weight.pct }] });
}

function fig5() {
  const e = R.null.hist_edges, obs = R.null.obs[CI.all];
  const labels = R.null.free.hist.map((_, i) => `${e[i]} to ${e[i + 1]}`);
  const hit = e.findIndex((v, i) => i < e.length - 1 && obs >= v && obs < e[i + 1]);
  barChart($("r2F5a"), { labels, values: R.null.free.hist, unit: "permutations", yLabel: "Permutations",
    colors: labels.map((_, i) => (i === hit ? "var(--c2)" : "var(--c1)")), fmt: (v) => String(Math.round(v)) });
  const cols = [["Free", R.null.free], ["Within phylum", R.null.phylum], ["Within family", R.null.family], ["Within genus", R.null.genus],
    ["Family, no P. copri", R.null.follow.no_pcopri_family], ["Family, share only", R.null.follow.dna_weight_family]];
  const rows = R.null.cats.map((c) => D.cazy.names[D.cazy.cats.indexOf(c)]);
  heatmap($("r2F5b"), { rows, cols: cols.map((c) => c[0]), values: R.null.cats.map((c, i) => cols.map((col) => 100 * col[1].pct[i])),
    min: 0, max: 100, label: "Percentile of the observed change", format: (v) => String(Math.round(v)), cell: 30, colLabelHeight: 90 });
}

function fig6() {
  const rank = (g) => PHYLA.indexOf(g);
  const pts = R.coupling.points.map((p) => ({ x: p.log2, y: p.rate, label: p.name, group: PHYLA.includes(p.phylum) ? p.phylum : "Other phyla", extra: p.family }))
    .sort((a, b) => rank(a.group) - rank(b.group)); // groups appear in phylum order, so the legend colours match phylumColor
  pts.forEach((p) => (p.color = phylumColor(p.group)));
  const host = $("r2F6");
  scatter(host, { points: pts, height: 340, xLabel: "log2 change of the mean share (days 6-10 / days 1-5)", yLabel: "CAZyme genes per 1,000 genes",
    xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(0) });
  // dashed lines at ±1 (two-fold), on the same x scale as the scatter (extent with 5% padding); kept on redraw
  const entry = CHARTS.find((c) => c.host === host), base = entry.draw;
  entry.draw = () => {
    base();
    const svg = host.querySelector("svg");
    const [x0, x1] = extent(pts.map((p) => p.x));
    const W = +svg.getAttribute("width"), H = +svg.getAttribute("height"), sx = scale(x0, x1, 60, W - 16);
    for (const t of [-1, 1]) el("line", { x1: sx(t), x2: sx(t), y1: 14, y2: H - 44, class: "mark" }, svg);
  };
  entry.draw();
}

function fig7() {
  const rows = D.traits.filter((t) => t.set === "curated" && t.q < 0.1);
  const show = (r, k) => (r[k] ?? "–");
  table($("r2F7"), { rows, sortKey: "q", sortDesc: false, maxRows: 30, columns: [
    { key: "feature", label: "Feature" }, { key: "source", label: "Feature type" },
    { key: "rise", label: "Risers", fmt: (v, r) => show(r, "rise") }, { key: "fall", label: "Fallers", fmt: (v, r) => show(r, "fall") },
    { key: "q", label: "q", num: true, fmt: (v) => (v < 0.001 ? v.toExponential(1) : v.toFixed(3)) },
    { key: "p_bac", label: "p within Bacillota", num: true, fmt: (v) => (v === null || v === undefined ? "not testable" : v.toFixed(2)) },
  ] });
}

fig1(); fig2(); fig3(); fig4(); fig5(); fig6(); fig7();
