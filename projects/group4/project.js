// Group 4: diet periods from CAZyme gene potential vs MAG composition, and stability. DATA from data.json
// (np26 scripts/44_project_group4.py); numbers in the text and in the key findings come from DATA.numbers.
const D = DATA;
const N = D.numbers;
const st = { cat: "abs", sort: "taxa", stab: "taxa", drv: "sp" };
const PROFILE = { taxa: "species mix", functions: "genes", products: "all named genes", markers: "marker genes" };

// a number from DATA.numbers: d = decimals, sign = show + for positive values
function num(key, d, sign) {
  const v = N[key];
  if (v === undefined) throw new Error(`no number ${key} in data.json`);
  if (typeof v !== "number") return String(v);
  const s = d === undefined || d === "" ? String(v) : v.toFixed(+d);
  return sign && v > 0 ? "+" + s : s;
}
for (const e of document.querySelectorAll("[data-n]")) e.textContent = num(e.dataset.n, e.dataset.d, e.dataset.sign);
// key findings (project.yaml takeaways): {key} or {key|decimals} or {key|decimals|+}
const fillText = (t) => t.replace(/\{(\w+)(?:\|(\d))?(\|\+)?\}/g, (m, k, d, s) => num(k, d, !!s));
for (const e of document.querySelectorAll(".closing li")) e.textContent = fillText(e.textContent);

