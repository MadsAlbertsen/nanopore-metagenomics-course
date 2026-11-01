// Module 7: annotation. DATA from the example analysis (np26 scripts/29_course_annotation.py):
// numbers (headline counts), evidence (evidence class names), amr (AMRFinderPlus protein matches by product),
// bins (per MAG: GTDB-Tk ranks, method, closest reference [species, ANI, AF], RED, gene evidence counts),
// maps (gene maps for a few MAGs: contigs [id, length, circular, module-5 verdict] and genes
// [contig, start, stop, strand, product, symbol, evidence, identity %, Pfam]; products, symbols and pfam are lookups).
const NUM = DATA.numbers, B = DATA.bins, MAPS = DATA.maps, EVN = DATA.evidence;
const magIdx = new Map(B.map((b, i) => [b.id, i]));
const MAP_IDS = Object.keys(MAPS.mags);
// evidence classes in legend order, with colours (categorical, fixed order) and plain-words labels
const EV = {
  cluster: { c: "var(--c1)", t: "Named protein cluster (UniRef50)", s: "named cluster" },
  amr_protein: { c: "var(--c2)", t: "AMRFinderPlus: reference resistance protein", s: "AMR protein" },
  pfam_only: { c: "var(--c3)", t: "Hypothetical, Pfam domain only (no cluster match)", s: "Pfam domain only" },
  amr_family: { c: "var(--c4)", t: "AMRFinderPlus: resistance protein family", s: "AMR family" },
  cluster_unnamed: { c: "var(--c5)", t: "Cluster match, cluster has no name", s: "unnamed cluster" },
  is_element: { c: "var(--c6)", t: "Insertion sequence name (ISfinder)", s: "IS name" },
  blast_rule: { c: "var(--c7)", t: "NCBI BlastRules reference protein", s: "BlastRules" },
  none: { c: "var(--faint)", t: "Hypothetical, no match", s: "no match" },
  rna: { c: "var(--v2)", t: "tRNA or rRNA gene", s: "RNA gene" },
};
const EV_ORDER = Object.keys(EV);
const METHOD_SHORT = { topology_ani: "tree + ANI", topology: "tree alone", red: "tree + RED", ani_screen: "ANI screen" };
const METHOD = { topology_ani: "tree placement and ANI", topology: "tree placement alone", red: "tree placement and RED", ani_screen: "ANI screen" };
const KIND = { latin: "Latin species name", placeholder: "Placeholder species name", none: "Genus only" };
const VERDICT = { missing_motif: "flagged in module 6: lacks a motif of the rest", extra_motif: "flagged in module 6: extra motif" };
const pct = (a, b, d = 1) => !b ? "–" : a && (100 * a) / b < 10 ** -d ? `<${10 ** -d}%` : `${((100 * a) / b).toFixed(d)}%`;
const num = (n) => Number(n).toLocaleString("en");
const hypShare = (b) => b.hyp / b.cds;
const DEFAULTS = { mag: "1.308", map: "1.308", win: "20" };
const st = { mag: 0, map: "1.308", ctg: 0, pos: 0, q: "", amr: "" };

