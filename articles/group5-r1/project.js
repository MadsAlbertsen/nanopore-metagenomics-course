// Group 5 article, revision 1 (written by Claude). DATA comes from np26 scripts/45_project_group5.py (write_revision):
// numbers (the report's plus r1_* of the revision), the three Bifidobacterium MAGs, per-day depth and the second
// library, noise classes, the permutation null, phylum sums and the GH13 genes. Numbers derived here are added to N.
const D = DATA, N = D.numbers;
const DAYS = D.days, SWITCH = [{ x: 5.5, label: "diet switch" }], HIGH = [{ from: 1, to: 5.5, label: "high carbohydrate" }];
const f1 = (v) => v.toFixed(1), f2 = (v) => v.toFixed(2), f3 = (v) => v.toFixed(3), f4 = (v) => v.toFixed(4);
const sum = (a) => a.reduce((x, y) => x + y, 0);

// --- numbers derived from the data (nothing typed by hand)
{
  const dep = D.depth;
  N.rep_f52 = f1(dep[4].rep_share / dep[1].rep_share);
  N.mean_low_3 = f3(N.mean_low);
  N.r1_length_fmt = N.r1_length.toLocaleString("en-US");
  N.noise_ratio_max = Math.round(100 * Math.max(...D.noise.classes.map((c) => c.tech / c.temp)));
  N.rep_reads_d6 = D.depth[5].rep_reads;
  N.runs_max_day = D.null.runs.reduce((b, r) => (r.n > b.n ? r : b)).peak_day;
  N.gh_gs = N.r1_gh13_c101_glycogen + N.r1_gh13_c101_sucrose;
  N.gh_branch = N.r1_gh13_c101_pull + N.r1_gh13_c101_olig;
  if (N.gh_gs + N.gh_branch + N.r1_gh13_c101_none !== N.r1_gh13_c101) N.gh_gs = N.gh_branch = "?"; // groups must add up
}
const TWO = new Set(["log2", "r1_step_switch", "r1_step_max", "r1_tech_big", "r1_tech_mid", "r1_tech_low", "r1_temp_big",
  "r1_temp_mid", "r1_temp_low", "r1_c101_tech", "r1_c101_temp", "r1_ch45_r", "r1_steps_r", "r1_rho_min", "r1_rho_max",
  "r1_rep_c101_ratio_min", "r1_rep_c101_ratio_max"]);
const THREE = new Set(["mean_high", "r1_rep_c101_mean_high", "r1_rep_c101_mean_low", "r1_rep_c101_peak"]);
function fillNumbers() {
  document.querySelectorAll("[data-n]").forEach((e) => {
    const k = e.dataset.n, v = N[k];
    e.textContent = v === undefined || v === null ? "?" : TWO.has(k) ? f2(v) : THREE.has(k) ? f3(v)
      : typeof v === "number" ? v.toLocaleString("en-US") : String(v);
  });
}

// --- Figure 1: filtered bases per day (library 1)
function drawDepth() {
  barChart($("r5Depth"), { labels: DAYS.map((d) => `Day ${d}`), values: D.depth.map((r) => r.gbp), yLabel: "Filtered bases (Gbp)", unit: "Gbp", fmt: (v) => f1(v), height: 260 });
}

// --- Table 1: depth and B. angulatum per day in both libraries
function drawTable() {
  const iv = (lo, hi) => (lo === null || hi === null ? "" : `${f4(lo)}-${f4(hi)}`);
  table($("r5Table"), {
    columns: [
      { key: "day", label: "Day", num: true, fmt: String },
      { key: "gbp", label: "Library 1 Gbp", num: true, fmt: f2 },
      { key: "reads", label: "Library 1 reads", num: true, fmt: (v) => v.toLocaleString("en-US") },
      { key: "n50", label: "Read N50 (bp)", num: true, fmt: (v) => v.toLocaleString("en-US") },
      { key: "share", label: "B. angulatum, library 1 (%)", num: true, fmt: f4 },
      { key: "depth", label: "Depth (×)", num: true, fmt: f1 },
      { key: "est_reads", label: "Expected reads", num: true, fmt: (v) => v.toLocaleString("en-US") },
      { key: "ci1", label: "95% interval (%)", fmt: (v, r) => iv(r.share_lo, r.share_hi) },
      { key: "rep_reads", label: "Library 2 reads on B. angulatum", num: true, fmt: String },
      { key: "rep_share", label: "B. angulatum, library 2 (%)", num: true, fmt: f4 },
      { key: "ci2", label: "95% interval (%)", fmt: (v, r) => iv(r.rep_lo, r.rep_hi) },
    ],
    rows: D.depth, sortKey: "day", sortDesc: false,
  });
}

// --- Figure 2: B. angulatum in both libraries (log axis), the other two bifidobacteria from library 1
function drawLine() {
  const [ang, ado, lon] = D.mags;
  lineChart($("r5Line"), {
    x: DAYS, xLabel: "Day", xName: "Day", yLabel: "Share of the day's bases (%, log scale)", unit: "%", logY: true,
    series: [
      { name: "B. angulatum L1", values: ang.share, color: "var(--c1)" },
      { name: "B. angulatum L2", values: D.depth.map((r) => r.rep_share), color: "var(--c2)" },
      { name: "B. adolescentis", values: ado.share, color: "var(--c3)" },
      { name: "B. longum", values: lon.share, color: "var(--c5)" },
    ],
    marks: SWITCH, bands: HIGH, yFmt: (v) => String(+v.toPrecision(2)), height: 320,
  });
}

