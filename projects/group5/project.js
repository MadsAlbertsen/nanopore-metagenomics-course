// Group 5: Bifidobacterium angulatum (MAG c.101). DATA from np26 scripts/45_project_group5.py:
// numbers (every number in the text), days / diet, mags (the three Bifidobacterium MAGs: share per day, period means),
// map (c.101's genes: [start, stop, strand, symbol, product, evidence, identity %, CAZy families, CAZy class];
// lookups products, symbols, families, classes, evidence; crispr arrays; ori), categories + cat_counts (degrading
// CAZyme genes per substrate category), families (genes per family), groups + members (named-gene groups).
const D = DATA, N = D.numbers, MAP = D.map, FOCUS = D.mags[0];
const short = (m) => m.name.replace(/^Bifidobacterium /, "B. ").replace(/ \(.*\)$/, "");
const num = (v) => (typeof v === "number" ? v.toLocaleString("en-US") : String(v));
// derived numbers for the text (all from data.json)
N.id = FOCUS.id;
N.length_bp = fmtBp(N.length);
// guided-example answers: {key} is replaced by DATA.numbers[key]
for (const e of EXAMPLES) for (const k of ["question", "answer"]) e[k] = e[k].replace(/\{(\w+)\}/g, (m, key) => (key in N ? num(N[key]) : m));

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
const CZ = {
  starch: { c: "var(--c1)", t: "Degrading: starch" },
  fructan: { c: "var(--c2)", t: "Degrading: fructan" },
  plant_fibre: { c: "var(--c3)", t: "Degrading: plant fibre" },
  host_glycan: { c: "var(--c4)", t: "Degrading: host glycan" },
  mixed_other: { c: "var(--c5)", t: "Degrading: mixed or other substrate" },
  gt: { c: "var(--c7)", t: "Glycosyltransferase (builds sugar chains)" },
  cbm: { c: "var(--c6)", t: "Carbohydrate-binding module only" },
};
const CAT_LABEL = { starch: "Starch", fructan: "Fructan", plant_fibre: "Plant fibre", host_glycan: "Host glycan", mixed: "Mixed", other: "Other" };
const EV_LABEL = { cluster: "named cluster", blast_rule: "BlastRules", pfam_only: "Pfam domain only", cluster_unnamed: "unnamed cluster", none: "no match", rna: "RNA gene", amr_protein: "AMR protein", amr_family: "AMR family", is_element: "IS name" };
const DEFAULTS = { highlight: FOCUS.id, log: true, color: "evidence", q: "", group: D.groups[0].key, unit: "genes" };
const st = { ...DEFAULTS };

function fillNumbers() {
  document.querySelectorAll("[data-n]").forEach((e) => {
    const k = e.dataset.n;
    e.textContent = k in N ? num(N[k]) : "?";
  });
}
function stats() {
  const items = [[N.size_mb + " Mb", "one circular contig"], [num(N.cds), "protein-coding genes"], [N.mean_all + "%", "mean share of the bases"], [N.log2, "log2 change, days 6-10 vs 1-5"], [N.deg_c101, "carbohydrate-degrading enzyme genes"]];
  $("pjStats").innerHTML = items.map(([n, t]) => `<div class="stat"><b>${esc(String(n))}</b><span>${esc(t)}</span></div>`).join("");
}

// --- Figure 1 and Table 1
function drawLine() {
  lineChart($("g5Line"), {
    x: D.days, series: D.mags.map((m) => ({ name: short(m), values: m.share })), xLabel: "Day", xName: "Day",
    yLabel: "Share of the day's bases (%)", unit: "%", logY: st.log, zero: !st.log,
    bands: [{ from: 0.6, to: 5.5, label: "high carbohydrate" }], marks: [{ x: 5.5, label: "diet switch" }],
    highlight: short(D.mags.find((m) => m.id === st.highlight) || FOCUS),
  });
}
function drawTable() {
  const rows = D.days.map((d, i) => ({ day: String(d), diet: D.diet[i] === "high_carb" ? "high carbohydrate" : "low carbohydrate", ...Object.fromEntries(D.mags.map((m) => [m.id, m.share[i]])) }));
  rows.push({ day: "mean 1-5", diet: "", ...Object.fromEntries(D.mags.map((m) => [m.id, m.mean_high])) });
  rows.push({ day: "mean 6-10", diet: "", ...Object.fromEntries(D.mags.map((m) => [m.id, m.mean_low])) });
  rows.push({ day: "log2 change", diet: "", ...Object.fromEntries(D.mags.map((m) => [m.id, m.log2])) });
  table($("g5Table"), {
    columns: [{ key: "day", label: "Day" }, { key: "diet", label: "Diet" }, ...D.mags.map((m) => ({ key: m.id, label: `${short(m)} (${m.id})`, num: true, fmt: (v) => (v === undefined ? "" : v.toFixed(3)) }))],
    rows, sortable: false,
  });
}