// --- numbers in the text, all from the data
function fillNumbers() {
  const v = NUM.versions, k = NUM.kinds, ev = NUM.evidence;
  const novel = B.filter((b) => b.kind === "none");
  const med = (xs) => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
  const p0 = (x) => `${(100 * x).toFixed(1)}%`;
  const phyl = (p) => p0(med(B.filter((b) => b.ranks[1] === p).map(hypShare)));
  const arch = B.filter((b) => b.ranks[0] === "Archaea");
  const N = {
    gtdbVersion: `v${v.gtdbtk}, GTDB release ${v.gtdb.replace(/^r/, "")}`, baktaVersion: `${v.bakta}, database ${v.bakta_db}`,
    species: `${NUM.species} of ${NUM.mags} (${pct(NUM.species, NUM.mags)})`, spAni: `${NUM.sp_ani[1]}% (range ${NUM.sp_ani[0]}-${NUM.sp_ani[2]}%)`,
    spAf: `${NUM.sp_af[1]} (range ${NUM.sp_af[0]}-${NUM.sp_af[2]})`,
    latin: k.latin, placeholder: k.placeholder, genusOnly: k.none,
    byTree: novel.filter((b) => b.method === "topology").length, byRed: novel.filter((b) => b.method === "red").length,
    byAni: novel.filter((b) => b.method === "topology_ani").length,
    archaea: arch.length === 1 ? `One MAG (${arch[0].name}, ${arch[0].id})` : `${arch.length} MAGs`,
    cds: num(NUM.cds), hyp: `${num(NUM.hyp)} (${pct(NUM.hyp, NUM.cds)})`,
    hypRange: `${p0(NUM.hyp_mag[0])} to ${p0(NUM.hyp_mag[4])}`, hypMedian: p0(NUM.hyp_mag[2]), hypIqr: `${p0(NUM.hyp_mag[1])} and ${p0(NUM.hyp_mag[3])}`,
    hypLatin: p0(NUM.hyp_by_kind.latin), hypPlaceholder: p0(NUM.hyp_by_kind.placeholder), hypNone: p0(NUM.hyp_by_kind.none),
    hypBact: `${phyl("Bacteroidota")} (${B.filter((b) => b.ranks[1] === "Bacteroidota").length} MAGs)`, hypBaci: `${phyl("Bacillota")} (${B.filter((b) => b.ranks[1] === "Bacillota").length} MAGs)`,
    hypArch: arch.length ? `${pct(arch[0].hyp, arch[0].cds)}, ${num(arch[0].hyp)} of ${num(arch[0].cds)} CDS` : "–",
    idMedian: `${(100 * NUM.id_median).toFixed(1)}%`, idHigh: `${num(NUM.id_ge90)} of ${num(NUM.cluster_hits)} (${pct(NUM.id_ge90, NUM.cluster_hits)})`,
    vague: `${num(NUM.vague)} of ${num(NUM.named)} (${pct(NUM.vague, NUM.named)})`, pfam: `${num(NUM.hyp_pfam)} of ${num(NUM.hyp)} (${pct(NUM.hyp_pfam, NUM.hyp, 0)})`,
    clusterHits: num(NUM.cluster_hits),
    amrGenes: NUM.amr_genes, amrMags: NUM.amr_mags, amrFam: NUM.amr_family_genes, amrFamMags: NUM.amr_family_mags,
  };
  for (const e of document.querySelectorAll("[data-n]")) e.textContent = N[e.dataset.n] ?? "?";
  $("anStats").innerHTML = [[NUM.mags, "MAGs"], [NUM.species, "with a species name"], [NUM.cds, "protein-coding genes"], [`${(100 * NUM.hyp / NUM.cds).toFixed(1)}%`, "without a name (hypothetical)"], [NUM.amr_genes, "matches to a resistance protein"]]
    .map(([n, t]) => `<div class="stat"><b>${typeof n === "number" ? num(n) : n}</b><span>${t}</span></div>`).join("");
}

// --- MAGs without a species name
function drawNovel() {
  const rows = B.filter((b) => b.kind === "none").sort((a, b) => (b.ref ? b.ref[1] : 0) - (a.ref ? a.ref[1] : 0));
  $("anNovel").innerHTML = `<table class="ct"><thead><tr><th>MAG</th><th>Named as</th><th>Named by</th><th>Closest reference</th><th class="r">ANI</th><th class="r">AF</th><th class="r">RED</th></tr></thead><tbody>${rows.map((b) => `<tr class="click" data-mag="${b.id}"><td class="mono">${b.id}</td><td><i>${esc(b.name)}</i></td><td>${METHOD_SHORT[b.method]}</td><td>${b.ref ? `<i>${esc(b.ref[0])}</i>` : ""}</td><td class="r">${b.ref ? b.ref[1].toFixed(2) + "%" : ""}</td><td class="r">${b.ref ? b.ref[2].toFixed(2) : ""}</td><td class="r">${b.red ?? ""}</td></tr>`).join("")}</tbody></table>`;
}

