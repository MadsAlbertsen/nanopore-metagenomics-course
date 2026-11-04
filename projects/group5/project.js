// Group 5: Bifidobacterium angulatum (MAG c.101). DATA from np26 scripts/45_project_group5.py:
// numbers (every number in the text), days / diet, mags (the three Bifidobacterium MAGs: share per day, period means),
// samples (Table 1: one row per sample, base share, day-to-day step, read-sample counts), period_stats (Table 2),
// carb (Table 3: carbohydrate genes of c.101), map (c.101's genes: [start, stop, strand, symbol, product, evidence,
// identity %, CAZy families, CAZy class, carbohydrate role]; lookups products, symbols, families, classes, roles,
// evidence; crispr arrays; ori), categories + cat_counts (degrading CAZyme genes per substrate category), families
// (genes per family), groups + members (named-gene groups), context (Figure 4 / Table 5: per sample % of the filtered
// bases in HQ / MQ MAGs, unbinned contigs, not on the assembly; c.101's share, share of MAG bases and rank), gh13
// (Figure 5 / Table 6: daily share of GH13 carriers, GH13 density, top carriers), species (Figure 6: top 10 species),
// day5 (Figure 7 / Table 7: riser counts per day, the day-5 risers with daily shares and CAZyme densities), unbinned
// (Figure 8 / Table 8: unbinned share per day by contig size class, the top listable unbinned contigs).
const D = DATA, N = D.numbers, MAP = D.map, FOCUS = D.mags[0];
const short = (m) => m.name.replace(/^Bifidobacterium /, "B. ").replace(/ \(.*\)$/, "");
const num = (v) => (typeof v === "number" ? v.toLocaleString("en-US") : String(v));
// derived numbers for the text (all from data.json)
N.id = FOCUS.id;
N.length_bp = fmtBp(N.length);
N.step_max_from = N.step_max_day - 1;
{
  const r = D.samples.map((s) => s.reads).sort((a, b) => a - b);
  N.rd_one_read = +(100 / ((r[4] + r[5]) / 2)).toFixed(3); // one read as % of the median sample
}

const EV = {
  cluster: { c: "var(--c1)", t: "Named protein cluster (UniRef50)" },
  blast_rule: { c: "var(--c7)", t: "NCBI BlastRules reference protein" },
  amr_protein: { c: "var(--c2)", t: "AMRFinderPlus resistance protein" },
  amr_family: { c: "var(--c4)", t: "AMRFinderPlus resistance family" },
  is_element: { c: "var(--c6)", t: "Insertion sequence name" },
  pfam_only: { c: "var(--c3)", t: "Hypothetical, Pfam domain only" },
  cluster_unnamed: { c: "var(--c5)", t: "Cluster match, cluster has no name" },
  none: { c: "var(--faint)", t: "Hypothetical, no match" },
  rna: { c: "var(--v2)", t: "tRNA or rRNA gene" },
};
// carbohydrate colouring: degrading enzymes by substrate category, the other roles by role
const CZ = {
  starch: { c: "var(--c1)", t: "Degrading: starch" },
  fructan: { c: "var(--c2)", t: "Degrading: fructan" },
  plant_fibre: { c: "var(--c3)", t: "Degrading: plant fibre" },
  host_glycan: { c: "var(--c4)", t: "Degrading: host glycan" },
  mixed_other: { c: "var(--c5)", t: "Degrading: mixed or other substrate" },
};
const ROLE_C = {
  named_enzyme: { c: "var(--v0)", t: "Part of a sugar-cleaving enzyme (by name only)" },
  gt: { c: "var(--c7)", t: "Builds or binds sugar chains (GT, or CBM only)" },
  transport: { c: "var(--c6)", t: "Sugar uptake (transporter part)" },
  shunt: { c: "var(--ink)", t: "Bifid shunt and sugar conversion" },
};
const roleColorKey = { gt: "gt", cbm: "gt", named_enzyme: "named_enzyme", transport: "transport", shunt: "shunt", conversion: "shunt" };
const ROLE_LABEL = Object.fromEntries(MAP.roles.map((k, i) => [k, MAP.role_labels[i]]));
const ROLE_SHORT = Object.fromEntries(MAP.roles.map((k, i) => [k, MAP.role_short[i]]));
const CAT_LABEL = { starch: "Starch", fructan: "Fructan", plant_fibre: "Plant fibre", host_glycan: "Host glycan", mixed: "Mixed", other: "Other" };
const EV_LABEL = { cluster: "named cluster", blast_rule: "BlastRules", pfam_only: "Pfam domain only", cluster_unnamed: "unnamed cluster", none: "no match", rna: "RNA gene", amr_protein: "AMR protein", amr_family: "AMR family", is_element: "IS name" };
const DEFAULTS = { gh: "share", reads: false, rel: false, log: false, color: "carb", labels: true, q: "", role: "", group: D.groups[0].key, unit: "genes" };
const st = { ...DEFAULTS };
// Table 3 rows as objects; lookup of a gene's carbohydrate row by its position
const CARB = D.carb.data.map((row) => Object.fromEntries(D.carb.columns.map((c, i) => [c, row[i]])));
const CARB_AT = new Map(CARB.map((c) => [c.start + ":" + c.stop, c]));

// context shares (Figure 4) keep one decimal: 56.0, not 56
const CTX1 = /^ctx_(hq|mq|mag|unbinned|off|asm|rs_all_mag|rs_kept_asm)_(min|max|pooled|high|low)$|^ctx_gbp$|^gh13_(share|ofmag)_(min|max|high|low)$/;
function fillNumbers() {
  document.querySelectorAll("[data-n]").forEach((e) => {
    const k = e.dataset.n;
    e.textContent = !(k in N) ? "?" : CTX1.test(k) ? N[k].toFixed(1) : num(N[k]);
  });
}
function stats() {
  const items = [[N.size_mb + " Mb", "one circular contig"], [num(N.cds), "protein-coding genes"], [N.carb_total, "carbohydrate genes (Table 3)"], [N.mean_all + "%", "mean share of the bases"], [N.log2, "log2 change, days 6-10 vs 1-5"]];
  $("pjStats").innerHTML = items.map(([n, t]) => `<div class="stat"><b>${esc(String(n))}</b><span>${esc(t)}</span></div>`).join("");
}