// --- Figure 2: circular gene map
const geneName = (g) => (g[3] >= 0 ? MAP.symbols[g[3]] : "");
const geneProd = (g) => MAP.products[g[4]];
const geneFam = (g) => (g[7] >= 0 ? MAP.families[g[7]] : "");
const matches = (g, q) => { q = q.toLowerCase(); return [geneName(g), geneProd(g), geneFam(g)].some((t) => t.toLowerCase().includes(q)); };
function geneColor(g) {
  if (st.color === "cazy") return g[8] >= 0 ? CZ[MAP.classes[g[8]]].c : "var(--v4)";
  return EV[MAP.evidence[g[5]]].c;
}
function arc(cx, cy, r0, r1, a0, a1) {
  const p = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)}A${r1},${r1} 0 ${large} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0},${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
}
function geneTip(g) {
  const ev = MAP.evidence[g[5]];
  return `<b>${esc(geneName(g) || "–")}</b> ${esc(geneProd(g))}<br>position ${num(g[0])}-${num(g[1])} (${g[2] > 0 ? "forward" : "reverse"} strand)<br>evidence: ${esc(EV[ev].t)}${g[6] !== null ? ` · identity ${g[6]}%` : ""}${g[7] >= 0 ? `<br>CAZy family: ${esc(geneFam(g))} (${esc(CZ[MAP.classes[g[8]]].t)})` : ""}`;
}
function drawMap() {
  const host = $("g5Map");
  mountChart(host, () => {
    const W = Math.min(560, Math.max(300, host.clientWidth || 560)), H = W;
    host.innerHTML = "";
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Circular gene map" }, host);
    const cx = W / 2, cy = H / 2, R = W / 2 - 34, L = MAP.length;
    const ang = (pos) => (pos / L) * 2 * Math.PI - Math.PI / 2;
    // scale ticks every 250 kb
    for (let p = 0; p < L; p += 250000) {
      const a = ang(p), c = Math.cos(a), s = Math.sin(a);
      el("line", { x1: cx + (R + 2) * c, y1: cy + (R + 2) * s, x2: cx + (R + 6) * c, y2: cy + (R + 6) * s, class: "base" }, svg);
      if (p % 500000 === 0) el("text", { x: cx + (R + 22) * c, y: cy + (R + 22) * s + 4, "text-anchor": "middle" }, svg).textContent = (p / 1e6).toFixed(1) + " Mb";
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
    for (const g of hits) {
      const a = ang((g[0] + g[1]) / 2), c = Math.cos(a), s = Math.sin(a);
      const m = el("line", { x1: cx + (R + 3) * c, y1: cy + (R + 3) * s, x2: cx + (R + 13) * c, y2: cy + (R + 13) * s, style: "stroke:var(--ink)", "stroke-width": 2 }, svg);
      tipOn(m, () => geneTip(g));
    }
    for (const [a, b] of MAP.crispr) {
      const t = ang((a + b) / 2), c = Math.cos(t), s = Math.sin(t);
      const m = el("line", { x1: cx + (R - 34) * c, y1: cy + (R - 34) * s, x2: cx + (R - 44) * c, y2: cy + (R - 44) * s, style: "stroke:var(--c2)", "stroke-width": 2.5 }, svg);
      tipOn(m, `<b>CRISPR array</b><br>position ${num(a)}-${num(b)}`);
    }
    for (const o of MAP.ori) {
      const t = ang(o), c = Math.cos(t), s = Math.sin(t);
      const m = el("line", { x1: cx + (R - 34) * c, y1: cy + (R - 34) * s, x2: cx + (R - 50) * c, y2: cy + (R - 50) * s, style: "stroke:var(--ink)", "stroke-width": 2 }, svg);
      tipOn(m, `<b>Start of replication (oriC)</b><br>position ${num(o)}`);
    }
    const lines = [[short(FOCUS), "lab"], [`${FOCUS.id} · ${fmtBp(L)}`, ""], [`${num(N.cds)} protein-coding genes`, ""], [`${N.gc}% GC`, ""]];
    lines.forEach(([t, c], i) => { el("text", { x: cx, y: cy - 22 + i * 17, "text-anchor": "middle", class: c }, svg).textContent = t; });
    $("g5Count").textContent = q ? `${hits.length} gene${hits.length === 1 ? "" : "s"} match` : "";
    drawHits(hits);
  });
}
function drawLegend() {
  const items = st.color === "cazy" ? Object.values(CZ).map((v) => ({ name: v.t, color: v.c })).concat([{ name: "Not a CAZyme", color: "var(--v4)" }])
    : Object.entries(EV).filter(([k]) => MAP.genes.some((g) => MAP.evidence[g[5]] === k)).map(([, v]) => ({ name: v.t, color: v.c }));
  $("g5Legend").innerHTML = items.map((it) => `<span><i class="sw" style="background:${it.color}"></i>${esc(it.name)}</span>`).join("") +
    `<span><i class="sw" style="background:var(--c2)"></i>CRISPR array (inner tick)</span>`;
}
function drawHits(hits) {
  const box = $("g5Hits");
  if (!st.q.trim()) {
    const cz = MAP.genes.filter((g) => g[7] >= 0);
    box.innerHTML = `<p class="note">${cz.length} genes carry a CAZyme domain. Type a name above (for example <code>bile</code>, <code>GH13</code> or <code>Cas</code>) to list and mark matching genes.</p>`;
    return;
  }
  box.innerHTML = hits.length ? `<div class="scroll g5list"><table class="ct"><thead><tr><th class="r">Start</th><th>Gene</th><th>Product</th><th>CAZy</th><th>Evidence</th><th class="r">Identity</th></tr></thead><tbody>${hits.map((g) => `<tr><td class="r">${num(g[0])}</td><td class="mono">${esc(geneName(g))}</td><td>${esc(geneProd(g))}</td><td class="mono">${esc(geneFam(g))}</td><td>${esc(EV_LABEL[MAP.evidence[g[5]]])}</td><td class="r">${g[6] !== null ? g[6] + "%" : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">No gene matches.</p>`;
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

function drawAll() {
  $("g5Log").checked = st.log; $("g5Hl").value = st.highlight; $("g5Color").value = st.color; $("g5Q").value = st.q; $("g5Unit").value = st.unit;
  drawLine(); drawTable(); drawLegend(); drawMap(); drawCazy(); drawGroups();
}
function write() { writeHashParams({ ex: examples.current >= 0 ? examples.current + 1 : "", log: st.log ? "" : 0, hl: st.highlight !== DEFAULTS.highlight ? st.highlight : "", color: st.color !== DEFAULTS.color ? st.color : "", q: st.q, group: st.group !== DEFAULTS.group ? st.group : "", unit: st.unit !== DEFAULTS.unit ? st.unit : "" }); }
const applyState = (s) => {
  Object.assign(st, DEFAULTS);
  if (s.highlight && D.mags.some((m) => m.id === s.highlight)) st.highlight = s.highlight;
  if ("log" in s) st.log = !!s.log;
  if (s.color === "cazy") st.color = "cazy";
  st.q = s.q || "";
  if (s.group && D.members[s.group]) st.group = s.group;
  if (s.unit === "per1000") st.unit = "per1000";
};

$("g5Hl").innerHTML = D.mags.map((m) => `<option value="${m.id}">${esc(short(m))} (${m.id})</option>`).join("");
$("g5Grp").innerHTML = D.groups.map((g) => `<option value="${g.key}">${esc(g.label)}</option>`).join("");
$("g5Log").addEventListener("change", (e) => { st.log = e.target.checked; drawLine(); write(); });
$("g5Hl").addEventListener("change", (e) => { st.highlight = e.target.value; drawLine(); write(); });
$("g5Color").addEventListener("change", (e) => { st.color = e.target.value; drawLegend(); drawMap(); write(); });
$("g5Q").addEventListener("input", (e) => { st.q = e.target.value; drawMap(); write(); });
$("g5Unit").addEventListener("change", (e) => { st.unit = e.target.value; drawCazy(); write(); });
$("g5Grp").addEventListener("change", (e) => { st.group = e.target.value; drawGroups(); write(); });

const examples = setupExamples($("pjExamples"), (k) => { applyState(EXAMPLES[k].state); drawAll(); write(); });
fillNumbers();
stats();
(function start() {
  const p = readHashParams(), ex = parseInt(p.ex, 10);
  if (ex >= 1 && ex <= EXAMPLES.length) { examples.current = ex - 1; examples.draw(); applyState(EXAMPLES[ex - 1].state); }
  else applyState({ highlight: p.hl, ...(p.log === "0" ? { log: false } : {}), color: p.color, q: p.q, group: p.group, unit: p.unit });
  drawAll();
})();