// --- ANI / AF scatter of each MAG's closest reference
function drawAni() {
  const host = $("anAni"), pts = B.filter((b) => b.ref);
  const W = Math.max(300, host.clientWidth || 300), H = 300, mg = { l: 46, r: 12, t: 10, b: 38 };
  const lo = Math.floor(Math.min(...pts.map((b) => b.ref[1]))), X = (v) => mg.l + ((v - lo) / (100 - lo)) * (W - mg.l - mg.r);
  const Y = (v) => H - mg.b - v * (H - mg.t - mg.b);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "ANI and alignment fraction of each MAG's closest reference genome" });
  for (let a = lo; a <= 100; a++) { el("line", { class: "grid", x1: X(a), x2: X(a), y1: mg.t, y2: H - mg.b }, svg); el("text", { x: X(a), y: H - mg.b + 14, "text-anchor": "middle", class: "lbl" }, svg).textContent = a; }
  for (let f = 0; f <= 1.001; f += 0.25) { el("line", { class: "grid", x1: mg.l, x2: W - mg.r, y1: Y(f), y2: Y(f) }, svg); el("text", { x: mg.l - 6, y: Y(f) + 4, "text-anchor": "end", class: "lbl" }, svg).textContent = f.toFixed(2); }
  el("line", { x1: X(95), x2: X(95), y1: mg.t, y2: H - mg.b, stroke: "var(--muted)", "stroke-dasharray": "4 3" }, svg);
  el("line", { x1: mg.l, x2: W - mg.r, y1: Y(0.5), y2: Y(0.5), stroke: "var(--muted)", "stroke-dasharray": "4 3" }, svg);
  el("text", { x: (mg.l + W - mg.r) / 2, y: H - 4, "text-anchor": "middle", class: "lbl" }, svg).textContent = "ANI to the closest reference genome (%)";
  const yt = el("text", { x: 12, y: (mg.t + H - mg.b) / 2, "text-anchor": "middle", class: "lbl", transform: `rotate(-90 12 ${(mg.t + H - mg.b) / 2})` }, svg); yt.textContent = "Alignment fraction";
  const cur = B[st.mag];
  for (const b of pts) {
    const c = el("circle", { class: "pt", cx: X(b.ref[1]), cy: Y(b.ref[2]), r: 3.5, fill: b.kind === "none" ? "var(--c2)" : "var(--c1)", "fill-opacity": 0.75, "data-mag": b.id }, svg);
    c.addEventListener("mousemove", (ev) => showTip(ev, `<i>${esc(b.name)}</i> <span class="mono">${b.id}</span><br>closest: <i>${esc(b.ref[0])}</i><br>ANI ${b.ref[1]}% · AF ${b.ref[2]}${b.radius ? ` · radius ${b.radius}%` : ""}`));
    c.addEventListener("mouseleave", hideTip);
  }
  if (cur.ref) el("circle", { cx: X(cur.ref[1]), cy: Y(cur.ref[2]), r: 7, fill: "none", stroke: "var(--ink)", "stroke-width": 2 }, svg);
  host.innerHTML = ""; host.appendChild(svg);
  const radii = B.filter((b) => b.radius && b.radius !== 95).length;
  $("anAniNote").textContent = `${pts.length} of ${B.length} MAGs; ${B.length - pts.length} have no reference close enough for GTDB-Tk to report an ANI. ${radii} MAGs with a species name have a species radius other than 95% (shown in the card).`;
}

// --- hypothetical share per MAG, by name kind and by phylum
function drawHyp() {
  const host = $("anHyp");
  const phyla = [...new Set(B.map((b) => b.ranks[1]))].map((p) => [p, B.filter((b) => b.ranks[1] === p).length]).sort((a, b) => b[1] - a[1]);
  const rows = [...["latin", "placeholder", "none"].map((k) => [KIND[k], (b) => b.kind === k]), ...phyla.map(([p, n]) => [`${p} (${n})`, (b) => b.ranks[1] === p])];
  const W = Math.max(300, host.clientWidth || 300), lab = 170, rowH = 22, H = rows.length * rowH + 40, mg = { r: 12, t: 6 };
  const X = (v) => lab + v * (W - lab - mg.r);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Share of hypothetical proteins per MAG" });
  for (let f = 0; f <= 1.001; f += 0.2) { el("line", { class: "grid", x1: X(f), x2: X(f), y1: mg.t, y2: H - 30 }, svg); el("text", { x: X(f), y: H - 16, "text-anchor": "middle", class: "lbl" }, svg).textContent = `${Math.round(f * 100)}%`; }
  el("text", { x: (lab + W - mg.r) / 2, y: H - 2, "text-anchor": "middle", class: "lbl" }, svg).textContent = "Hypothetical proteins, share of CDS";
  const cur = B[st.mag];
  rows.forEach(([label, f], i) => {
    const y = mg.t + i * rowH + rowH / 2, set = B.filter(f), vals = set.map(hypShare).sort((a, b) => a - b);
    if (i === 3) el("line", { x1: 4, x2: W - mg.r, y1: y - rowH / 2, y2: y - rowH / 2, stroke: "var(--line)" }, svg);
    el("text", { x: lab - 8, y: y + 4, "text-anchor": "end", class: "mlbl" }, svg).textContent = label;
    set.forEach((b, j) => {
      const c = el("circle", { class: "pt", cx: X(hypShare(b)), cy: y + (((j * 7919) % 11) - 5) * 0.9, r: 2.6, fill: "var(--c1)", "fill-opacity": 0.55, "data-mag": b.id }, svg);
      c.addEventListener("mousemove", (ev) => showTip(ev, `<i>${esc(b.name)}</i> <span class="mono">${b.id}</span><br>${num(b.hyp)} of ${num(b.cds)} CDS hypothetical (${pct(b.hyp, b.cds)})`));
      c.addEventListener("mouseleave", hideTip);
    });
    if (vals.length > 1) { const m = vals.length % 2 ? vals[(vals.length - 1) / 2] : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2; el("line", { x1: X(m), x2: X(m), y1: y - 8, y2: y + 8, stroke: "var(--ink)", "stroke-width": 2.5 }, svg); }
    if (f(cur)) el("circle", { cx: X(hypShare(cur)), cy: y, r: 6.5, fill: "none", stroke: "var(--ink)", "stroke-width": 2 }, svg);
  });
  host.innerHTML = ""; host.appendChild(svg);
}

