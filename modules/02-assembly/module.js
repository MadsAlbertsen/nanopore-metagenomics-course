// Module 2: assembly. No data.json: the three toy simulations run here with fixed seeds, so one page state always
// gives the same picture and numbers (the answers in examples.yaml were read off these functions).
const mulberry = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const IDS = [100, 99.99, 99.9, 99.5, 99, 98, 97, 95];  // identity between the two toy strains, %
const ERRS = [0, 0.5, 1, 2, 3];  // substitution errors in the toy reads, %
const DEF = { rl: 5, rep: 6, step: 1, id: 99.5, cova: 20, covb: 10, err: 1 };
const st = { ...DEF };
const kb = (bp) => (bp / 1000).toLocaleString("en", { maximumFractionDigits: 1 }) + " kb";
const plural = (n, one, many) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;
const svgBox = (host, W, H, label) => { const s = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": label }); host.innerHTML = ""; host.appendChild(s); return s; };
const txt = (svg, x, y, s, attrs = {}) => { const t = el("text", { x, y, class: "lbl", ...attrs }, svg); t.textContent = s; return t; };
// pack intervals [s, e) into rows (first row with room)
function pack(items, gap) {
  const ends = [];
  return items.map((it) => { let r = ends.findIndex((e) => e + gap <= it.s); if (r < 0) { r = ends.length; ends.push(0); } ends[r] = it.e; return r; });
}

// ---------- 1. repeat and read length
const REP = { G: 60000, depth: 10, anchor: 1000, A: 15000, B: 18000 };
function repLayout(r) {
  const segs = []; let x = 0;
  for (const [name, len, c] of [["A", REP.A, 1], ["R", r, 2], ["B", REP.B, 3], ["R", r, 2], ["C", REP.G - REP.A - REP.B - 2 * r, 4]]) { segs.push({ name, s: x, e: x + len, c }); x += len; }
  return segs;
}
// reads of one length L (bp) at random positions (fixed seed), 10x depth; which reads span each repeat copy
function simRepeat(L, r) {
  const segs = repLayout(r), rand = mulberry(11), n = Math.round((REP.depth * REP.G) / L), reads = [];
  for (let i = 0; i < n; i++) { const s = Math.floor(rand() * (REP.G - L + 1)); reads.push({ s, e: s + L }); }
  const copies = [segs[1], segs[3]];
  const spans = (rd, c) => rd.s <= c.s - REP.anchor && rd.e >= c.e + REP.anchor;
  for (const rd of reads) rd.span = copies.some((c) => spans(rd, c));
  const span = copies.map((c) => reads.filter((rd) => spans(rd, c)).length);
  // toy rule: a contig runs through a repeat copy only if a read spans it
  const pieces = [[segs[0]]];
  for (const k of [0, 1]) {
    if (span[k] > 0) pieces[pieces.length - 1].push(segs[1 + 2 * k], segs[2 + 2 * k]);
    else pieces.push([segs[2 + 2 * k]]);
  }
  const collapsed = span.some((x) => x === 0);
  return { segs, reads, span, n, pieces, collapsed, contigs: pieces.length + (collapsed ? 1 : 0) };
}
function drawRepeat() {
  const L = st.rl * 1000, r = st.rep * 1000, sim = simRepeat(L, r), host = $("repSvg");
  $("rlv").textContent = st.rl + " kb"; $("repv").textContent = st.rep + " kb";
  const W = Math.max(300, host.clientWidth), m = 12, X = (bp) => m + (bp / REP.G) * (W - 2 * m);
  sim.reads.sort((a, b) => a.s - b.s);
  const rows = pack(sim.reads, 400), nRows = Math.max(1, ...rows.map((x) => x + 1)), rh = 4;
  const yG = 22, yR = 62, yGraph = yR + nRows * rh + 44, H = yGraph + 112;
  const svg = svgBox(host, W, H, "Toy genome with a repeat, the simulated reads and the assembly graph");
  txt(svg, m, 12, "Toy genome (60 kb)");
  for (const sg of sim.segs) {
    el("rect", { x: X(sg.s), y: yG, width: Math.max(1, X(sg.e) - X(sg.s)), height: 16, fill: `var(--c${sg.c})` }, svg);
    if (X(sg.e) - X(sg.s) > 14) txt(svg, (X(sg.s) + X(sg.e)) / 2, yG + 12, sg.name, { class: "seglbl", "text-anchor": "middle" });
  }
  txt(svg, m, yR - 8, `Reads (${sim.n}, each ${kb(L)}); dark: spans a repeat copy`);
  sim.reads.forEach((rd, k) => {
    const y = yR + rows[k] * rh;
    el("line", { x1: X(rd.s) + 0.5, x2: Math.max(X(rd.s) + 1.5, X(rd.e) - 0.5), y1: y, y2: y, stroke: rd.span ? "var(--ink)" : "var(--faint)", "stroke-width": rd.span ? 2.6 : 1.8, opacity: rd.span ? 1 : 0.7 }, svg);
  });
  // graph: contigs in a row, the collapsed repeat node below
  txt(svg, m, yGraph - 14, `Assembly graph (toy rule): ${plural(sim.contigs, "contig", "contigs")}`);
  const gap = 34, total = sim.pieces.reduce((a, p) => a + p.reduce((b, sg) => b + sg.e - sg.s, 0), 0);
  const sc = (W - 2 * m - gap * (sim.pieces.length - 1)) / total;
  let x = m; const ends = [];
  sim.pieces.forEach((p, k) => {
    const x0 = x;
    for (const sg of p) { const w = (sg.e - sg.s) * sc; el("rect", { x, y: yGraph, width: Math.max(1, w - 1), height: 14, fill: `var(--c${sg.c})` }, svg); if (w > 14) txt(svg, x + w / 2, yGraph + 11, sg.name, { class: "seglbl", "text-anchor": "middle" }); x += w; }
    txt(svg, (x0 + x) / 2, yGraph + 30, `contig ${k + 1}: ${kb(p.reduce((b, sg) => b + sg.e - sg.s, 0))}`, { "text-anchor": "middle" });
    ends.push([x0, x]); x += gap;
  });
  if (sim.collapsed) {
    const w = Math.max(16, r * sc), cx = W / 2, yC = yGraph + 62;
    const links = [];
    sim.span.forEach((s, k) => { if (s === 0) { const before = sim.pieces.findIndex((p) => p.includes(sim.segs[2 * k])); links.push([ends[before][1], ends[before + 1][0]]); } });
    for (const [xa, xb] of links) {
      el("path", { class: "edge", d: `M${xa},${yGraph + 7} C${xa + 20},${yC + 7} ${cx - w / 2 - 30},${yC + 7} ${cx - w / 2},${yC + 7}` }, svg);
      el("path", { class: "edge", d: `M${cx + w / 2},${yC + 7} C${cx + w / 2 + 30},${yC + 7} ${xb - 20},${yC + 7} ${xb},${yGraph + 7}` }, svg);
    }
    el("rect", { x: cx - w / 2, y: yC, width: w, height: 14, fill: "var(--c2)" }, svg);
    if (w > 14) txt(svg, cx, yC + 11, "R", { class: "seglbl", "text-anchor": "middle" });
    txt(svg, cx, yC + 30, `repeat node: ${sim.span.filter((s) => s === 0).length === 2 ? "both copies" : "the unspanned copy"} merged, ${kb(r)}`, { "text-anchor": "middle" });
  }
  const need = r + 2 * REP.anchor;
  const how = L < need ? `No read can span a copy: in this toy a read must be at least ${kb(need)} long (the repeat plus 1 kb on each side).`
    : sim.contigs === 1 ? "Both copies are spanned, so the toy assembler can follow the genome from end to end: one contig."
    : "At least one copy is not spanned by any read, so the contig breaks there, although some reads are long enough: whether a read spans a copy depends on where reads happen to start.";
  $("repOut").innerHTML = `<b>${plural(sim.contigs, "contig", "contigs")}.</b> Repeat copy 1 is spanned by ${plural(sim.span[0], "read", "reads")}, copy 2 by ${plural(sim.span[1], "read", "reads")}. ${how}`;
  $("repLegend").innerHTML = sim.segs.filter((s, k) => k !== 3).map((s) => `<span><i class="sw" style="background:var(--c${s.c})"></i>${s.name === "R" ? "repeat R (two copies)" : "unique piece " + s.name}</span>`).join("")
    + `<span><i class="sw" style="background:var(--ink)"></i>read spanning a copy</span><span><i class="sw" style="background:var(--faint)"></i>other read</span>`;
}

// ---------- 2. reads -> overlaps -> graph -> contig
const TOY = [["A", 0, 5000], ["B", 2800, 8800], ["C", 4200, 10200], ["D", 7600, 13600], ["E", 9400, 15400], ["F", 13000, 19000], ["G", 15200, 21200], ["H", 18400, 24000], ["X", 5200, 7800]].map(([n, s, e]) => ({ n, s, e }));
const TOY_ORDER = ["E", "A", "X", "G", "C", "H", "B", "F", "D"];  // the order the reads "arrive" in
const MIN_OL = 500;
const STEPS = [
  { label: "Reads" }, { label: "Overlaps" }, { label: "Contained reads" }, { label: "Transitive edges" }, { label: "Unitig" }, { label: "Contig" },
];
function toyGraph() {
  const by = Object.fromEntries(TOY.map((r) => [r.n, r]));
  const inside = (a, b) => a.s >= b.s && a.e <= b.e;  // a lies within b
  const contained = new Set(TOY.filter((a) => TOY.some((b) => b !== a && inside(a, b))).map((a) => a.n));
  const edges = [];
  for (let i = 0; i < TOY.length; i++) for (let j = i + 1; j < TOY.length; j++) {
    const a = TOY[i], b = TOY[j], ol = Math.min(a.e, b.e) - Math.max(a.s, b.s);
    if (ol > MIN_OL) edges.push({ a: a.n, b: b.n, ol, contained: contained.has(a.n) || contained.has(b.n) });
  }
  const has = (u, v) => edges.some((e) => !e.contained && ((e.a === u && e.b === v) || (e.a === v && e.b === u)));
  // transitive: u-w is redundant when some v starts between them and overlaps both (Myers 2005)
  for (const e of edges) {
    if (e.contained) continue;
    const [u, w] = by[e.a].s < by[e.b].s ? [by[e.a], by[e.b]] : [by[e.b], by[e.a]];
    e.via = TOY.find((v) => !contained.has(v.n) && v.s > u.s && v.s < w.s && has(u.n, v.n) && has(v.n, w.n));
    e.transitive = !!e.via;
  }
  return { edges, contained, by };
}
function drawSteps() {
  const g = toyGraph(), step = st.step, host = $("stSvg");
  const W = Math.max(300, host.clientWidth), H = 320;
  const svg = svgBox(host, W, H, `Toy assembly, step ${step}: ${STEPS[step - 1].label}`);
  $("stList").innerHTML = STEPS.map((s, k) => `<button role="listitem" data-step="${k + 1}" aria-current="${k + 1 === step}">${k + 1}. ${s.label}</button>`).join("");
  $("stPrev").disabled = step === 1; $("stNext").disabled = step === STEPS.length;
  $("stPrev").style.visibility = step === 1 ? "hidden" : ""; $("stNext").style.visibility = step === STEPS.length ? "hidden" : "";
  const kept = g.edges.filter((e) => !e.contained && !e.transitive), trans = g.edges.filter((e) => e.transitive), cont = g.edges.filter((e) => e.contained);
  const maxLen = Math.max(...TOY.map((r) => r.e - r.s));
  if (step === 1) {
    TOY_ORDER.forEach((n, k) => {
      const r = g.by[n], y = 24 + k * 32, w = ((r.e - r.s) / maxLen) * Math.min(W - 90, 520);
      txt(svg, 14, y + 13, n, { class: "mlbl" });
      el("rect", { x: 36, y: y + 3, width: w, height: 12, rx: 3, fill: "var(--accent)" }, svg);
      txt(svg, 42 + w, y + 13, kb(r.e - r.s));
    });
  } else if (step <= 4) {
    const cx = W / 2, cy = H / 2, R = Math.min(W / 2 - 40, H / 2 - 30);
    const pos = Object.fromEntries(TOY_ORDER.map((n, k) => [n, [cx + R * Math.cos((2 * Math.PI * k) / TOY_ORDER.length - Math.PI / 2), cy + R * Math.sin((2 * Math.PI * k) / TOY_ORDER.length - Math.PI / 2)]]));
    for (const e of g.edges) {
      const gone = (step >= 3 && e.contained) || (step >= 4 && e.transitive);
      if (step >= 4 && e.contained) continue;
      const [x1, y1] = pos[e.a], [x2, y2] = pos[e.b];
      el("line", { class: "edge" + (gone ? " gone" : ""), x1, y1, x2, y2 }, svg);
    }
    for (const n of TOY_ORDER) {
      const [x, y] = pos[n], off = (step >= 3 && g.contained.has(n));
      el("circle", { class: "node", cx: x, cy: y, r: 15, fill: off ? "var(--faint)" : "var(--accent)" }, svg);
      txt(svg, x, y + 4, n, { class: "nlbl", "text-anchor": "middle" });
    }
  } else if (step === 5) {
    const order = TOY.filter((r) => !g.contained.has(r.n)).sort((a, b) => a.s - b.s), dx = (W - 60) / (order.length - 1), y = H / 2;
    const px = (k) => 30 + k * dx;
    for (let k = 0; k + 1 < order.length; k++) {
      const e = kept.find((x) => (x.a === order[k].n && x.b === order[k + 1].n) || (x.b === order[k].n && x.a === order[k + 1].n));
      el("line", { class: "edge path", x1: px(k), y1: y, x2: px(k + 1), y2: y }, svg);
      if (e) txt(svg, (px(k) + px(k + 1)) / 2, y - 12, kb(e.ol), { class: "olbl", "text-anchor": "middle" });
    }
    order.forEach((r, k) => { el("circle", { class: "node", cx: px(k), cy: y, r: 15, fill: "var(--accent)" }, svg); txt(svg, px(k), y + 4, r.n, { class: "nlbl", "text-anchor": "middle" }); });
    txt(svg, W / 2, y + 44, "one unitig: a chain without branches (numbers: overlap lengths)", { "text-anchor": "middle" });
  } else {
    const G = Math.max(...TOY.map((r) => r.e)), X = (bp) => 24 + (bp / G) * (W - 48);
    el("rect", { x: X(0), y: 26, width: X(G) - X(0), height: 16, rx: 3, fill: "var(--c1)" }, svg);
    txt(svg, X(0), 18, `contig: ${kb(G)} (polished consensus of all 9 reads)`);
    const reads = TOY.slice().sort((a, b) => a.s - b.s), rows = pack(reads, 300);
    reads.forEach((r, k) => {
      const y = 70 + rows[k] * 30;
      el("rect", { x: X(r.s), y, width: X(r.e) - X(r.s), height: 16, rx: 3, fill: g.contained.has(r.n) ? "var(--faint)" : "var(--accent)" }, svg);
      txt(svg, X(r.s) + 6, y + 12, r.n, { class: "nlbl" });
    });
  }
  const nCont = g.contained.size, rLen = TOY.map((r) => r.e - r.s);
  const T = [
    `The sequencer delivers reads in no particular order: here ${TOY.length} reads of ${kb(Math.min(...rLen))} to ${kb(Math.max(...rLen))}. The assembler knows their sequence, not where they come from.`,
    `Comparing every read with every other finds ${g.edges.length} overlaps longer than ${MIN_OL} bp (table). Each read becomes a node and each overlap an edge. Drawn in arrival order, the graph is a tangle.`,
    `Read X lies wholly inside reads B and C. It adds no sequence to the path, so it is set aside with its ${cont.length} overlaps (grey). It is not thrown away: myloasm still uses such reads for depth and for polishing.`,
    `If A overlaps B, B overlaps C, and A also overlaps C, the edge A-C adds nothing: it is "transitive". ${trans.length} such edges are removed (dashed), ${kept.length} are left.`,
    `Every read now has at most one neighbour on each side: a single chain without branches, ${kept.length + 1} reads long. Such a chain is called a unitig. Laid out in order, it spells the genome.`,
    `The unitig becomes one contig of ${kb(Math.max(...TOY.map((r) => r.e)))}: the whole toy genome. Polishing then aligns all reads back, including X, and takes the consensus at each position to remove most read errors (myloasm does this in 400 bp windows).`,
  ];
  $("stText").textContent = T[step - 1];
  const status = (e) => step < 2 ? "" : step >= 3 && e.contained ? "set aside: contained read" : step >= 4 && e.transitive ? `transitive (via ${e.via.n}), removed` : step >= 5 ? "in the unitig" : "edge";
  const gone = (e) => (step >= 3 && e.contained) || (step >= 4 && e.transitive);
  $("stTable").innerHTML = step < 2 ? `<tbody><tr><td class="st">No overlaps yet: the next step compares the reads.</td></tr></tbody>`
    : `<thead><tr><th>Overlap</th><th class="r">Length</th><th>Status</th></tr></thead><tbody>${g.edges.map((e) => `<tr class="${gone(e) ? "gone" : ""}"><td class="mono">${e.a}-${e.b}</td><td class="r">${kb(e.ol)}</td><td class="st">${status(e)}</td></tr>`).join("")}</tbody>`;
}

// ---------- 3. two strains
const STR = { G: 30000, L: 5000, tol: 0.05, perr: 0.025 };
// P(X > k) for X ~ Binomial(n, p)
function binomGreater(n, p, k) {
  let term = Math.pow(1 - p, n), cdf = 0;
  for (let i = 0; i <= Math.min(k, n); i++) { cdf += term; term *= ((n - i) / (i + 1)) * (p / (1 - p)); }
  return Math.max(0, 1 - cdf);
}
class UF {
  constructor(n) { this.p = Int32Array.from({ length: n }, (_, i) => i); }
  find(i) { while (this.p[i] !== i) { this.p[i] = this.p[this.p[i]]; i = this.p[i]; } return i; }
  join(a, b) { a = this.find(a); b = this.find(b); if (a !== b) this.p[a] = b; }
}
function simStrains(idPct, covA, covB, errPct) {
  const { G, L } = STR, e = errPct / 100, rand = mulberry(7);
  const ref = new Uint8Array(G); for (let p = 0; p < G; p++) ref[p] = Math.floor(rand() * 4);
  const nSnp = Math.round(((100 - idPct) / 100) * G), r2 = mulberry(3), snp = new Map();
  while (snp.size < nSnp) { const p = Math.floor(r2() * G); if (!snp.has(p)) snp.set(p, (ref[p] + 1 + Math.floor(r2() * 3)) % 4); }
  const reads = [];
  for (const [strain, cov, seed] of [[0, covA, 101], [1, covB, 202]]) {
    const rr = mulberry(seed), n = Math.round((cov * G) / L);
    for (let i = 0; i < n; i++) {
      const s = Math.floor(rr() * (G - L + 1)), strand = rr() < 0.5 ? 0 : 1, re = mulberry(seed * 1000 + i), pos = [], base = [];
      for (let p = s; p < s + L; p++) {
        const tb = strain === 1 && snp.has(p) ? snp.get(p) : ref[p], u = re(), v = re();
        const b = u < e ? (tb + 1 + Math.floor(v * 3)) % 4 : tb;
        if (b !== ref[p]) { pos.push(p); base.push(b); }
      }
      reads.push({ strain, strand, s, e: s + L, pos, base });
    }
  }
  // variant positions (as in the myloasm paper, but for single positions): the two most common bases are each seen
  // on both strands, and the rarer one passes the binomial test against an error rate of 0.025
  const cov = [new Int32Array(G + 1), new Int32Array(G + 1)];
  for (const rd of reads) { cov[rd.strand][rd.s]++; cov[rd.strand][rd.e]--; }
  for (const c of cov) for (let p = 1; p <= G; p++) c[p] += c[p - 1];
  const alt = new Map();  // position -> count of each base (0-3) on each strand: index base * 2 + strand
  for (const rd of reads) rd.pos.forEach((p, k) => { let a = alt.get(p); if (!a) alt.set(p, (a = new Int32Array(8))); a[rd.base[k] * 2 + rd.strand]++; });
  const variant = new Set();
  for (const [p, a] of alt) {
    for (const s of [0, 1]) a[ref[p] * 2 + s] = cov[s][p] - (a[s] + a[2 + s] + a[4 + s] + a[6 + s]);
    const c = [0, 1, 2, 3].map((b) => ({ n: a[2 * b] + a[2 * b + 1], both: a[2 * b] > 0 && a[2 * b + 1] > 0 })).sort((x, y) => y.n - x.n);
    if (c[0].both && c[1].both && binomGreater(c[0].n, STR.perr, c[1].n) <= 0.05) variant.add(p);
  }
  // compare every overlapping pair (> 500 bp): all mismatches (tolerant rule) and mismatches at variant positions.
  // Of the permitted overlaps each read keeps its longest one on each side: in an exact string graph this is what
  // removing transitive edges leaves (section 2).
  const n = reads.length, best = [0, 1].map(() => ({ R: new Int32Array(n).fill(-1), Ro: new Int32Array(n), L: new Int32Array(n).fill(-1), Lo: new Int32Array(n) }));
  const keep = (bk, i, j, ol) => { if (ol > bk.Ro[i]) { bk.Ro[i] = ol; bk.R[i] = j; } if (ol > bk.Lo[j]) { bk.Lo[j] = ol; bk.L[j] = i; } };
  let same = 0, cross = 0;
  for (let i = 0; i < reads.length; i++) for (let j = i + 1; j < reads.length; j++) {
    const [ii, jj] = reads[i].s <= reads[j].s ? [i, j] : [j, i];  // ii starts first
    const a = reads[i], b = reads[j], lo = Math.max(a.s, b.s), hi = Math.min(a.e, b.e), ol = hi - lo;
    if (ol <= MIN_OL) continue;
    let x = 0, y = 0, mm = 0, mv = 0;
    while (x < a.pos.length && a.pos[x] < lo) x++;
    while (y < b.pos.length && b.pos[y] < lo) y++;
    while ((x < a.pos.length && a.pos[x] < hi) || (y < b.pos.length && b.pos[y] < hi)) {
      const pa = x < a.pos.length && a.pos[x] < hi ? a.pos[x] : Infinity, pb = y < b.pos.length && b.pos[y] < hi ? b.pos[y] : Infinity, p = Math.min(pa, pb);
      const ba = pa === p ? a.base[x++] : ref[p], bb = pb === p ? b.base[y++] : ref[p];
      if (ba !== bb) { mm++; if (variant.has(p)) mv++; }
    }
    const kind = a.strain === b.strain ? "same" : "cross";
    if (kind === "same") same++; else cross++;
    if (mm / ol <= STR.tol) keep(best[0], ii, jj, ol);
    if (mv === 0) keep(best[1], ii, jj, ol);
  }
  const rules = best.map((bk, k) => {
    const u = new UF(n), seen = new Set(), edges = { same: 0, cross: 0 };
    for (let i = 0; i < n; i++) for (const j of [bk.R[i], bk.L[i]]) {
      if (j < 0) continue;
      const key = Math.min(i, j) * n + Math.max(i, j);
      if (seen.has(key)) continue;
      seen.add(key); u.join(i, j); edges[reads[i].strain === reads[j].strain ? "same" : "cross"]++;
    }
    const comp = new Map();
    reads.forEach((rd, i) => { const c = u.find(i); let g = comp.get(c); if (!g) comp.set(c, (g = { a: 0, b: 0, s: Infinity, e: 0, ids: [] })); g[rd.strain ? "b" : "a"]++; g.s = Math.min(g.s, rd.s); g.e = Math.max(g.e, rd.e); g.ids.push(i); });
    const groups = [...comp.values()].filter((g) => g.ids.length > 1);
    for (const g of groups) g.type = g.a && g.b ? "mixed" : g.a ? "A" : "B";
    const typeOf = new Array(reads.length).fill(null);
    for (const g of groups) for (const i of g.ids) typeOf[i] = g.type;
    const count = (t) => groups.filter((g) => g.type === t).length;
    return { groups, typeOf, nA: count("A"), nB: count("B"), nMixed: count("mixed"), single: reads.length - groups.reduce((s, g) => s + g.ids.length, 0), edges };
  });
  let vTrue = 0; for (const p of variant) if (snp.has(p)) vTrue++;
  return { reads, snp, variant, nSnp, vTrue, vFalse: variant.size - vTrue, same, cross, rules, nA: reads.filter((r) => !r.strain).length, nB: reads.filter((r) => r.strain).length };
}
const TYPE_COL = { A: "var(--c1)", B: "var(--c2)", mixed: "var(--c3)" };
function drawStrainPanel(host, sim, k) {
  const rule = sim.rules[k], W = Math.max(280, host.clientWidth), m = 10, X = (bp) => m + (bp / STR.G) * (W - 2 * m);
  const idx = (strain) => sim.reads.map((r, i) => i).filter((i) => sim.reads[i].strain === strain).sort((i, j) => sim.reads[i].s - sim.reads[j].s);
  const ia = idx(0), ib = idx(1), ra = pack(ia.map((i) => sim.reads[i]), 150), rb = pack(ib.map((i) => sim.reads[i]), 150);
  const rh = 3, nA = Math.max(1, ...ra.map((x) => x + 1)), nB = Math.max(1, ...rb.map((x) => x + 1));
  const groups = rule.groups.slice().sort((g, h) => (g.type > h.type ? 1 : g.type < h.type ? -1 : g.s - h.s)), shown = groups.slice(0, 24);
  let y = 14;
  const yT = y + 4; y += k ? 50 : 20;
  const yA = y + 14; y = yA + nA * rh + 8;
  const yB = y + 14; y = yB + nB * rh + 10;
  const yGr = y + 14, H = yGr + Math.max(1, shown.length) * 9 + (groups.length > shown.length ? 18 : 6);
  const svg = svgBox(host, W, H, k ? "Variant-aware rule: reads and groups of joined reads" : "Mismatch-tolerant rule: reads and groups of joined reads");
  txt(svg, m, 10, `True differences between the strains: ${sim.nSnp}`);
  el("line", { x1: X(0), x2: X(STR.G), y1: yT + 6, y2: yT + 6, class: "grid" }, svg);
  for (const p of sim.snp.keys()) el("line", { x1: X(p), x2: X(p), y1: yT + 1, y2: yT + 11, stroke: "var(--muted)", "stroke-width": 1 }, svg);
  if (k) {
    txt(svg, m, yT + 26, `Variant positions found: ${sim.vTrue} true, ${sim.vFalse} false (red)`);
    for (const p of sim.variant) el("line", { x1: X(p), x2: X(p), y1: yT + 29, y2: yT + 38, stroke: sim.snp.has(p) ? "var(--ink)" : "var(--v1)", "stroke-width": sim.snp.has(p) ? 1 : 2 }, svg);
  }
  const reads = (ids, rows, y0) => ids.forEach((i, q) => { const r = sim.reads[i], t = rule.typeOf[i], yy = y0 + rows[q] * rh; el("line", { x1: X(r.s) + 0.5, x2: X(r.e) - 0.5, y1: yy, y2: yy, stroke: t ? TYPE_COL[t] : "var(--faint)", "stroke-width": 2 }, svg); });
  txt(svg, m, yA - 5, `Strain A reads (${sim.nA})`); reads(ia, ra, yA);
  txt(svg, m, yB - 5, `Strain B reads (${sim.nB})`); reads(ib, rb, yB);
  txt(svg, m, yGr - 5, `Groups of joined reads (${groups.length})`);
  shown.forEach((g, q) => el("rect", { x: X(g.s), y: yGr + q * 9, width: Math.max(2, X(g.e) - X(g.s)), height: 6, rx: 2, fill: TYPE_COL[g.type] }, svg));
  if (groups.length > shown.length) txt(svg, m, H - 4, `and ${groups.length - shown.length} more`);
  const e = rule.edges;
  return `<span>Groups: <b>${rule.nA}</b> strain A only, <b>${rule.nB}</b> strain B only, <b>${rule.nMixed}</b> mixed</span><span><b>${rule.single}</b> reads not joined to any other</span>`
    + `<span>Joins kept: <b>${e.same}</b> within a strain, <b>${e.cross}</b> between strains</span>`;
}
function drawStrains() {
  $("sidv").textContent = IDS[$("sid").value] + "%"; $("covav").textContent = st.cova + "x"; $("covbv").textContent = st.covb + "x"; $("errv").textContent = st.err + "%";
  const sim = simStrains(st.id, st.cova, st.covb, st.err);
  $("strTolOut").innerHTML = drawStrainPanel($("strTol"), sim, 0);
  $("strVarOut").innerHTML = drawStrainPanel($("strVar"), sim, 1);
  $("strLegend").innerHTML = `<span><i class="sw" style="background:var(--c1)"></i>group of strain A reads only</span><span><i class="sw" style="background:var(--c2)"></i>strain B only</span><span><i class="sw" style="background:var(--c3)"></i>mixed: strains collapsed</span><span><i class="sw" style="background:var(--faint)"></i>read not joined</span><span>· grey ticks: true differences · dark/red ticks: variant positions found (true/false)</span>`;
  return sim;
}

// ---------- state, examples, start
const SECTIONS = { repeat: "secRepeat", steps: "secSteps", strains: "secStrains" };
const clampInt = (v, lo, hi, d) => { const x = parseInt(v, 10); return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : d; };
function applyState(s) {
  st.rl = clampInt(s.rl, 1, 30, DEF.rl); st.rep = clampInt(s.rep, 1, 10, DEF.rep); st.step = clampInt(s.step, 1, STEPS.length, DEF.step);
  st.cova = clampInt(s.cova, 2, 40, DEF.cova); st.covb = clampInt(s.covb, 1, 40, DEF.covb);
  st.id = IDS.includes(parseFloat(s.id)) ? parseFloat(s.id) : DEF.id;
  st.err = ERRS.includes(parseFloat(s.err)) ? parseFloat(s.err) : DEF.err;
  $("rl").value = st.rl; $("rep").value = st.rep; $("cova").value = st.cova; $("covb").value = st.covb;
  $("sid").value = IDS.indexOf(st.id); $("err").value = ERRS.indexOf(st.err);
}
function writeHash() { writeHashParams({ ...st, ex: examples.current >= 0 ? examples.current + 1 : undefined }); }
function drawAll() { drawRepeat(); drawSteps(); drawStrains(); }
const examples = setupExamples($("asExamples"), (k) => {
  const s = EXAMPLES[k].state;
  applyState({ ...DEF, ...s }); drawAll(); writeHash();
  const target = $(SECTIONS[s.go] || "secRepeat");
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
});
for (const id of ["rl", "rep"]) $(id).addEventListener("input", () => { st[id] = +$(id).value; drawRepeat(); writeHash(); });
for (const id of ["cova", "covb"]) $(id).addEventListener("input", () => { st[id] = +$(id).value; drawStrains(); writeHash(); });
$("sid").addEventListener("input", () => { st.id = IDS[+$("sid").value]; drawStrains(); writeHash(); });
$("err").addEventListener("input", () => { st.err = ERRS[+$("err").value]; drawStrains(); writeHash(); });
$("stList").addEventListener("click", (ev) => { const b = ev.target.closest("[data-step]"); if (b) { st.step = +b.dataset.step; drawSteps(); writeHash(); } });
$("stPrev").addEventListener("click", () => { if (st.step > 1) { st.step--; drawSteps(); writeHash(); } });
$("stNext").addEventListener("click", () => { if (st.step < STEPS.length) { st.step++; drawSteps(); writeHash(); } });
(function start() {
  const s = readHashParams(), ex = parseInt(s.ex, 10);
  if (ex >= 1 && ex <= EXAMPLES.length) { examples.current = ex - 1; examples.draw(); applyState({ ...DEF, ...EXAMPLES[ex - 1].state, ...s }); }
  else applyState(s);
  drawAll();
})();
let resizeTimer;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawAll, 150); });
