// Group 5 article: B. angulatum. DATA is a subset of projects/group5/data.json (the report) plus day4to5 (np26 scripts/45).
// Numbers in the text come from DATA.numbers (data-n); numbers derived from DATA below are added to N here.
const D = DATA, N = D.numbers, MAP = D.map, FOCUS = D.mags[0];
const short = (m) => m.name.replace(/^Bifidobacterium /, "B. ").replace(/ \(.*\)$/, "");
const num = (v) => (typeof v === "number" ? v.toLocaleString("en-US") : String(v));
const f1 = (v) => v.toFixed(1);
const st = { color: "carb", labels: true, q: "" };
const sum = (a) => a.reduce((x, y) => x + y, 0);

// numbers derived from the data (nothing typed by hand)
N.length_bp = fmtBp(N.length);
N.carb_pct = f1(100 * N.carb_total / N.cds);
N.deg_pct = f1(100 * N.carb_degrading / N.cds);
{
  const top = D.unbinned.top;
  N.ub_listed_max = Math.max(...top.map((x) => x.max)).toFixed(2); // highest single-day share of any listed unbinned contig
  const pk = (m) => { const i = m.share.indexOf(Math.max(...m.share)); return [i + 1, m.share[i]]; };
  [N.c62_peak_day, N.c62_peak] = pk(D.mags[1]);
  [N.c16_peak_day, N.c16_peak] = pk(D.mags[2]);
  const P = D.day4to5.peak;
  N.pk_n = P.length;
  N.pk_bacillota = P.filter((x) => x.phylum === "Bacillota").length;
  N.pk_actino = P.filter((x) => x.phylum === "Actinomycetota").length;
  N.pk_other = P.length - N.pk_bacillota - N.pk_actino;
  N.pk_rank_c101 = [...P].sort((x, y) => y.fold - x.fold).findIndex((x) => x.id === FOCUS.id) + 1;
  N.fam2_max = Math.max(...D.families.filter((f) => f.family !== "GH13").map((f) => f["c.101"]));
  N.pk_lachno = P.filter((x) => x.family === "Lachnospiraceae").length;
  N.pk_sum4 = f1(sum(P.map((x) => x.d4)));
  N.pk_sum5 = f1(sum(P.map((x) => x.d5)));
  N.pk_sum6 = f1(sum(P.map((x) => x.d6)));
  const t = D.day4to5.top_fold.map((x) => x.name);
  N.top_fold_name = t[0].replace(/ \(.*\)$/, "");
  const tp = D.day4to5.top_pp[0];
  N.top_pp_name = tp.name.replace(/ \(.*\)$/, "");
  N.top_pp_pp = tp.pp;
  N.top_pp_fold = tp.fold;
  const x62 = D.day4to5.peak.find((x) => x.id === "c.62");
  N.c62_d4 = x62.d4; N.c62_d5 = x62.d5;
  N.c101_d4 = D.day4to5.peak.find((x) => x.id === FOCUS.id).d4; N.c101_d5 = D.day4to5.peak.find((x) => x.id === FOCUS.id).d5;
}
const ONE = /^ctx_(hq|mq|mag|unbinned|off|asm)_(min|max|pooled|high|low)$|^ctx_gbp$/, TWO = /^gh13_dens_/;
function fillNumbers() {
  document.querySelectorAll("[data-n]").forEach((e) => {
    const k = e.dataset.n;
    e.textContent = !(k in N) ? "?" : ONE.test(k) ? Number(N[k]).toFixed(1) : TWO.test(k) ? Number(N[k]).toFixed(2) : num(N[k]);
  });
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
// Table 3 rows as objects; lookup of a gene's carbohydrate row by its position
const CARB = D.carb.data.map((row) => Object.fromEntries(D.carb.columns.map((c, i) => [c, row[i]])));
const CARB_AT = new Map(CARB.map((c) => [c.start + ":" + c.stop, c]));
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
  const host = $("a5Map");
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
  });
}
function drawLegend() {
  const items = st.color === "carb" ? [...Object.values(CZ), ...Object.values(ROLE_C)].map((v) => ({ name: v.t, color: v.c })).concat([{ name: "Other gene", color: "var(--v4)" }])
    : Object.entries(EV).filter(([k]) => MAP.genes.some((g) => MAP.evidence[g[5]] === k)).map(([, v]) => ({ name: v.t, color: v.c }));
  $("a5Legend").innerHTML = items.map((it) => `<span><i class="sw" style="background:${it.color}"></i>${esc(it.name)}</span>`).join("") +
    `<span><svg width="12" height="12" style="vertical-align:-1px;margin-right:4px"><path d="M6,1L10,6L6,11L2,6Z" fill="none" style="stroke:var(--muted)" stroke-width="1.5"/></svg>CRISPR array</span>` +
    `<span><svg width="12" height="12" style="vertical-align:-1px;margin-right:4px"><path d="M6,1L11,10L1,10Z" fill="none" style="stroke:var(--muted)" stroke-width="1.5"/></svg>Start of replication</span>`;
}
function drawLegend() {
  const items = [...Object.values(CZ), ...Object.values(ROLE_C)].map((v) => ({ name: v.t, color: v.c })).concat([{ name: "Other gene", color: "var(--v4)" }]);
  $("a5Legend").innerHTML = items.map((it) => `<span><i class="sw" style="background:${it.color}"></i>${esc(it.name)}</span>`).join("") +
    `<span><svg width="12" height="12" style="vertical-align:-1px;margin-right:4px"><path d="M6,1L10,6L6,11L2,6Z" fill="none" style="stroke:var(--muted)" stroke-width="1.5"/></svg>CRISPR array</span>` +
    `<span><svg width="12" height="12" style="vertical-align:-1px;margin-right:4px"><path d="M6,1L11,10L1,10Z" fill="none" style="stroke:var(--muted)" stroke-width="1.5"/></svg>Start of replication</span>`;
}