// --- evidence bar (all MAGs) and identity histogram
function evBar(host, counts, total, height = 18) {
  host.innerHTML = `<div class="evbar" style="height:${height}px">${EV_ORDER.filter((k) => counts[k]).map((k) => `<span style="width:${(100 * counts[k]) / total}%;background:${EV[k].c}" title="${esc(EV[k].t)}: ${num(counts[k])} (${pct(counts[k], total)})"></span>`).join("")}</div>`;
}
function drawEvidence() {
  const ev = NUM.evidence, total = NUM.cds;
  evBar($("anEvBar"), ev, total, 24);
  $("anEvLegend").innerHTML = EV_ORDER.filter((k) => k in ev).map((k) => `<span><i class="sw" style="background:${EV[k].c}"></i>${esc(EV[k].t)}: ${num(ev[k])} (${pct(ev[k], total, ev[k] / total < 0.001 ? 2 : 1)})</span>`).join("");
  const h = NUM.id_hist, host = $("anIdHist"), W = Math.max(280, host.clientWidth || 280), H = 170, mg = { l: 54, r: 22, t: 8, b: 34 };
  const max = Math.max(...h), bw = (W - mg.l - mg.r) / h.length, Y = (v) => H - mg.b - (v / max) * (H - mg.t - mg.b);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Identity of cluster matches" });
  for (let t = 0; t <= max; t += 50000) { el("line", { class: "grid", x1: mg.l, x2: W - mg.r, y1: Y(t), y2: Y(t) }, svg); el("text", { x: mg.l - 6, y: Y(t) + 4, "text-anchor": "end", class: "lbl" }, svg).textContent = `${t / 1000}k`; }
  h.forEach((v, i) => {
    const r = el("rect", { x: mg.l + i * bw + 1, y: Y(v), width: bw - 2, height: H - mg.b - Y(v), fill: "var(--c1)" }, svg);
    r.addEventListener("mousemove", (e) => showTip(e, `${50 + 5 * i}-${55 + 5 * i}% identity: ${num(v)} CDS`)); r.addEventListener("mouseleave", hideTip);
  });
  for (let i = 0; i <= h.length; i += 2) el("text", { x: mg.l + i * bw, y: H - mg.b + 14, "text-anchor": "middle", class: "lbl" }, svg).textContent = `${50 + 5 * i}%`;
  el("text", { x: (mg.l + W - mg.r) / 2, y: H - 4, "text-anchor": "middle", class: "lbl" }, svg).textContent = "Amino-acid identity";
  host.innerHTML = ""; host.appendChild(svg);
}