// --- Figure 3: technical against day-to-day noise (A) and the day 4 -> 5 change in both libraries (B)
function drawNoise() {
  const C = D.noise.classes;
  barChart($("r5Noise"), {
    labels: C.map((c) => `${c.cls} (${c.n})`),
    groups: [{ name: "technical (library 2 vs 1)", values: C.map((c) => c.tech) }, { name: "day-to-day (library 1)", values: C.map((c) => c.temp) }],
    yLabel: "SD of log2 share", fmt: f2, height: 280,
  });
  scatter($("r5Scatter"), {
    points: D.noise.ch45.map((p) => ({ x: p.x, y: p.y, label: p.label, extra: `mean share ${p.mean}%`,
      color: p.focus ? "var(--c2)" : "var(--c1)", size: p.focus ? 7 : 3.5 })),
    xLabel: "log2 change day 4 to 5, library 1", yLabel: "log2 change, library 2", diagonal: true, height: 300,
  });
}

// --- Figure 4: permutation null (A, binned) and the runs of four consecutive days (B)
function drawNull() {
  const W = 5, h = D.null.hist, top = Math.max(...h.map(([k]) => k));
  const bins = [];
  for (let lo = 0; lo <= top; lo += W) bins.push({ lo, n: sum(h.filter(([k]) => k >= lo && k < lo + W).map(([, c]) => c)) });
  const obs = N.r1_obs;
  barChart($("r5Null"), {
    labels: bins.map((b) => `${b.lo}-${b.lo + W - 1}`), values: bins.map((b) => b.n),
    colors: bins.map((b) => (obs >= b.lo && obs < b.lo + W ? "var(--c2)" : "var(--c1)")),
    yLabel: "Ordered sets of four days", fmt: String, height: 280,
  });
  const R = D.null.runs;
  barChart($("r5Runs"), {
    labels: R.map((r) => `peak day ${r.peak_day}`),
    groups: [{ name: "article's rule", values: R.map((r) => r.n) }, { name: `peak ≥ ${N.r1_strict_fold}-fold`, values: R.map((r) => r.strict) }],
    yLabel: "MAGs with the pattern", fmt: String, height: 280,
  });
}

// --- Figure 5: phylum sums per day in both libraries
function drawPhyla() {
  const P = D.phyla;
  lineChart($("r5Phyla"), {
    x: DAYS, xLabel: "Day", xName: "Day", yLabel: "Share of the day's bases (%)", unit: "%",
    series: [
      { name: "Bac.+Act. L1", values: P.ours_pos, color: "var(--c1)" },
      { name: "Bac.+Act. L2", values: P.rep_pos, color: "var(--c2)" },
      { name: "Bacteroidota L1", values: P.ours_bac, color: "var(--c3)" },
      { name: "Bacteroidota L2", values: P.rep_bac, color: "var(--c4)" },
    ],
    marks: SWITCH, bands: HIGH, zero: true, height: 300,
  });
}

// --- Table 2: GH13 genes per MAG with subfamilies
const MAGNAME = Object.fromEntries(D.mags.map((m) => [m.id, m.name]));
function drawGh() {
  const sel = $("r5GhSel");
  if (!sel.options.length) {
    for (const m of D.mags) sel.add(new Option(`${m.name} (${D.gh13.filter((g) => g.mag === m.id).length} GH13 genes)`, m.id));
    sel.addEventListener("change", drawGh);
  }
  table($("r5Gh"), {
    columns: [
      { key: "gene", label: "Gene" }, { key: "subfamilies", label: "GH13 subfamily" },
      { key: "activity", label: "Activity named for the subfamily (cited)" }, { key: "product", label: "Bakta product" },
    ],
    rows: D.gh13.filter((g) => g.mag === sel.value), sortKey: "subfamilies", sortDesc: false,
  });
  sel.title = MAGNAME[sel.value];
}