const CTX = [["hq", "HQ MAGs", "var(--c1)"], ["mq", "MQ MAGs", "var(--c3)"], ["unbinned", "Unbinned contigs", "var(--c4)"], ["off", "Not on the assembly", "var(--c2)"]];
function drawCtx() {
  const host = $("a5Ctx"), S = D.context;
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
}

// the kit's diverging legend shows no magnitudes: replace it with the scale's end values (again after each redraw)
let d5Span = 0;
function d5Legend() {
  const leg = $("a5Peak").querySelector(".legend");
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
// --- Figure 3: relative abundance of the three Bifidobacterium MAGs
function drawLine() {
  const cols = ["var(--c1)", "var(--c3)", "var(--c4)"];
  lineChart($("a5Line"), {
    x: D.days, series: D.mags.map((m, i) => ({ name: short(m), values: m.share, color: cols[i] })), xLabel: "Day", xName: "Day",
    yLabel: "Relative abundance (% of the day's bases)", unit: "%", zero: true,
    bands: [{ from: 0.6, to: 5.5, label: "high carbohydrate" }], marks: [{ x: 5.5, label: "diet switch" }],
  });
}

// --- Figure 4 and Table 2: MAGs that rise on days 3-4-5 and fall on day 6
function drawPeak() {
  const P = D.day4to5.peak, host = $("a5Peak");
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return (b[1] + b[2]) / 2; };
  const vals = P.map((x) => { const m = med(D.day4to5.share[x.id].slice(0, 4)); return D.day4to5.share[x.id].map((v) => (m > 0 && v > 0 ? Math.log2(v / m) : null)); });
  const nw = narrow(host);
  heatmap(host, { rows: P.map((x) => (nw ? abbr(x.name) : x.name)), cols: D.days.map((d) => (nw ? String(d) : "day " + d)), values: vals, diverging: true, center: 0, label: "log2 of share / median of days 1-4", format: (v) => (v === null || v === undefined ? "" : (v >= 0 ? "+" : "") + v.toFixed(1)) });
  d5Span = Math.max(...vals.flat().filter((v) => v !== null).map(Math.abs));
  d5Legend();
}
function drawRank() {
  const seen = new Set(), rows = [];
  for (const x of [...D.day4to5.top_fold, ...D.day4to5.top_pp, ...D.day4to5.peak.filter((y) => y.id === FOCUS.id)]) if (!seen.has(x.id)) { seen.add(x.id); rows.push(x); }
  table($("a5Rank"), {
    columns: [
      { key: "name", label: "MAG" }, { key: "family", label: "Family" },
      { key: "d4", label: "Day 4 %", num: true, fmt: (v) => v.toFixed(3) }, { key: "d5", label: "Day 5 %", num: true, fmt: (v) => v.toFixed(3) },
      { key: "fold", label: "Fold (day 5 / day 4)", num: true, fmt: f1 }, { key: "pp", label: "Change (percentage points)", num: true, fmt: (v) => v.toFixed(2) },
      { key: "peak", label: "Rises days 3-4-5, falls day 6", fmt: (v) => (v ? "yes" : "no") },
    ],
    rows: rows.map((x) => ({ ...x, peak: D.day4to5.peak.some((y) => y.id === x.id) })), sortKey: "fold", sortDesc: true,
  });
}

// --- Table 1: the gene families and genes discussed, with the counts in the three Bifidobacterium MAGs
const T1 = [
  ["fam", "GH13", "alpha-amylase family: starch, glycogen and related alpha-glucans (also sucrose-active enzymes)", "4, 1, 5"],
  ["fam", "GH43", "arabinofuranosidases and xylosidases that trim arabinoxylan, a plant fibre", "6, 7"],
  ["fam", "GH51", "arabinofuranosidases, plant fibre (family classification)", "4"],
  ["fam", "GH32", "invertases and fructan hydrolases (sucrose, inulin-type fructans)", "8, 4"],
  ["fam", "GH42", "beta-galactosidases (lactose, galacto-oligosaccharides)", "9"],
  ["fam", "GH2", "beta-galactosidases and related enzymes (family classification)", "4"],
  ["grp", "shunt", "phosphoketolase, the key enzyme of the bifid shunt", "10"],
  ["grp", "bsh", "bile salt hydrolase", "11, 12"],
  ["grp", "crispr", "CRISPR-associated proteins (defence against phages)", "13"],
];
function drawGenes() {
  const FAM = Object.fromEntries(D.families.map((f) => [f.family, f])), GRP = Object.fromEntries(D.groups.map((g) => [g.key, g]));
  const rows = T1.map(([k, id, role, refs]) => {
    const r = k === "fam" ? FAM[id] : GRP[id];
    return { gene: k === "fam" ? id : r.label, role, refs, a: r["c.101"], b: r["c.62"], c: r["c.16"], med: k === "fam" ? r.median : null };
  });
  table($("a5Genes"), {
    columns: [
      { key: "gene", label: "Family or gene" }, { key: "role", label: "Predicted role (literature)" }, { key: "refs", label: "References" },
      { key: "a", label: "B. angulatum", num: true, fmt: String }, { key: "b", label: "B. adolescentis", num: true, fmt: String },
      { key: "c", label: "B. longum", num: true, fmt: String }, { key: "med", label: "Median MAG", num: true, fmt: (v) => (v === null ? "n/a" : String(v)) },
    ],
    rows, sortKey: "a", sortDesc: true,
  });
}

fillNumbers();
drawCtx(); drawMap(); drawLegend(); drawLine(); drawPeak(); drawRank(); drawGenes();