// --- Output 1: Figure 1
function drawLine() {
  // read share (few reads per day) as points with 95% intervals, not as a line; hidden on the log axis, where its
  // zero days cannot be drawn. The chart kit draws lines, so its read line is hidden and the intervals are added here.
  const reads = st.reads && !st.log;
  const series = [{ name: "share of bases", values: FOCUS.share, color: "var(--c1)" }];
  if (reads) series.push({ name: "share of reads", values: D.samples.map((s) => s.read_pct), color: "var(--c2)" });
  if (st.rel) D.mags.slice(1).forEach((m, i) => series.push({ name: short(m), values: m.share, color: i ? "var(--c4)" : "var(--c3)" }));
  const hi = reads ? Math.max(...D.samples.map((s) => s.read_hi)) : null;
  lineChart($("g5Line"), {
    x: D.days, series, xLabel: "Day", xName: "Day",
    yLabel: "Relative abundance (%)", unit: "%", logY: st.log, zero: !st.log, ...(reads ? { yRange: [0, Math.ceil(hi * 10) / 10] } : {}),
    bands: [{ from: 0.6, to: 5.5, label: "high carbohydrate" }], marks: [{ x: 5.5, label: "diet switch" }],
  });
  if (reads) readIntervals();
}
function readIntervals() {
  const svg = $("g5Line").querySelector("svg");
  if (!svg) return;
  const dots = (c) => [...svg.querySelectorAll("circle")].filter((e) => (e.getAttribute("style") || "").includes(c));
  const base = dots("var(--c1)"), rd = dots("var(--c2)");
  svg.querySelectorAll("path").forEach((p) => { if ((p.getAttribute("style") || "").includes("stroke:var(--c2)")) p.style.display = "none"; });
  if (base.length !== D.days.length || rd.length !== D.days.length) return;
  // y position of a value, from two base points with different values (linear axis)
  const v = FOCUS.share, i0 = v.indexOf(Math.min(...v)), i1 = v.indexOf(Math.max(...v));
  const y0 = +base[i0].getAttribute("cy"), y1 = +base[i1].getAttribute("cy"), k = (y1 - y0) / (v[i1] - v[i0]);
  const y = (val) => y0 + (val - v[i0]) * k;
  D.samples.forEach((s, j) => {
    const x = +rd[j].getAttribute("cx") + 4;
    rd[j].setAttribute("cx", x);
    const ln = el("line", { x1: x, x2: x, y1: y(s.read_lo), y2: y(s.read_hi), style: "stroke:var(--c2)", "stroke-width": 1.5, opacity: 0.7 }, svg);
    tipOn(ln, `<b>Day ${s.day}</b><br>share of reads ${s.read_pct}% (${s.mag_reads} of ${num(s.reads)} reads)<br>95% interval ${s.read_lo}-${s.read_hi}%`);
  });
}
{
  // the chart kit redraws on resize and colour-scheme change; add the intervals again after it
  let t;
  const again = () => { clearTimeout(t); t = setTimeout(() => { if (st.reads && !st.log) readIntervals(); }, 300); };
  addEventListener("resize", again);
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", again);
}

// --- Output 2: Tables 1 and 2
const f3 = (v) => (v === null || v === undefined ? "" : v.toFixed(3));
function drawTable() {
  const rows = D.samples.map((s) => ({ ...s, period: s.diet === "high_carb" ? "high carbohydrate" : "low carbohydrate", ci: `${f3(s.read_lo)}-${f3(s.read_hi)}` }));
  table($("g5Table"), {
    columns: [
      { key: "sample", label: "Sample" }, { key: "day", label: "Day", num: true, fmt: String }, { key: "period", label: "Diet period" },
      { key: "share", label: "Share of bases (%)", num: true, fmt: f3 },
      { key: "step", label: "Change from day before (log2)", num: true, fmt: (v) => (v === null ? "" : (v > 0 ? "+" : "") + v.toFixed(2)) },
      { key: "mag_reads", label: "Reads on the MAG", num: true, fmt: String }, { key: "reads", label: "Filtered reads", num: true, fmt: num },
      { key: "read_pct", label: "Share of reads (%)", num: true, fmt: f3 }, { key: "ci", label: "95% interval (%)" },
    ],
    rows, sortable: false,
  });
}
function drawStats() {
  const P = D.period_stats, lab = { high: "Days 1-5 (high carbohydrate)", low: "Days 6-10 (low carbohydrate)", all: "All ten days" };
  const rows = ["high", "low", "all"].map((k) => ({ period: lab[k], ...P[k], range: `${f3(P[k].min)} (day ${P[k].min_day}) - ${f3(P[k].max)} (day ${P[k].max_day})` }));
  table($("g5Stats"), {
    columns: [
      { key: "period", label: "Period" }, { key: "mean", label: "Mean (%)", num: true, fmt: f3 }, { key: "median", label: "Median (%)", num: true, fmt: f3 },
      { key: "sd", label: "SD (%)", num: true, fmt: f3 }, { key: "cv", label: "CV (%)", num: true, fmt: String },
      { key: "range", label: "Lowest - highest (%)" }, { key: "fold", label: "Highest / lowest", num: true, fmt: String },
      { key: "step_mean", label: "Mean day-to-day change (|log2|)", num: true, fmt: (v) => v.toFixed(2) },
      { key: "step_max", label: "Largest day-to-day change (|log2|)", num: true, fmt: (v) => v.toFixed(2) },
    ],
    rows, sortable: false,
  });
}