function stats() {
  const items = [[N.n_mags, "MAGs, weighted by their share of each day"], [N.n_families, "degrading CAZy families"],
    [`${N.taxa_correct} / 10`, "days sorted right by species mix"], [`${N.func_correct} / 10`, "days sorted right by genes"]];
  $("pjStats").innerHTML = items.map(([n, t]) => `<div class="stat"><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join("");
}

function tabs(id, key) {
  for (const b of $(id).querySelectorAll("button")) b.setAttribute("aria-selected", String(b.dataset.v === st[key]));
}

function drawCat() {
  tabs("catView", "cat");
  const rel = st.cat === "rel";
  const series = D.categories.map((c) => {
    const m = c.values.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    return { name: c.name, values: rel ? c.values.map((v) => (100 * v) / m) : c.values };
  });
  lineChart($("pjCat"), {
    x: D.days, series, xLabel: "Day", xName: "Day", unit: rel ? "%" : "per 1,000 genes",
    yLabel: rel ? "Percent of the days 1-5 mean (%)" : "Genes per 1,000 genes of the MAGs",
    marks: [{ x: 5.5, label: "diet switch" }], zero: !rel,
  });
}

function drawRed() {
  const order = ["Plant fibre", "Starch", "Fructan", "Host glycans", "Mixed", "Other", "Unmapped"];
  const COLORS = { "Plant fibre": "var(--c1)", Starch: "var(--c2)", Fructan: "var(--c3)", "Host glycans": "var(--c4)",
    Mixed: "var(--c5)", Other: "var(--faint)", Unmapped: "var(--c7)" };
  const pts = [...D.redundancy].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
  scatter($("pjRed"), {
    // no group key: the kit's legend would use its own colour order; our own legend below
    points: pts.map((r) => ({ x: r.carriers, y: r.cv, label: r.family, color: COLORS[r.category],
      extra: `${r.category} · ${r.mean} per 1,000 genes` })),
    xLabel: "Common MAGs carrying the family (log scale)", yLabel: "Day-to-day variation (CV, %)", logX: true,
  });
  const host = $("pjRedLegend");
  host.innerHTML = "";
  chartLegend(host, order.filter((c) => pts.some((r) => r.category === c)).map((c) => ({ name: c, color: COLORS[c] })));
}

function drawBeyond() {
  const B = D.beyond;
  // own colours (blue / orange mean down / up in Figure 6); one point per set and carrier group with >= 3 functions,
  // placed at the group's median number of carriers
  const COL = ["var(--c3)", "var(--c4)", "var(--faint)", "var(--c5)"];
  const pts = B.sets.flatMap((s, si) => B.bins.map((b, i) => ({ s, si, b, i })).filter(({ s, i }) => s.n[i] >= 3)
    .map(({ s, si, b, i }) => ({ x: s.carriers[i], y: s.median[i], label: s.name, color: COL[si], size: 6,
      extra: `${b} common MAG${b === "1" ? "" : "s"} · ${s.n[i]} functions` })));
  scatter($("pjBeyond"), { points: pts, logX: true, xLabel: "Common MAGs carrying the function (median of the group, log scale)",
    yLabel: "Median day-to-day variation (CV, %)", height: 300 });
  const lg = $("pjBeyondLegend");
  lg.innerHTML = "";
  chartLegend(lg, B.sets.map((s, si) => ({ name: s.name, color: COL[si] })));
  const cols = [{ key: "name", label: "Set" },
    ...B.bins.map((b, i) => ({ key: `n${i}`, label: `${b} MAG${b === "1" ? "" : "s"} (n)`, num: true, fmt: (v) => String(v) })),
    { key: "all", label: "Median CV (%)", num: true, fmt: (v) => v.toFixed(1) },
    { key: "ratio", label: "Ratio to other Bakta names (95% interval: functions; days)",
      fmt: (v, r) => (r.ref ? "1 (reference)" : `${v[0].toFixed(2)} (${v[1].toFixed(2)}-${v[2].toFixed(2)}; ${r.day[0].toFixed(2)}-${r.day[1].toFixed(2)})`) }];
  const rows = B.sets.map((s) => ({ name: s.name, all: s.all_median, ratio: s.ratio, day: s.day_ci, ref: s.name === "Other Bakta names",
    ...Object.fromEntries(s.n.map((n, i) => [`n${i}`, n])) }));
  table($("pjBeyondTable"), { columns: cols, rows, sortable: false });
  const dash = (d) => (v) => (v === null ? "–" : v.toFixed(d));
  table($("pjMarkers"), {
    columns: [{ key: "name", label: "Gene" }, { key: "ko", label: "KO" }, { key: "group", label: "Group" }, { key: "what", label: "What it does" },
      { key: "carriers", label: "Common MAGs", num: true, fmt: (v) => String(v) },
      { key: "mean", label: "Per 1,000 genes", num: true, fmt: dash(3) },
      { key: "cv", label: "CV (%)", num: true, fmt: dash(1) },
      { key: "log2", label: "log2 change", num: true, fmt: dash(2) }],
    rows: B.markers, sortKey: "carriers", sortDesc: true, maxRows: 12,
  });
}

function drawSort() {
  tabs("sortView", "sort");
  const rows = D.loo[st.sort];
  // grey = sorted right, purple = sorted wrong (not blue / orange: those mean down / up in Figure 6)
  barChart($("pjSort"), {
    labels: rows.map((r) => `Day ${r.day}${r.correct ? "" : " ✗"}`), values: rows.map((r) => r.margin),
    colors: rows.map((r) => (r.correct ? "var(--faint)" : "var(--c7)")),
    yLabel: `Margin (Bray-Curtis, ${PROFILE[st.sort]})`,
    fmt: (v) => v.toFixed(3),
  });
  table($("pjSortTable"), {
    columns: [{ key: "day", label: "Day", num: true, fmt: (v) => String(v) }, { key: "period", label: "Period" },
      { key: "own", label: "To own period", num: true, fmt: (v) => v.toFixed(3) },
      { key: "other", label: "To other period", num: true, fmt: (v) => v.toFixed(3) },
      { key: "assigned", label: "Sorted into" }],
    rows, sortable: false,
  });
}

function drawStab() {
  tabs("stabView", "stab");
  lineChart($("pjDrift"), {
    x: D.days, series: [{ name: "To days 1-5", values: D.to_first[st.stab] }], xLabel: "Day", xName: "Day",
    yLabel: `To days 1-5 (Bray-Curtis, ${PROFILE[st.stab]})`, marks: [{ x: 5.5, label: "diet switch" }], zero: true, height: 240,
  });
  const names = D.days.map((d) => `Day ${d}`);
  heatmap($("pjHeat"), { rows: names, cols: names, values: D.bc[st.stab].map((r, i) => r.map((v, j) => (i === j ? null : v))), label: `Bray-Curtis (${PROFILE[st.stab]})`, format: (v) => (v === null ? "–" : v.toFixed(3)) });
  const s = D.stability[st.stab];
  barChart($("pjStab"), {
    labels: ["All pairs of days", "Neighbouring days"],
    groups: [["Days 1-5", s.first], ["Days 6-10", s.second], ["Days 7-10", s.late]].map(([name, x]) => ({ name, values: [x.all_mean, x.cons_mean] })),
    yLabel: `Mean Bray-Curtis (${PROFILE[st.stab]})`, fmt: (v) => v.toFixed(3), height: 230,
  });
}

function drawFam() {
  const f = D.families;
  const c1 = "var(--c1)", c2 = "var(--c2)";
  barChart($("pjFam"), {
    labels: f.map((r) => `${r.family} (${r.category})`), values: f.map((r) => r.log2), horizontal: true,
    colors: f.map((r) => (r.log2 > 0 ? c2 : c1)), yLabel: "log2 change, days 6-10 over days 1-5", fmt: (v) => v.toFixed(2),
  });
  table($("pjFamTable"), {
    columns: [{ key: "family", label: "Family" }, { key: "category", label: "Substrate group" },
      { key: "first", label: "Days 1-5 (per 1,000 genes)", num: true, fmt: (v) => v.toFixed(2) },
      { key: "second", label: "Days 6-10 (per 1,000 genes)", num: true, fmt: (v) => v.toFixed(2) },
      { key: "log2", label: "log2 change", num: true, fmt: (v) => v.toFixed(2) },
      { key: "apart", label: "Periods apart", fmt: (v) => (v ? "yes" : "no") },
      { key: "top_mag", label: "Main MAG (where higher)" },
      { key: "top_pct", label: "Its part (%)", num: true, fmt: (v) => v.toFixed(0) }],
    rows: f, filter: true, sortKey: "log2", sortDesc: true,
  });
}

function drawDrv() {
  tabs("drvView", "drv");
  const k = st.drv, R = D.drivers;
  const top = [...R.mags].sort((a, b) => Math.abs(b[k]) - Math.abs(a[k])).slice(0, 15);
  // orange = the MAG's share rose, blue = it fell (as in Figure 6)
  barChart($("pjDrv"), {
    labels: top.map((r) => r.name), values: top.map((r) => r[k]), horizontal: true,
    colors: top.map((r) => (r.dir > 0 ? "var(--c2)" : "var(--c1)")),
    yLabel: k === "sp" ? "Part of the species-mix change (%)" : "Part of the gene-profile change (%)", unit: "%",
    fmt: (v) => v.toFixed(1),
  });
  const lg = $("pjDrvLegend");
  lg.innerHTML = "";
  chartLegend(lg, [{ name: "Share rose", color: "var(--c2)" }, { name: "Share fell", color: "var(--c1)" }]);
  table($("pjDrvFam"), {
    columns: [{ key: "family", label: "Family" }, { key: "phylum", label: "Phylum" },
      { key: "sp", label: "Species mix (%)", num: true, fmt: (v) => (Math.abs(v) < 0.05 ? "0.0" : v.toFixed(1)) },
      { key: "gp", label: "Gene profile (%)", num: true, fmt: (v) => (Math.abs(v) < 0.05 ? "0.0" : v.toFixed(1)) }],
    rows: R.families, sortKey: k, sortDesc: true, maxRows: 10,
  });
  table($("pjDrvCat"), {
    columns: [{ key: "name", label: "Substrate group" },
      { key: "d", label: "Change (per 1,000 genes)", num: true, fmt: (v) => (v > 0 ? "+" : "") + v.toFixed(3) },
      { key: "top", label: "Largest MAG parts (per 1,000 genes)",
        fmt: (v) => v.map((t) => `${t.name} ${t.c > 0 ? "+" : ""}${t.c.toFixed(3)}`).join("; ") }],
    rows: R.cats, sortable: false,
  });
}

function drawStrain() {
  // orange = rose, blue = fell at least two-fold (as in Figure 6); grey = the rest
  const col = (r) => (r.log2 >= 1 ? "var(--c2)" : r.log2 <= -1 ? "var(--c1)" : "var(--faint)");
  scatter($("pjStrain"), {
    points: D.strains.map((r) => ({ x: r.var, y: r.cv, label: r.name, color: col(r),
      extra: `${r.phylum} · variant sites ${r.var}% · change log2 ${r.log2} · depth ${r.depth}x` })),
    logX: true, xLabel: "Variant sites (% of the MAG's positions, log scale)", yLabel: "Day-to-day variation (CV, %)",
  });
  const lg = $("pjStrainLegend");
  lg.innerHTML = "";
  chartLegend(lg, [{ name: "Rose >= 2-fold", color: "var(--c2)" }, { name: "Fell >= 2-fold", color: "var(--c1)" },
    { name: "Less than 2-fold", color: "var(--faint)" }]);
  const NAME = { low: "Least variable third", middle: "Middle third", high: "Most variable third" };
  table($("pjThirds"), {
    columns: [{ key: "third", label: "MAGs", fmt: (v) => NAME[v] },
      { key: "n", label: "n", num: true, fmt: (v) => String(v) },
      { key: "var_lo", label: "Variant sites (%)", num: true, fmt: (v, r) => `${v.toFixed(4)}-${r.var_hi.toFixed(4)}` },
      { key: "cv", label: "Median CV (%)", num: true, fmt: (v) => v.toFixed(0) },
      { key: "abslog2", label: "Median |log2 change|", num: true, fmt: (v) => v.toFixed(2) },
      { key: "depth", label: "Median depth (x)", num: true, fmt: (v) => v.toFixed(0) },
      { key: "up", label: "Rose >= 2-fold", num: true, fmt: (v) => String(v) },
      { key: "down", label: "Fell >= 2-fold", num: true, fmt: (v) => String(v) }],
    rows: D.thirds, sortable: false,
  });
  const dash = (d) => (v) => (v === null ? "–" : v.toFixed(d));
  table($("pjStrainTable"), {
    columns: [{ key: "name", label: "MAG" }, { key: "phylum", label: "Phylum" },
      { key: "var", label: "Variant sites (%)", num: true, fmt: (v) => v.toFixed(4) },
      { key: "maf", label: "Minor allele fraction", num: true, fmt: dash(2) },
      { key: "sh", label: "CheckM strain het.", num: true, fmt: dash(0) },
      { key: "depth", label: "Depth (x)", num: true, fmt: (v) => v.toFixed(0) },
      { key: "share", label: "Mean share (%)", num: true, fmt: (v) => v.toFixed(2) },
      { key: "cv", label: "CV (%)", num: true, fmt: (v) => v.toFixed(0) },
      { key: "log2", label: "log2 change", num: true, fmt: (v) => v.toFixed(2) }],
    rows: D.strains, filter: true, sortKey: "var", sortDesc: true, maxRows: 12,
  });
}

// not blue / orange (down / up elsewhere on the page)
const FCOL = { close: "var(--c3)", distant: "var(--c4)", domain: "var(--c5)", none: "var(--c7)", noncoding: "var(--faint)", unbinned: "var(--ink)" };
function drawFunc() {
  const F = D.fshare;
  lineChart($("pjFunc"), {
    x: D.days, series: F.classes.map((c) => ({ name: c.name, values: c.values, color: FCOL[c.key] })), xLabel: "Day", xName: "Day",
    yLabel: "Share of the day's DNA (%)", unit: "%", marks: [{ x: 5.5, label: "diet switch" }], zero: true,
  });
  const dna = Object.fromEntries(F.classes.map((c) => [c.key, c.values]));
  const stat = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return `${m.toFixed(1)} (${Math.min(...v).toFixed(1)}-${Math.max(...v).toFixed(1)})`; };
  const rows = [...F.genes.map((g) => ({ name: g.name, n: g.n, pct: g.pct, dna: stat(dna[g.key]) })),
    ...F.classes.filter((c) => !F.genes.some((g) => g.key === c.key)).map((c) => ({ name: c.name, n: null, pct: null, dna: stat(c.values) }))];
  table($("pjFuncTable"), {
    columns: [{ key: "name", label: "Level" }, { key: "n", label: "Genes", num: true, fmt: (v) => (v === null ? "–" : v.toLocaleString("en")) },
      { key: "pct", label: "Share of genes (%)", num: true, fmt: (v) => (v === null ? "–" : v.toFixed(1)) },
      { key: "dna", label: "Share of the day's DNA, mean (range) (%)" }],
    rows, sortable: false,
  });
}

function drawAll() { drawCat(); drawRed(); drawBeyond(); drawSort(); drawStab(); drawFam(); drawDrv(); drawStrain(); drawFunc(); }

for (const [id, key, draw] of [["catView", "cat", drawCat], ["sortView", "sort", drawSort], ["stabView", "stab", drawStab], ["drvView", "drv", drawDrv]]) {
  $(id).addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-v]");
    if (!b) return;
    st[key] = b.dataset.v;
    draw();
  });
}

stats();
drawAll();
