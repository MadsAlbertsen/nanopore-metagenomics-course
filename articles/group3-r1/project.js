// Group 3 article, revision 1 (written by Claude). DATA comes from np26 scripts/43c_group3_revision1.py.
const D = DATA, N = D.numbers;
const SPLIT = "diet switch";
document.querySelectorAll("[data-n]").forEach((e) => { e.textContent = String(N[e.dataset.n]); });
const f3 = (v) => (v === null || v === undefined ? "–" : v.toFixed(3));
const sg = (v) => (v === null || v === undefined ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)}`);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// Table 1: sequencing per sample
table($("r3Seq"), {
  columns: [{ key: "day", label: "Day", num: true, fmt: String }, { key: "reads", label: "Reads", num: true, fmt: (v) => v.toLocaleString("en-US") },
    { key: "gbp", label: "Bases (Gbp)", num: true, fmt: (v) => v.toFixed(2) }, { key: "n50", label: "Read N50 (bp)", num: true, fmt: (v) => v.toLocaleString("en-US") },
    { key: "q", label: "Mean read Q", num: true, fmt: (v) => v.toFixed(1) }, { key: "hq", label: "HQ MAGs (% of bases)", num: true, fmt: (v) => v.toFixed(1) },
    { key: "binned", label: "All MAGs (% of bases)", num: true, fmt: (v) => v.toFixed(1) }],
  rows: D.seq, sortable: false,
});

// Figure 1: where each day's bases fall, with the route guild total
const B = D.bases;
lineChart($("r3Bases"), {
  x: D.days, series: [{ name: "HQ MAGs", values: B.HQ, color: "var(--c1)" }, { name: "MQ MAGs", values: B.MQ, color: "var(--c2)" },
    { name: "unbinned contigs", values: B.unbinned, color: "var(--c3)" }, { name: "not on any contig", values: B["not on any contig"], color: "var(--c4)" },
    { name: "route guild (sum)", values: D.compensation.total, color: "var(--c5)" }],
  xLabel: "Day", xName: "Day", yLabel: "Share of the sample's bases (%)", unit: "%", marks: [{ x: 5.5, label: SPLIT }], zero: true,
});

// Table 2: gene calls, evidence classes and the primary measure
const P = D.per;
const perOf = { bcd: P.bcd, but: P.but, ptb: P.ptb, buk: P.buk_all, atoD: { hi: +N.p_atoD_hi, lo: +N.p_atoD_lo, log2: +N.p_atoD_log2 }, atoA: { hi: +N.p_atoA_hi, lo: +N.p_atoA_lo, log2: +N.p_atoA_log2 } };
const relRows = D.reliability.summary.map((r) => ({ ...r, n: r.confident + r.borderline + r.doubtful, per: perOf[r.gene] }));
relRows.splice(4, 0, { gene: "buk next to ptb (route)", n: N.n_buk_linked, confident: null, borderline: null, doubtful: null, per: P.buk_linked });
relRows.splice(5, 0, { gene: "buk without ptb", n: N.n_buk - N.n_buk_linked, confident: null, borderline: null, doubtful: null, per: P.buk_unlinked });
table($("r3Rel"), {
  columns: [{ key: "gene", label: "Gene" }, { key: "n", label: "Calls", num: true, fmt: String },
    { key: "confident", label: "Confident", num: true, fmt: (v) => (v === null ? "" : String(v)) },
    { key: "borderline", label: "Borderline", num: true, fmt: (v) => (v === null ? "" : String(v)) },
    { key: "doubtful", label: "Doubtful", num: true, fmt: (v) => (v === null ? "" : String(v)) },
    { key: "hi", label: "Days 1-5", num: true, fmt: (v, r) => f3(r.per.hi) }, { key: "lo", label: "Days 6-10", num: true, fmt: (v, r) => f3(r.per.lo) },
    { key: "l2", label: "log2 change", num: true, fmt: (v, r) => sg(r.per.log2) }],
  rows: relRows, sortable: false,
});

// Figure 2: daily gene potential
const DY = D.daily;
lineChart($("r3Daily"), {
  x: D.days, series: [{ name: "bcd", values: DY.bcd, color: "var(--muted)" }, { name: "but", values: DY.but, color: "var(--c1)" },
    { name: "ptb-buk pairs", values: DY.ptb, color: "var(--c2)" }, { name: "buk without ptb", values: DY.buk_unlinked, color: "var(--c3)" }],
  xLabel: "Day", xName: "Day", yLabel: "Copies per 1,000 genes", marks: [{ x: 5.5, label: SPLIT }], zero: true, yFmt: (v) => v.toFixed(3),
});

// Figure 3: which genomes carry the change
const KC = { "but": "var(--c1)", "ptb + buk": "var(--c2)", "buk without ptb (not in the route)": "var(--c3)" };
barChart($("r3Contrib"), {
  labels: D.contrib.map((m) => m.name), values: D.contrib.map((m) => m.pp), colors: D.contrib.map((m) => KC[m.kind]), horizontal: true,
  yLabel: "Mean of days 6-10 minus mean of days 1-5 (percentage points of the bases)", unit: "percentage points", fmt: (v) => v.toFixed(1),
});
chartLegend($("r3ContribKey"), Object.entries(KC).map(([name, color]) => ({ name, color })));

// Figure 4: rank of the diet split among the 126 partitions
const SP = D.splits;
barChart($("r3Split"), {
  labels: SP.map((s) => s.series), values: SP.map((s) => s.rank), horizontal: true, colors: SP.map((s) => (s.rank <= 6 ? "var(--c1)" : "var(--muted)")),
  yLabel: "Rank of the diet split among 126 partitions (1 = the largest difference)", fmt: (v) => String(Math.round(v)),
});

// Figure 5: compensation. A: the two parts of the guild and its total; B: synchrony of random genome sets
const C = D.compensation;
lineChart($("r3Guild"), {
  x: D.days, series: [{ name: "guild total", values: C.total, color: "var(--c5)" }, { name: "but genomes", values: C.but_c, color: "var(--c1)" },
    { name: "ptb-buk genomes", values: C.kin_c, color: "var(--c2)" }],
  xLabel: "Day", xName: "Day", yLabel: "Share of the sample's bases (%)", unit: "%", marks: [{ x: 5.5, label: SPLIT }], zero: true,
});
const E = C.hist_edges, H = C.hist, last = H.reduce((k, v, i) => (v > 0 ? i : k), 0);
const obsBin = E.findIndex((e, i) => i < E.length - 1 && C.obs.phi >= e && C.obs.phi < E[i + 1]);
barChart($("r3Null"), {
  labels: H.slice(0, last + 1).map((_, i) => `${E[i].toFixed(2)}-${E[i + 1].toFixed(2)}`), values: H.slice(0, last + 1),
  colors: H.slice(0, last + 1).map((_, i) => (i === obsBin ? "var(--c5)" : "var(--c4)")),
  yLabel: "Random genome sets (count)", fmt: (v) => String(Math.round(v)),
});

// Table 3: sensitivity analyses
const pair = (v) => (v === null || v === undefined ? "–" : Array.isArray(v) ? `${f3(v[0])} → ${f3(v[1])} (${sg(Math.log2(v[1] / v[0]))})` : sg(v));
table($("r3Sens"), {
  columns: [{ key: "label", label: "Variant" }, { key: "but", label: "but", fmt: pair }, { key: "ptb", label: "ptb", fmt: pair },
    { key: "buk_linked", label: "buk (route; see note)", fmt: pair }, { key: "ratio", label: "Ratio, log2 change", fmt: (v) => sg(v) }, { key: "note", label: "Note" }],
  rows: D.sensitivity, sortable: false,
});