// --- Output 3: Figure 2 (circular gene map) and Table 3
const geneName = (g) => (g[3] >= 0 ? MAP.symbols[g[3]] : "");
const geneProd = (g) => MAP.products[g[4]];
const geneFam = (g) => (g[7] >= 0 ? MAP.families[g[7]] : "");
const geneRole = (g) => (g[9] >= 0 ? MAP.roles[g[9]] : "");
const matches = (g, q) => { q = q.toLowerCase(); return [geneName(g), geneProd(g), geneFam(g)].some((t) => t.toLowerCase().includes(q)); };
function geneColor(g) {
  if (st.color === "evidence") return EV[MAP.evidence[g[5]]].c;
  const r = geneRole(g);
  if (r === "degrading") return CZ[MAP.classes[g[8]]].c;
  return r ? ROLE_C[roleColorKey[r]].c : "var(--v4)";
}
function arc(cx, cy, r0, r1, a0, a1) {
  const p = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)}A${r1},${r1} 0 ${large} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0},${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
}
function geneTip(g) {
  const ev = MAP.evidence[g[5]], c = CARB_AT.get(g[0] + ":" + g[1]);
  return `<b>${esc(geneName(g) || "–")}</b> ${esc(geneProd(g))}<br>position ${num(g[0])}-${num(g[1])} (${g[2] > 0 ? "forward" : "reverse"} strand)<br>evidence: ${esc(EV[ev].t)}${g[6] !== null ? ` · identity ${g[6]}%` : ""}` +
    (c ? `<br>role: ${esc(ROLE_LABEL[c.role])}` : "") + (g[7] >= 0 ? `<br>CAZy family: ${esc(geneFam(g))}` : "") +
    (c && c.category ? ` (${esc(CAT_LABEL[c.category] || c.category)})` : "") + (c && c.substrates ? `<br>dbCAN-listed substrates: ${esc(c.substrates)}` : "");
}
// map labels: degrading enzymes by their (first degrading) CAZy family, bifid-shunt genes by enzyme, the Leloir genes
// as one group label at their middle
function mapLabels() {
  const out = [], leloir = [];
  for (const g of MAP.genes) {
    const r = geneRole(g);
    if (r === "degrading") out.push({ pos: (g[0] + g[1]) / 2, t: geneFam(g).split(" + ").find((f) => /^(GH|PL|CE)/.test(f)), g });
    else if (r === "shunt") out.push({ pos: (g[0] + g[1]) / 2, t: (geneProd(g).match(/(phosphoketolase|transaldolase|transketolase)/i) || [geneProd(g)])[0].toLowerCase(), g });
    else if (r === "conversion") {
      const m = geneProd(g).match(/(xylose isomerase|arabinose isomerase)/i);
      if (m) out.push({ pos: (g[0] + g[1]) / 2, t: m[0].toLowerCase(), g }); else leloir.push(g);
    }
  }
  if (leloir.length) out.push({ pos: leloir.reduce((s, g) => s + (g[0] + g[1]) / 2, 0) / leloir.length, t: "galactose genes", g: leloir[0] });
  return out.sort((a, b) => a.pos - b.pos);
}
function spread(angles, gap) {
  // keep labels at least `gap` radians apart: push forward, then centre each pushed run on its genes
  const a = [...angles];
  for (let i = 1; i < a.length; i++) a[i] = Math.max(a[i], a[i - 1] + gap);
  let i = 0;
  while (i < a.length) {
    let j = i;
    while (j + 1 < a.length && a[j + 1] - a[j] <= gap + 1e-9) j++;
    let shift = 0;
    for (let k = i; k <= j; k++) shift += a[k] - angles[k];
    shift /= j - i + 1;
    for (let k = i; k <= j; k++) a[k] -= shift;
    i = j + 1;
  }
  for (let k = 1; k < a.length; k++) a[k] = Math.max(a[k], a[k - 1] + gap);
  return a;
}
function drawMap() {
  const host = $("g5Map");
  mountChart(host, () => {
    const W = Math.min(560, Math.max(300, host.clientWidth || 560)), H = W;
    const lab = st.labels && W >= 420;
    host.innerHTML = "";
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Circular gene map", style: "overflow:visible" }, host);
    const cx = W / 2, cy = H / 2, R = W / 2 - (lab ? 82 : 34), L = MAP.length;
    const ang = (pos) => (pos / L) * 2 * Math.PI - Math.PI / 2;
    // scale ticks every 250 kb (labels outside, or inside when gene labels take the outside)
    for (let p = 0; p < L; p += 250000) {
      const a = ang(p), c = Math.cos(a), s = Math.sin(a);
      el("line", { x1: cx + (R + 2) * c, y1: cy + (R + 2) * s, x2: cx + (R + 6) * c, y2: cy + (R + 6) * s, class: "base" }, svg);
      const rl = lab ? R - 62 : R + 22;
      if (p % 500000 === 0) el("text", { x: cx + rl * c, y: cy + rl * s + 4, "text-anchor": "middle" }, svg).textContent = (p / 1e6).toFixed(1) + " Mb";
    }
    el("circle", { cx, cy, r: R - 15, fill: "none", class: "base" }, svg);
    const q = st.q.trim(), hits = [];
    for (const g of MAP.genes) {
      const a0 = ang(g[0]), a1 = Math.max(ang(g[1]), a0 + 0.004);
      const [r0, r1] = g[2] > 0 ? [R - 13, R] : [R - 30, R - 17];
      const dim = q && !matches(g, q);
      const p = el("path", { d: arc(cx, cy, r0, r1, a0, a1), style: `fill:${geneColor(g)}`, opacity: dim ? 0.35 : 1 }, svg);
      tipOn(p, () => geneTip(g));
      if (q && !dim) hits.push(g);
    }
    if (lab) {
      const labs = mapLabels(), rT = R + 14;
      const pos = spread(labs.map((l) => ang(l.pos)), 10 / rT);
      labs.forEach((l, i) => {
        const a0 = ang(l.pos), a = pos[i];
        el("path", { d: `M${cx + (R + 2) * Math.cos(a0)},${cy + (R + 2) * Math.sin(a0)}L${cx + (R + 7) * Math.cos(a0)},${cy + (R + 7) * Math.sin(a0)}L${cx + (rT - 2) * Math.cos(a)},${cy + (rT - 2) * Math.sin(a)}`, fill: "none", style: `stroke:${st.color === "evidence" ? "var(--faint)" : geneColor(l.g)}`, "stroke-width": 1 }, svg);
        const left = Math.cos(a) < 0, deg = (a * 180) / Math.PI + (left ? 180 : 0);
        const t = el("text", { x: cx + rT * Math.cos(a), y: cy + rT * Math.sin(a), "text-anchor": left ? "end" : "start", "dominant-baseline": "middle", transform: `rotate(${deg.toFixed(1)} ${(cx + rT * Math.cos(a)).toFixed(1)} ${(cy + rT * Math.sin(a)).toFixed(1)})`, style: "font-size:9px;fill:var(--ink)" }, svg);
        t.textContent = l.t;
        tipOn(t, () => geneTip(l.g));
      });
    }
    for (const g of hits) {
      const a = ang((g[0] + g[1]) / 2), c = Math.cos(a), s = Math.sin(a);
      const m = el("line", { x1: cx + (R - 32) * c, y1: cy + (R - 32) * s, x2: cx + (R - 40) * c, y2: cy + (R - 40) * s, style: "stroke:var(--ink)", "stroke-width": 2 }, svg);
      tipOn(m, () => geneTip(g));
    }
    for (const [a, b] of MAP.crispr) {
      const t = ang((a + b) / 2), c = Math.cos(t), s = Math.sin(t);
      const px = cx + (R - 40) * c, py = cy + (R - 40) * s;
      const m = el("path", { d: `M${px},${py - 5}L${px + 4},${py}L${px},${py + 5}L${px - 4},${py}Z`, fill: "none", style: "stroke:var(--muted)", "stroke-width": 1.5 }, svg);
      tipOn(m, `<b>CRISPR array</b><br>position ${num(a)}-${num(b)}`);
    }
    for (const o of MAP.ori) {
      const t = ang(o), c = Math.cos(t), s = Math.sin(t);
      const px = cx + (R - 42) * c, py = cy + (R - 42) * s;
      const m = el("path", { d: `M${px},${py - 6}L${px + 5.5},${py + 4}L${px - 5.5},${py + 4}Z`, fill: "none", style: "stroke:var(--muted)", "stroke-width": 1.5 }, svg);
      tipOn(m, `<b>Start of replication (oriC)</b><br>position ${num(o)}`);
    }
    const lines = [[short(FOCUS), "lab"], [`${FOCUS.id} · ${fmtBp(L)}`, ""], [`${num(N.cds)} protein-coding genes`, ""], [`${N.carb_total} carbohydrate genes`, ""]];
    lines.forEach(([t, c], i) => { el("text", { x: cx, y: cy - 22 + i * 17, "text-anchor": "middle", class: c }, svg).textContent = t; });
    $("g5Count").textContent = q ? `${hits.length} gene${hits.length === 1 ? "" : "s"} match` : st.labels && !lab ? "labels need a wider screen (see Table 3)" : "";
    drawHits(hits);
  });
}
function drawLegend() {
  const items = st.color === "carb" ? [...Object.values(CZ), ...Object.values(ROLE_C)].map((v) => ({ name: v.t, color: v.c })).concat([{ name: "Other gene", color: "var(--v4)" }])
    : Object.entries(EV).filter(([k]) => MAP.genes.some((g) => MAP.evidence[g[5]] === k)).map(([, v]) => ({ name: v.t, color: v.c }));
  $("g5Legend").innerHTML = items.map((it) => `<span><i class="sw" style="background:${it.color}"></i>${esc(it.name)}</span>`).join("") +
    `<span><svg width="12" height="12" style="vertical-align:-1px;margin-right:4px"><path d="M6,1L10,6L6,11L2,6Z" fill="none" style="stroke:var(--muted)" stroke-width="1.5"/></svg>CRISPR array</span>` +
    `<span><svg width="12" height="12" style="vertical-align:-1px;margin-right:4px"><path d="M6,1L11,10L1,10Z" fill="none" style="stroke:var(--muted)" stroke-width="1.5"/></svg>Start of replication</span>`;
}
function drawHits(hits) {
  const box = $("g5Hits");
  if (!st.q.trim()) {
    box.innerHTML = `<p class="note">Type a name above (for example <code>amylase</code>, <code>GH13</code> or <code>transporter</code>) to list and mark matching genes; Table 3 below lists every carbohydrate gene.</p>`;
    return;
  }
  box.innerHTML = hits.length ? `<div class="scroll g5list"><table class="ct"><thead><tr><th class="r">Start</th><th>Gene</th><th>Product</th><th>CAZy</th><th>Evidence</th><th class="r">Identity</th></tr></thead><tbody>${hits.map((g) => `<tr><td class="r">${num(g[0])}</td><td class="mono">${esc(geneName(g))}</td><td>${esc(geneProd(g))}</td><td class="mono">${esc(geneFam(g))}</td><td>${esc(EV_LABEL[MAP.evidence[g[5]]])}</td><td class="r">${g[6] !== null ? g[6] + "%" : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">No gene matches.</p>`;
}
function drawCarb() {
  $("g5Role").value = st.role;
  const rows = CARB.filter((c) => !st.role || c.role === st.role).map((c) => ({ ...c, roleL: ROLE_SHORT[c.role], catL: CAT_LABEL[c.category] || "", evL: EV_LABEL[c.evidence] || c.evidence }));
  table($("g5Carb"), {
    columns: [
      { key: "start", label: "Start (bp)", num: true, fmt: num }, { key: "gene", label: "Gene" },
      { key: "product", label: "Product (Bakta)" }, { key: "roleL", label: "Role" }, { key: "family", label: "CAZy family" },
      { key: "catL", label: "Substrate category" }, { key: "substrates", label: "Substrates dbCAN lists for the family" },
      { key: "evL", label: "Evidence" }, { key: "identity", label: "Identity (%)", num: true, fmt: (v) => (v === null ? "" : String(v)) },
    ],
    rows, sortKey: "start", sortDesc: false, filter: true, filterPlaceholder: "filter, e.g. GH13 or sucrose", maxRows: 25,
  });
}

// --- Figure 3
function drawCazy() {
  const cats = D.categories, per = st.unit === "per1000";
  const median = D.cat_counts.median;
  const groups = [...D.mags.map((m) => ({ name: `${short(m)} (${m.id})`, values: D.cat_counts[m.id].map((v) => (per ? (1000 * v) / m.genes : v)) })),
    { name: `Median MAG (all ${N.n_mags})`, values: per ? cats.map((c) => N[`median1000_${c}`] ?? null) : median }];
  barChart($("g5Bar"), { labels: cats.map((c) => CAT_LABEL[c]), groups: per ? groups.slice(0, 3) : groups, yLabel: per ? "Genes per 1,000 genes" : "Genes per MAG", unit: per ? "per 1,000 genes" : "genes", height: 260 });
  const fams = D.families;
  heatmap($("g5Heat"), {
    rows: [...D.mags.map((m) => `${short(m)} (${m.id})`), "Median MAG"], cols: fams.map((f) => f.family),
    values: [...D.mags.map((m) => fams.map((f) => f[m.id])), fams.map((f) => f.median)],
    label: "genes per family", min: 0, format: (v) => (v === null ? "–" : String(+v.toFixed(1))), colLabelHeight: 46,
  });
  // family details in the heatmap tooltips: substrate category and share of MAGs
  const rects = $("g5Heat").querySelectorAll("rect");
  rects.forEach((r, i) => {
    const f = fams[i % fams.length], row = Math.floor(i / fams.length);
    const v = row < 3 ? f[D.mags[row].id] : f.median;
    tipOn(r, `<b>${esc(f.family)}</b> · ${row < 3 ? esc(short(D.mags[row])) : "median MAG"}<br>${v} gene${v === 1 ? "" : "s"}<br>substrate category: ${esc(CAT_LABEL[f.category] || f.category)}<br>${f.share}% of all MAGs carry it`);
  });
}

// --- Figure 4
function drawGroups() {
  table($("g5Groups"), {
    columns: [{ key: "label", label: "Gene group (search on Bakta's names)" }, ...D.mags.map((m) => ({ key: m.id, label: `${short(m)} (${m.id})`, num: true, fmt: String }))],
    rows: D.groups, sortable: false,
  });
  $("g5Grp").value = st.group;
  const mem = D.members[st.group] || [];
  table($("g5Members"), {
    columns: [{ key: "start", label: "Start", num: true }, { key: "gene", label: "Gene" }, { key: "product", label: "Product" }, { key: "ev", label: "Evidence" }, { key: "id", label: "Identity (%)", num: true, fmt: (v) => (v === null ? "" : String(v)) }],
    rows: mem.map(([, start, gene, product, ev, id]) => ({ start, gene, product, ev: EV_LABEL[ev] || ev, id })), sortKey: "start", sortDesc: false,
  });
}

// --- Figure 4 and Table 5: share of each sample's filtered bases in HQ / MQ MAGs, unbinned contigs, not on the
// assembly (custom stacked bars: the chart kit has no stacked bar chart)
const CTX = [["hq", "HQ MAGs", "var(--c1)"], ["mq", "MQ MAGs", "var(--c3)"], ["unbinned", "Unbinned contigs", "var(--c4)"], ["off", "Not on the assembly", "var(--c2)"]];
function drawCtx() {
  const host = $("g5CtxFig"), S = D.context;
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 320);
    const box = { l: 56, r: W - 12, t: 22, b: H - 48 };
    const n = S.length, band = (box.r - box.l) / n, bw = band * 0.72;
    const y = scale(0, 100, box.b, box.t);
    axes(svg, () => 0, y, box, { yLabel: "Share of the filtered bases (%)", xTicks: [], yTicks: y.ticks(5) });
    const hi = S.filter((s) => s.diet === "high_carb").length, small = band < 46;
    el("text", { x: box.l + (band * hi) / 2, y: box.t - 8, "text-anchor": "middle", class: "note" }, svg).textContent = small ? "high carb" : "high carbohydrate";
    el("text", { x: box.l + band * (hi + (n - hi) / 2), y: box.t - 8, "text-anchor": "middle", class: "note" }, svg).textContent = small ? "low carb" : "low carbohydrate";
    S.forEach((s, i) => {
      const xc = box.l + band * (i + 0.5);
      let acc = 0;
      for (const [k, name, color] of CTX) {
        const v = s[k];
        const rect = el("rect", { x: xc - bw / 2, y: y(acc + v), width: bw, height: y(acc) - y(acc + v), style: `fill:${color}` }, svg);
        tipOn(rect, `<b>${esc(s.sample)} · day ${s.day}</b> (${s.gbp.toFixed(2)} Gbp)<br>${esc(name)}: ${v.toFixed(1)}%` +
          (k === "hq" ? `<br><i>B. angulatum</i>: ${s.c101.toFixed(3)}% of all bases, ${s.c101_of_mag.toFixed(3)}% of the MAG bases, rank ${s.c101_rank} of ${N.n_mags}` : ""));
        acc += v;
      }
      el("text", { x: xc, y: box.b + 16, "text-anchor": "middle" }, svg).textContent = small ? String(s.day) : s.sample;
      if (!small) el("text", { x: xc, y: box.b + 30, "text-anchor": "middle", class: "note" }, svg).textContent = "day " + s.day;
    });
    el("line", { x1: box.l + band * hi, x2: box.l + band * hi, y1: box.t, y2: box.b, class: "mark" }, svg);
    if (small) el("text", { x: (box.l + box.r) / 2, y: box.b + 34, "text-anchor": "middle", class: "lab" }, svg).textContent = "Day (sample DNA01-DNA10)";
    chartLegend(host, CTX.map(([, name, color]) => ({ name, color })));
  });
  const f1 = (v) => v.toFixed(1);
  table($("g5CtxTable"), {
    columns: [
      { key: "sample", label: "Sample" }, { key: "day", label: "Day", num: true, fmt: String }, { key: "gbp", label: "Gbp", num: true, fmt: (v) => v.toFixed(2) },
      { key: "hq", label: "HQ MAGs %", num: true, fmt: f1 }, { key: "mq", label: "MQ MAGs %", num: true, fmt: f1 }, { key: "mag", label: "All MAGs %", num: true, fmt: f1 },
      { key: "unbinned", label: "Unbinned contigs %", num: true, fmt: f1 }, { key: "off", label: "Not on assembly %", num: true, fmt: f1 },
      { key: "c101", label: "B. angulatum % of bases", num: true, fmt: (v) => v.toFixed(3) },
      { key: "c101_of_mag", label: "% of MAG bases", num: true, fmt: (v) => v.toFixed(3) }, { key: "c101_rank", label: "Rank", num: true, fmt: String },
    ],
    rows: D.context, sortKey: "day", sortDesc: false,
  });
}