// --- Response to the reviewers
const RESP = [
  ["R1-M1", "Uneven depth; counting uncertainty; subsample or bootstrap; median baseline",
    `Done. Bases, reads and read N50 per day (Figure 1, Table 1); depth and expected reads of B. angulatum with Poisson intervals for every day; a second library at an equal ${N.r1_rep_reads.toLocaleString("en-US")} reads per day as an independent, rarefied measurement; the median of days 1-4 as the only baseline.`],
  ["R1-M2", "No technical replicate; extraction effects",
    "Partly. The second library repeats library preparation, sequencing and read sampling, and reproduces the course of B. angulatum and the phylum shift on day 5. It does not repeat DNA extraction, whose method is not recorded in the project notes; the Discussion names extraction as the remaining technical explanation."],
  ["R1-M3", "No chance expectation for the day 3-4-5 group; compositional data",
    "Done. 1/8 per MAG and an exact joint permutation null over all ordered four-day sets: the observed count lies within the chance range. The group is now presented as not exceeding chance, and compositional effects are discussed."],
  ["R1-M4", "Abundance estimation under-specified; breadth of coverage",
    "Partly. The share is defined with an equation, mapper and depth format are named; the mapping filters inside mmlong2 were not inspected. Breadth of coverage per day needs the alignment files on the server and was not computed."],
  ["R1-M5", "Annotation: Bakta light database, dbCAN consensus, GH13 subfamilies, median-MAG bias, polishing",
    "Partly. GH13 subfamilies for all three bifidobacteria (Table 2), with activities only where a source names them. The median-MAG comparisons were dropped. Not done: Bakta full database, dbCAN DIAMOND and dbCAN-sub, ANI against the type strain; these are stated as limitations."],
  ["R1-M6", "Versions, HQ definition, deposition",
    "Done for versions (Methods) and the quality classes (CheckM2 thresholds that reproduce mmlong2's class of every MAG). Reads are withheld to protect the participant; controlled-access deposition is named as the route for a submission."],
  ["R2-M1", "Day 3-4-5 group indistinguishable from noise; minimum effect size",
    `Done. Null model (Figure 4A), a stricter rule with at least a ${N.r1_strict_fold}-fold rise, all runs of four consecutive days (Figure 4B), and the replicate check. The Abstract now says the count is within the chance range.`],
  ["R2-M2", "Day 4 is a low point; rank depends on the baseline",
    `Done. One baseline (median of days 1-4) throughout; B. angulatum ranks ${N.r1_med_rank} of ${N.d5_eligible} by it, against ${N.d45_c101_rank_fold} with day 4 as baseline; both are given.`],
  ["R2-M3", "Inconsistent fold baselines; depth on the low days",
    `Done. Depth and expected reads for every day (Table 1); the ${N.r1_f52}-fold rise from day 2 is given with its counting interval and checked in the second library.`],
  ["R2-M4", "Technical alternatives; return to the habitual diet; calories",
    "Done. Phylum sums of Bacillota plus Actinomycetota against Bacteroidota in both libraries (Figure 5); the return to the habitual diet and the change in calories are discussed, with Walker et al."],
  ["R2-M5", "GH13 community signal is circular",
    "Done by removal. The community GH13 density is no longer used; GH13 subfamilies of the three genomes replace it."],
  ["R3-M1", "Gap and novelty not stated",
    "Done. New question: which day-to-day changes of a rare species exceed measured technical noise, whether a co-rising group exceeds chance, and what a closed genome predicts at the subfamily level."],
  ["R3-M2", "Key literature missing",
    "Done. Dense time series (Caporaso, David 2014, Johnson, Vandeputte), technical variability (Voigt, MBQC), compositional data (Friedman and Alm, Gloor), closed genomes from stool (Moss), resistant-starch responders (Ze, Venkataraman, Baxter)."],
  ["R3-M3", "Citations that do not support their sentence",
    "Done. The resistant-starch review and the 2001 prebiotics review were removed; the GH42 and CRISPR references were dropped because those genes are not discussed; 'within days' rests on primary studies."],
  ["R3-M4", "Journal requirements: placeholders, ethics, deposition, code, supplements",
    "Partly. No placeholders remain, but extraction method, sample storage and the second library's kit are stated as not recorded. Ethics: the participant's consent to publication is stated; formal approval is not recorded. Code and derived tables are with the course; no separate supplementary file was made."],
  ["R3-M5", "Figures made for a web page; Figure 3 linear axis; dense gene map",
    "Done. Log axis for B. angulatum (Figure 2); the gene map was replaced by a table of the GH13 genes; legends say how to read each figure and give units and n."],
  ["Editor", "Essential points 1-5; what would make this publishable",
    "Points 1-5 are covered by the rows above (gap: R3-M1 to M3; chance expectation: R1-M3, R2-M1; depth and baseline: R1-M1, R2-M2, R2-M3; technical causes and the habitual diet: R1-M2, R2-M4; methods and figures: R1-M4 to M6, R3-M4, R3-M5). More people or repeated diet switches cannot come from these data; the Conclusions name them as the way to separate diet from time."],
  ["Minor", "Pseudocount, 87% figures, gene and length counts, precision",
    `Done. One log2 definition with a ${N.pseudo}% pseudocount (step at the switch ${f2(N.r1_step_switch)}); the duplicated percentage is gone; the Pyrodigal (${N.pyro_genes.toLocaleString("en-US")}) and Bakta (${N.cds.toLocaleString("en-US")}) gene counts are named in Methods; genome length from the contig table; shares to three decimals.`],
];
function drawResp() {
  table($("r5Resp"), {
    columns: [{ key: "id", label: "Point" }, { key: "ask", label: "What the reviewer asked" }, { key: "resp", label: "How the revision answers it" }],
    rows: RESP.map(([id, ask, resp]) => ({ id, ask, resp })), sortable: false,
  });
}

fillNumbers();
drawDepth(); drawTable(); drawLine(); drawNoise(); drawNull(); drawPhyla(); drawGh(); drawResp();