// --- MAG card
function drawCard() {
  const b = B[st.mag], ev = Object.fromEntries(EVN.filter((k) => k !== "rna").map((k, i) => [k, b.ev[i]]));
  const ranks = ["domain", "phylum", "class", "order", "family", "genus", "species"].map((r, i) => b.ranks[i] ? `<span>${r}: <i>${esc(b.ranks[i])}</i></span>` : `<span class="muted">${r}: –</span>`).join(" · ");
  const ref = b.ref ? `<i>${esc(b.ref[0])}</i>: ANI ${b.ref[1]}%, AF ${b.ref[2]}${b.radius ? ` (species radius ${b.radius}%)` : ""}` : "none close enough to report an ANI";
  const named = b.cds - b.hyp;
  $("anCard").innerHTML = `<div class="head"><span class="kicker">MAG <span class="mono">${b.id}</span> · ${b.q === "HQ" ? "high quality" : "medium quality"}</span><h3><i>${esc(b.name)}</i></h3>
    <div class="facts"><span><b>${fmtBp(b.size)}</b> in ${b.n} contig${b.n === 1 ? "" : "s"}</span><span><b>${b.cov}x</b> depth</span><span>${KIND[b.kind]}</span></div>
    <p class="tax">${ranks}</p></div>
    <table class="chk"><tbody>
      <tr><th>Named by</th><td>${METHOD[b.method]}${b.note ? `<div class="muted">${esc(b.note)}</div>` : ""}${b.warn ? `<div class="muted">Warning: ${esc(b.warn)}</div>` : ""}</td></tr>
      <tr><th>Closest reference</th><td>${ref}${b.related ? `<div class="muted">GTDB-Tk's other related references: ${b.related[0]}, at ${b.related[1]}-${b.related[2]}% ANI</div>` : ""}</td></tr>
      ${b.place && !b.radius ? `<tr><th>Placement reference</th><td><i>${esc(b.place[0])}</i>: ANI ${b.place[1]}%, AF ${b.place[2]} (radius ${b.place[3]}%) <span class="muted">· the reference on the MAG's branch of the tree</span></td></tr>` : ""}
      ${b.red !== null ? `<tr><th>RED</th><td>${b.red} <span class="muted">(GTDB-Tk reports it when it was needed for the classification)</span></td></tr>` : ""}
      <tr><th>Marker alignment</th><td>${b.msa}% of the marker-gene alignment covered</td></tr>
      <tr><th>Genes (CDS)</th><td>${num(b.cds)}: ${num(named)} named (${pct(named, b.cds)}), ${num(b.hyp)} hypothetical (${pct(b.hyp, b.cds)}); ${num(b.vague)} names are DUF or "uncharacterized"</td></tr>
      <tr><th>Resistance protein matches</th><td>${b.amr.length ? b.amr.map((a) => `<code>${esc(a)}</code>`).join(" ") : "none"}${ev.amr_family ? ` <span class="muted">· ${ev.amr_family} family-model match${ev.amr_family === 1 ? "" : "es"}</span>` : ""}</td></tr>
    </tbody></table>
    <div id="anCardEv"></div>
    <div class="legend">${EV_ORDER.filter((k) => ev[k]).map((k) => `<span><i class="sw" style="background:${EV[k].c}"></i>${esc(EV[k].t)}: ${num(ev[k])}</span>`).join("")}</div>
    ${MAPS.mags[b.id] ? `<button class="link" id="anToMap" type="button">Show its gene map</button>` : `<p class="note">Gene map available for: ${MAP_IDS.join(", ")}.</p>`}
    ${magLinks(b.id, "annotation")}`;
  evBar($("anCardEv"), ev, b.cds);
  const go = $("anToMap");
  if (go) go.addEventListener("click", () => { setMap(b.id); drawMapAll(); write(); $("anMap").scrollIntoView({ behavior: "smooth", block: "start" }); });
}

// --- gene map
const M = () => MAPS.mags[st.map];
const winBp = () => +$("anWin").value * 1000;
const gName = (g) => g[5] >= 0 ? MAPS.symbols[g[5]] : "";
const gProd = (g) => MAPS.products[g[4]];
const gPfam = (g) => g[8] >= 0 ? MAPS.pfam[g[8]] : "";
const matches = (g, q) => { const s = q.toLowerCase(); return gProd(g).toLowerCase().includes(s) || gName(g).toLowerCase().includes(s) || gPfam(g).toLowerCase().includes(s); };
function setMap(id) { st.map = id; st.ctg = 0; st.pos = 0; }
function clampPos() { const len = M().contigs[st.ctg][1]; st.pos = Math.max(0, Math.min(st.pos, Math.max(0, len - winBp()))); }
function geneTip(ev, g) {
  const c = M().contigs[g[0]], aa = Math.round((g[2] - g[1] + 1) / 3) - 1, k = EVN[g[6]];
  showTip(ev, `<b>${esc(gProd(g))}</b>${gName(g) ? ` <span class="mono">${esc(gName(g))}</span>` : ""}<br><span class="mono">${c[0]}</span> ${num(g[1])}-${num(g[2])} (${g[3] > 0 ? "+" : "−"})${k !== "rna" ? ` · ${num(aa)} aa` : ""}<br>${esc(EV[k].t)}${g[7] !== null ? ` · identity ${g[7]}%` : ""}${gPfam(g) ? `<br>Pfam: ${esc(gPfam(g))}` : ""}`);
}
function drawMapControls() {
  $("anMapMag").innerHTML = MAP_IDS.map((id) => `<option value="${id}">${id} ${esc(B[magIdx.get(id)].name)}</option>`).join("");
  $("anMapMag").value = st.map;
  $("anCtg").innerHTML = M().contigs.map((c, i) => `<option value="${i}">${c[0]} (${fmtBp(c[1])}${c[2] ? ", circular" : ""}${VERDICT[c[3]] ? ", " + VERDICT[c[3]] : ""})</option>`).join("");
  $("anCtg").value = st.ctg;
  $("anQ").value = st.q;
}
function drawOverview() {
  const host = $("anOverview"), m = M(), c = m.contigs[st.ctg], len = c[1];
  const W = Math.max(320, host.clientWidth || 320), H = 52, mg = { l: 8, r: 8 }, X = (p) => mg.l + (p / len) * (W - mg.l - mg.r);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Contig overview: genes by evidence; click to move the window" });
  el("rect", { x: mg.l, y: 10, width: W - mg.l - mg.r, height: 20, fill: "var(--accent-soft)" }, svg);
  const genes = m.genes.filter((g) => g[0] === st.ctg);
  for (const g of genes) el("rect", { x: X(g[1]), y: g[3] > 0 ? 10 : 20, width: Math.max(0.6, X(g[2]) - X(g[1])), height: 10, fill: EV[EVN[g[6]]].c }, svg);
  if (st.q) for (const g of genes.filter((g) => matches(g, st.q))) el("path", { d: `M${X((g[1] + g[2]) / 2)} 8 l-4 -6 h8 z`, fill: "var(--ink)" }, svg);
  el("rect", { x: X(st.pos), y: 6, width: Math.max(2, X(st.pos + winBp()) - X(st.pos)), height: 28, fill: "none", stroke: "var(--ink)", "stroke-width": 1.5 }, svg);
  for (let t = 0; t <= len; t += len > 2e6 ? 5e5 : len > 5e5 ? 1e5 : 5e4) el("text", { x: X(t), y: 46, "text-anchor": "middle", class: "lbl" }, svg).textContent = t ? fmtBp(t) : "0";
  svg.addEventListener("click", (ev) => { const r = svg.getBoundingClientRect(); st.pos = Math.round(((ev.clientX - r.left - mg.l) / (W - mg.l - mg.r)) * len - winBp() / 2); clampPos(); drawWindow(); drawOverview(); write(); });
  host.innerHTML = ""; host.appendChild(svg);
  const hyp = genes.filter((g) => ["pfam_only", "none", "cluster_unnamed"].includes(EVN[g[6]])).length, cds = genes.filter((g) => EVN[g[6]] !== "rna").length;
  $("anMapInfo").textContent = `${num(cds)} CDS on this contig, ${pct(hyp, cds)} hypothetical · window ${num(st.pos + 1)}-${num(Math.min(len, st.pos + winBp()))}`;
}
function drawWindow() {
  const host = $("anZoom"), m = M(), lo = st.pos, hi = st.pos + winBp();
  const W = Math.max(320, host.clientWidth || 320), H = 150, mg = { l: 8, r: 8 }, X = (p) => mg.l + ((p - lo) / (hi - lo)) * (W - mg.l - mg.r);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Genes in the window" });
  const yPlus = 30, yMinus = 92, h = 22;
  el("line", { x1: mg.l, x2: W - mg.r, y1: 72, y2: 72, stroke: "var(--line)" }, svg);
  el("text", { x: mg.l, y: 14, class: "lbl" }, svg).textContent = "+ strand";
  el("text", { x: mg.l, y: H - 26, class: "lbl" }, svg).textContent = "− strand";
  const inWin = m.genes.filter((g) => g[0] === st.ctg && g[2] >= lo && g[1] <= hi);
  for (const g of inWin) {
    const x1 = Math.max(mg.l, X(g[1])), x2 = Math.min(W - mg.r, X(g[2])), y = g[3] > 0 ? yPlus : yMinus, tipLen = Math.min(8, (x2 - x1) * 0.4);
    const d = g[3] > 0 ? `M${x1} ${y} H${x2 - tipLen} L${x2} ${y + h / 2} L${x2 - tipLen} ${y + h} H${x1} Z` : `M${x2} ${y} H${x1 + tipLen} L${x1} ${y + h / 2} L${x1 + tipLen} ${y + h} H${x2} Z`;
    const hit = st.q && matches(g, st.q);
    const p = el("path", { d, fill: EV[EVN[g[6]]].c, "fill-opacity": EVN[g[6]] === "none" ? 0.6 : 0.9, stroke: hit ? "var(--ink)" : "var(--surface)", "stroke-width": hit ? 2.5 : 1, class: "gene" }, svg);
    p.addEventListener("mousemove", (ev) => geneTip(ev, g)); p.addEventListener("mouseleave", hideTip);
    const label = gName(g) || (EVN[g[6]] === "pfam_only" ? gPfam(g).split(" (")[0] : EVN[g[6]] === "none" || gProd(g) === "hypothetical protein" ? "" : gProd(g));
    if (label && x2 - x1 > label.length * 6.2 + 6) el("text", { x: (x1 + x2) / 2, y: y + h / 2 + 4, "text-anchor": "middle", class: "glbl" }, svg).textContent = label;
  }
  const step = winBp() >= 5e4 ? 1e4 : winBp() >= 2e4 ? 5e3 : 2e3;
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) { el("line", { x1: X(t), x2: X(t), y1: 66, y2: 78, stroke: "var(--faint)" }, svg); el("text", { x: Math.min(W - 24, Math.max(18, X(t))), y: H - 6, "text-anchor": "middle", class: "lbl" }, svg).textContent = `${num(t / 1000)} kb`; }
  host.innerHTML = ""; host.appendChild(svg);
  $("anGenes").innerHTML = geneTable(inWin, false);
  const box = $("anGenes"), hl = box.querySelector("tr.hl");
  box.scrollTop = 0;
  if (hl) box.scrollTop = Math.max(0, hl.getBoundingClientRect().top - box.getBoundingClientRect().top - 40);
}
function geneTable(genes, withContig) {
  if (!genes.length) return `<p class="note">${withContig ? "No gene in this MAG matches." : "No gene in this window."}</p>`;
  const m = M();
  const evCell = (g) => `<td class="ev" title="${esc(EV[EVN[g[6]]].t)}"><i class="sw" style="background:${EV[EVN[g[6]]].c}"></i>${esc(EV[EVN[g[6]]].s)}</td>`;
  if (withContig) return `<table class="ct gt"><thead><tr><th>Contig</th><th class="r">Start</th><th>Product or Pfam domain</th><th>Evidence</th></tr></thead><tbody>${genes.map((g) => `<tr class="click" data-c="${g[0]}" data-p="${g[1]}"><td class="mono">${m.contigs[g[0]][0]}</td><td class="r">${num(g[1])}</td><td>${gName(g) ? `<span class="mono">${esc(gName(g))}</span> ` : ""}${esc(gPfam(g) || gProd(g))}</td>${evCell(g)}</tr>`).join("")}</tbody></table>`;
  return `<table class="ct gt"><thead><tr><th class="r">Start</th><th class="r">End</th><th></th><th>Gene</th><th>Product</th><th>Evidence</th><th class="r">Identity</th><th>Pfam (hypothetical only)</th></tr></thead><tbody>${genes.map((g) => `<tr class="${st.q && matches(g, st.q) ? "hl" : ""}"><td class="r">${num(g[1])}</td><td class="r">${num(g[2])}</td><td>${g[3] > 0 ? "+" : "−"}</td><td class="mono">${esc(gName(g))}</td><td>${esc(gProd(g))}</td>${evCell(g)}<td class="r">${g[7] !== null ? g[7] + "%" : ""}</td><td class="pf">${esc(gPfam(g))}</td></tr>`).join("")}</tbody></table>`;
}
function drawHits() {
  if (!st.q) { $("anHits").innerHTML = `<p class="note">Type in the Find box to list matching genes in this MAG.</p>`; return; }
  const hits = M().genes.filter((g) => matches(g, st.q));
  $("anHits").innerHTML = `<p class="count">${hits.length} gene${hits.length === 1 ? "" : "s"} match "${esc(st.q)}"${hits.length > 200 ? "; first 200 shown" : ""}. Click one to move the window there.</p>` + geneTable(hits.slice(0, 200), true);
}
function drawMapAll() { drawMapControls(); clampPos(); drawOverview(); drawWindow(); drawHits(); }

// --- resistance genes
function drawAmr() {
  $("anAmr").innerHTML = `<table class="ct"><thead><tr><th>Gene</th><th>Product</th><th class="r">Genes</th><th class="r">MAGs</th></tr></thead><tbody>${DATA.amr.map(([sym, prod, n, k]) => `<tr class="click${sym === st.amr ? " hl" : ""}" data-amr="${esc(sym)}"><td class="mono">${esc(sym)}</td><td>${esc(prod)}</td><td class="r">${n}</td><td class="r">${k}</td></tr>`).join("")}</tbody></table>`;
  const mags = st.amr ? B.filter((b) => b.amr.includes(st.amr)) : [];
  $("anAmrMags").innerHTML = st.amr ? `<p class="note">MAGs with <code>${esc(st.amr)}</code>: ${mags.map((b) => `<button class="link" data-mag="${b.id}">${b.id} <i>${esc(b.name)}</i></button>`).join(", ")}</p>` : "";
}

// --- state
function params() {
  const p = { mag: B[st.mag].id, map: st.map };
  if (st.ctg) p.ctg = M().contigs[st.ctg][0];
  if (st.pos) p.pos = st.pos;
  if ($("anWin").value !== DEFAULTS.win) p.win = $("anWin").value;
  if (st.q) p.q = st.q;
  if (st.amr) p.amr = st.amr;
  if (examples.current >= 0) p.ex = examples.current + 1;
  return p;
}
const write = () => writeHashParams(params());
function applyState(s) {
  st.mag = magIdx.has(s.mag) ? magIdx.get(s.mag) : magIdx.get(DEFAULTS.mag);
  st.map = MAPS.mags[s.map] ? s.map : MAPS.mags[s.mag] ? s.mag : DEFAULTS.map;
  const ci = M().contigs.findIndex((c) => c[0] === s.ctg);
  st.ctg = ci >= 0 ? ci : 0;
  $("anWin").value = ["10", "20", "50"].includes(String(s.win)) ? String(s.win) : DEFAULTS.win;
  st.pos = Number.isFinite(+s.pos) ? Math.round(+s.pos) : 0;
  st.q = s.q || "";
  st.amr = DATA.amr.some((r) => r[0] === s.amr) ? s.amr : "";
  if (st.q && s.pos === undefined) { const g = M().genes.find((g) => g[0] === st.ctg && matches(g, st.q)) || M().genes.find((g) => matches(g, st.q)); if (g) { st.ctg = g[0]; st.pos = Math.round((g[1] + g[2]) / 2 - winBp() / 2); } }
  clampPos();
}
function drawMagViews() { drawCard(); drawAni(); drawHyp(); }
function drawAll(push = true) { drawMagViews(); drawMapAll(); drawAmr(); if (push) write(); }
function openMag(id) { if (!magIdx.has(id)) return; st.mag = magIdx.get(id); drawMagViews(); write(); }

function setup() {
  fillNumbers(); drawNovel(); drawEvidence();
  $("anMags").innerHTML = B.map((b) => `<option value="${b.id} ${esc(b.name)}">`).join("");
  $("anMapLegend").innerHTML = EV_ORDER.map((k) => `<span><i class="sw" style="background:${EV[k].c}"></i>${esc(EV[k].t)}</span>`).join("");
  $("anFind").addEventListener("change", (e) => openMag(e.target.value.split(" ")[0]));
  for (const id of ["anAni", "anHyp", "anNovel", "anAmrMags"]) $(id).addEventListener("click", (e) => { const t = e.target.closest("[data-mag]"); if (t) { hideTip(); openMag(t.dataset.mag); $("anCard").scrollIntoView({ behavior: "smooth", block: "nearest" }); } });
  $("anAmr").addEventListener("click", (e) => { const t = e.target.closest("[data-amr]"); if (t) { st.amr = st.amr === t.dataset.amr ? "" : t.dataset.amr; drawAmr(); write(); } });
  $("anMapMag").addEventListener("input", (e) => { setMap(e.target.value); drawMapAll(); write(); });
  $("anCtg").addEventListener("input", (e) => { st.ctg = +e.target.value; st.pos = 0; drawMapAll(); write(); });
  $("anWin").addEventListener("input", () => { clampPos(); drawOverview(); drawWindow(); write(); });
  $("anPrev").addEventListener("click", () => { st.pos -= winBp() * 0.8; clampPos(); drawOverview(); drawWindow(); write(); });
  $("anNext").addEventListener("click", () => { st.pos += winBp() * 0.8; clampPos(); drawOverview(); drawWindow(); write(); });
  let qTimer;
  $("anQ").addEventListener("input", (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { st.q = e.target.value.trim(); drawOverview(); drawWindow(); drawHits(); write(); }, 200); });
  $("anHits").addEventListener("click", (e) => { const r = e.target.closest("[data-c]"); if (r) { st.ctg = +r.dataset.c; st.pos = Math.round(+r.dataset.p - winBp() / 2); $("anCtg").value = st.ctg; clampPos(); drawOverview(); drawWindow(); write(); } });
  $("anCopy").addEventListener("click", async () => {
    write();
    let ok = true; try { await navigator.clipboard.writeText(location.href); } catch (e) { ok = false; }
    $("anCopied").textContent = ok ? "Copied." : "Copy the address from the browser bar.";
    setTimeout(() => { $("anCopied").textContent = ""; }, 2500);
  });
}
const examples = setupExamples($("anExamples"), (k) => { applyState(EXAMPLES[k].state); drawAll(); });
setup();
(function start() {
  const s = readHashParams(), ex = parseInt(s.ex, 10);
  if (ex >= 1 && ex <= EXAMPLES.length) { examples.current = ex - 1; examples.draw(); applyState({ ...EXAMPLES[ex - 1].state, ...s }); }
  else applyState(s);
  drawAll(false);
})();
let resizeTimer;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { drawEvidence(); drawAll(false); }, 150); });