// --- Figure 5 and Table 6: GH13 carriers
const GH_LAB = { share: "Share of all bases (%)", of_mag: "Share of the bases in MAGs (%)", dens: "GH13 genes per 1,000 genes" };
function drawGh() {
  const G = D.gh13, k = st.gh;
  const series = [{ name: k === "dens" ? "all MAGs" : "GH13 carriers", values: G[k], color: "var(--c1)" }];
  if (k === "dens") series.push({ name: "without 3 risers", values: G.dens_wo, color: "var(--muted)" });
  lineChart($("g5GhLine"), {
    x: D.days, series, xLabel: "Day", xName: "Day", yLabel: GH_LAB[k], unit: k === "dens" ? "" : "%", zero: false,
    bands: [{ from: 0.6, to: 5.5, label: "high carbohydrate" }], marks: [{ x: 5.5, label: "diet switch" }],
  });
  if (k === "dens") $("g5GhLine").querySelectorAll("path").forEach((p) => { if ((p.getAttribute("style") || "").includes("--muted")) p.setAttribute("stroke-dasharray", "5 4"); });
  table($("g5GhTable"), {
    columns: [
      { key: "name", label: "MAG" }, { key: "gh13", label: "GH13 genes", num: true, fmt: String }, { key: "per1000", label: "per 1,000 genes", num: true, fmt: (v) => v.toFixed(1) },
      { key: "mean_high", label: "Days 1-5 %", num: true, fmt: (v) => v.toFixed(2) }, { key: "mean_low", label: "Days 6-10 %", num: true, fmt: (v) => v.toFixed(2) },
      { key: "log2", label: "log2 change", num: true, fmt: (v) => v.toFixed(2) }, { key: "contrib_pct", label: "Part of community GH13 %", num: true, fmt: (v) => v.toFixed(1) },
    ],
    rows: G.top, sortKey: "contrib_pct", sortDesc: true,
  });
}

// --- Figure 6: top 10 species
function drawTop() {
  const S = D.species, lab = (x) => x.species;
  barChart($("g5TopBar"), {
    labels: S.map(lab), horizontal: true, yLabel: "Share of the bases (%)", unit: "%",
    groups: [{ name: "mean of all ten days", values: S.map((x) => x.mean) }, { name: "days 1-5", values: S.map((x) => x.high) }, { name: "days 6-10", values: S.map((x) => x.low) }],
  });
  const nw = narrow($("g5TopHeat"));
  heatmap($("g5TopHeat"), { rows: S.map((x) => (nw ? abbr(x.species) : x.species)), cols: D.days.map((d) => (nw ? String(d) : "day " + d)), values: S.map((x) => x.share), label: "share of the bases (%)", min: 0, format: (v) => (v === null ? "–" : v.toFixed(2)), colLabelHeight: 46 });
  const rects = $("g5TopHeat").querySelectorAll("rect");
  rects.forEach((r, i) => {
    const x = S[Math.floor(i / D.days.length)], d = D.days[i % D.days.length];
    tipOn(r, `<b>${esc(x.species)}</b> · day ${d}<br>${x.share[i % D.days.length].toFixed(2)}% of the bases<br>MAG${x.mags.length > 1 ? "s" : ""}: ${x.mags.map((m, j) => esc(m) + " (" + esc(x.quality[j]) + ")").join(", ")}`);
  });
}

// --- Figure 7 and Table 7: the day-5 risers
// the kit's diverging legend shows no magnitudes: replace it with the scale's end values (again after each redraw)
let d5Span = 0;
function d5Legend() {
  const leg = $("g5D5Heat").querySelector(".legend");
  if (leg && d5Span) leg.innerHTML = `<span>log2 of share / median of days 1-4 (diverging scale): ${(-d5Span).toFixed(1)} <i class="ramp" style="display:inline-block;width:120px;height:10px;vertical-align:-1px;background:linear-gradient(90deg,var(--c1),var(--v4),var(--c2))"></i> +${d5Span.toFixed(1)} (0 = equal, 1 = twice, -1 = half)</span>`;
}
{
  let t;
  const again = () => { clearTimeout(t); t = setTimeout(d5Legend, 300); };
  addEventListener("resize", again);
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", again);
}
// narrow screens: day numbers as column labels and genus initials in row labels, so that the heatmap cells stay readable
const narrow = (host) => (host.clientWidth || 640) < 560;
const abbr = (name) => name.replace(/^([A-Z])[a-z]+(?:_[A-Z])? (?=[a-z])/, "$1. ");
function drawDay5() {
  const R = D.day5;
  // grouped bars (plain / diet-adjusted) with the diet switch between day 5 and day 6 (custom: the kit's barChart
  // has no marks)
  const host = $("g5D5Bar"), C = R.counts, G = [["risers", "plain shares", "var(--c1)"], ["adj", "diet-adjusted", "var(--c3)"]];
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 230);
    const box = { l: 56, r: W - 12, t: 22, b: H - 30 };
    const n = C.length, band = (box.r - box.l) / n, bw = (band * 0.7) / G.length;
    const y = scale(0, Math.ceil(Math.max(...C.map((c) => Math.max(c.risers, c.adj))) / 5) * 5, box.b, box.t);
    axes(svg, () => 0, y, box, { yLabel: "Rising MAGs", xTicks: [], yTicks: y.ticks(4) });
    C.forEach((c, i) => {
      const xc = box.l + band * (i + 0.5);
      el("text", { x: xc, y: box.b + 16, "text-anchor": "middle" }, svg).textContent = band < 60 ? String(c.day) : "day " + c.day;
      G.forEach(([k, name, color], gi) => {
        const v = c[k], xx = xc - (bw * G.length) / 2 + gi * bw;
        const rect = el("rect", { x: xx, y: y(v), width: bw - 1, height: y(0) - y(v), style: `fill:${color}`, rx: 2 }, svg);
        tipOn(rect, `<b>Day ${c.day}</b> · ${esc(name)}<br>${v} rising MAGs` + (c.within !== null && k === "risers" ? `<br>against the low-carbohydrate days before only: ${c.within}` : ""));
      });
    });
    const xs = box.l + band; // between day 5 and day 6
    el("line", { x1: xs, x2: xs, y1: box.t, y2: box.b, class: "mark" }, svg);
    el("text", { x: xs + 4, y: box.t - 6, class: "note" }, svg).textContent = "diet switch";
    chartLegend(host, G.map(([, name, color]) => ({ name, color })));
  });
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return (b[1] + b[2]) / 2; };
  const vals = R.risers.map((x) => { const m = med(x.share.slice(0, 4)); return x.share.map((v) => (m > 0 && v > 0 ? Math.log2(v / m) : null)); });
  const nw = narrow($("g5D5Heat"));
  heatmap($("g5D5Heat"), { rows: R.risers.map((x) => (nw ? abbr(x.name) : x.name)), cols: D.days.map((d) => (nw ? String(d) : "day " + d)), values: vals, diverging: true, center: 0, label: "log2 of share / median of days 1-4", format: (v) => (v === null || v === undefined ? "–" : v.toFixed(2)), colLabelHeight: 46 });
  d5Span = Math.max(...vals.flat().filter((v) => v !== null).map(Math.abs));
  d5Legend();
  table($("g5D5Table"), {
    columns: [
      { key: "name", label: "MAG" }, { key: "phylum", label: "Phylum" }, { key: "family", label: "Family" }, { key: "quality", label: "Quality" },
      { key: "d4", label: "Day 4 %", num: true, fmt: (v) => v.toFixed(3) }, { key: "d5", label: "Day 5 %", num: true, fmt: (v) => v.toFixed(3) }, { key: "d6", label: "Day 6 %", num: true, fmt: (v) => v.toFixed(3) },
      { key: "fold", label: "Fold rise", num: true, fmt: (v) => v.toFixed(1) }, { key: "deg1000", label: "Degrading CAZymes /1,000", num: true, fmt: (v) => v.toFixed(1) }, { key: "starch1000", label: "Starch genes /1,000", num: true, fmt: (v) => v.toFixed(1) },
    ],
    rows: R.risers, sortKey: "fold", sortDesc: true,
  });
}

// --- Figure 8 and Table 8: unbinned contigs (custom stacked bars, as Figure 4)
const UB = [["large", "at least 1 Mb", "var(--c1)"], ["mid", "100 kb to 1 Mb", "var(--c3)"], ["small", "below 100 kb", "var(--c4)"]];
function drawUb() {
  const host = $("g5UbFig"), U = D.unbinned, S = D.context;
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 280);
    const box = { l: 56, r: W - 12, t: 22, b: H - 48 };
    const n = S.length, band = (box.r - box.l) / n, bw = band * 0.72;
    const tot = S.map((_, i) => UB.reduce((a, [k]) => a + U.by_size[k][i], 0));
    const y = scale(0, Math.ceil(Math.max(...tot) / 5) * 5, box.b, box.t);
    axes(svg, () => 0, y, box, { yLabel: "Share of the filtered bases (%)", xTicks: [], yTicks: y.ticks(5) });
    const hi = S.filter((s) => s.diet === "high_carb").length, small = band < 46;
    S.forEach((s, i) => {
      const xc = box.l + band * (i + 0.5);
      let acc = 0;
      for (const [k, name, color] of UB) {
        const v = U.by_size[k][i];
        const rect = el("rect", { x: xc - bw / 2, y: y(acc + v), width: bw, height: y(acc) - y(acc + v), style: `fill:${color}` }, svg);
        tipOn(rect, `<b>${esc(s.sample)} · day ${s.day}</b><br>unbinned contigs ${esc(name)}: ${v.toFixed(2)}%<br>all unbinned: ${tot[i].toFixed(1)}%; ten with the largest share: ${U.top10[i].toFixed(1)}%`);
        acc += v;
      }
      el("text", { x: xc, y: box.b + 16, "text-anchor": "middle" }, svg).textContent = small ? String(s.day) : s.sample;
      if (!small) el("text", { x: xc, y: box.b + 30, "text-anchor": "middle", class: "note" }, svg).textContent = "day " + s.day;
    });
    el("line", { x1: box.l + band * hi, x2: box.l + band * hi, y1: box.t, y2: box.b, class: "mark" }, svg);
    if (small) el("text", { x: (box.l + box.r) / 2, y: box.b + 34, "text-anchor": "middle", class: "lab" }, svg).textContent = "Day (sample DNA01-DNA10)";
    chartLegend(host, UB.map(([, name, color]) => ({ name, color })));
  });
  const KIND = { deep: "deeper than any MAG", large: "large", fragment: "fragment" };
  const methyl = (r) => [r.flagged === null ? "" : `${r.flagged}/${r.windows} flagged`, r.placed ? `placed in ${r.placed} (${r.placed_ratio}x)` : ""].filter(Boolean).join("; ") || "–";
  table($("g5UbTable"), {
    columns: [
      { key: "id", label: "Contig" }, { key: "length_kb", label: "kb", num: true, fmt: (v) => v.toLocaleString("en-US") },
      { key: "depth", label: "Depth", num: true, fmt: (v) => v.toLocaleString("en-US") + "x" }, { key: "circular", label: "Circ.", fmt: (v) => (v ? "yes" : "no") },
      { key: "gc", label: "GC %", num: true, fmt: (v) => v.toFixed(1) }, { key: "species", label: "Species (Metabuli)" },
      { key: "mag_depth", label: "Same-species MAG", num: true, fmt: (v) => (v === null ? "–" : v.toLocaleString("en-US") + "x") },
      { key: "mean", label: "Mean %", num: true, fmt: (v) => v.toFixed(2) }, { key: "max", label: "Max %", num: true, fmt: (v) => v.toFixed(2) },
      { key: "flagged", label: "Methylation", fmt: (v, r) => methyl(r) },
      { key: "kind", label: "Class", fmt: (v) => KIND[v] || v },
    ],
    rows: D.unbinned.top, sortKey: "mean", sortDesc: true,
  });
}

function drawAll() {
  $("g5Reads").checked = st.reads; $("g5Rel").checked = st.rel; $("g5Log").checked = st.log;
  $("g5Color").value = st.color; $("g5Lab").checked = st.labels; $("g5Q").value = st.q; $("g5Unit").value = st.unit;
  drawLine(); drawTable(); drawStats(); drawLegend(); drawMap(); drawCarb(); drawCazy(); drawGroups(); drawCtx(); $("g5GhSel").value = st.gh; drawGh(); drawTop(); drawDay5(); drawUb();
}
function write() {
  writeHashParams({ reads: st.reads ? 1 : "", rel: st.rel ? 1 : "", log: st.log ? 1 : "", color: st.color !== DEFAULTS.color ? st.color : "", lab: st.labels ? "" : 0, q: st.q, role: st.role, group: st.group !== DEFAULTS.group ? st.group : "", unit: st.unit !== DEFAULTS.unit ? st.unit : "", gh: st.gh !== DEFAULTS.gh ? st.gh : "" });
}
const applyState = (s) => {
  Object.assign(st, DEFAULTS);
  if (s.reads === "1") st.reads = true;
  if (s.rel === "1") st.rel = true;
  if (s.log === "1") st.log = true;
  if (s.color === "evidence") st.color = "evidence";
  if (s.lab === "0") st.labels = false;
  st.q = s.q || "";
  if (s.role && MAP.roles.includes(s.role)) st.role = s.role;
  if (s.group && D.members[s.group]) st.group = s.group;
  if (s.unit === "per1000") st.unit = "per1000";
  if (s.gh in GH_LAB) st.gh = s.gh;
};

$("g5Grp").innerHTML = D.groups.map((g) => `<option value="${g.key}">${esc(g.label)}</option>`).join("");
$("g5Role").innerHTML = `<option value="">all ${CARB.length} carbohydrate genes</option>` +
  MAP.roles.map((k) => `<option value="${k}">${esc(ROLE_LABEL[k])} (${CARB.filter((c) => c.role === k).length})</option>`).join("");
$("g5Reads").addEventListener("change", (e) => { st.reads = e.target.checked; drawLine(); write(); });
$("g5Rel").addEventListener("change", (e) => { st.rel = e.target.checked; drawLine(); write(); });
$("g5Log").addEventListener("change", (e) => { st.log = e.target.checked; drawLine(); write(); });
$("g5Color").addEventListener("change", (e) => { st.color = e.target.value; drawLegend(); drawMap(); write(); });
$("g5Lab").addEventListener("change", (e) => { st.labels = e.target.checked; drawMap(); write(); });
$("g5Q").addEventListener("input", (e) => { st.q = e.target.value; drawMap(); write(); });
$("g5Role").addEventListener("change", (e) => { st.role = e.target.value; drawCarb(); write(); });
$("g5Unit").addEventListener("change", (e) => { st.unit = e.target.value; drawCazy(); write(); });
$("g5GhSel").addEventListener("change", (e) => { st.gh = e.target.value; drawGh(); write(); });
$("g5Grp").addEventListener("change", (e) => { st.group = e.target.value; drawGroups(); write(); });

fillNumbers();
stats();
(function start() {
  const p = readHashParams();
  applyState(p);
  drawAll();
})();
