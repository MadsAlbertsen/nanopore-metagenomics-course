// Module 8: function (genes). DATA from the example analysis (np26 scripts/29_course_annotation.py):
// numbers (headline counts), evidence (evidence class names), amr (AMRFinderPlus protein matches by product),
// bins (per MAG: GTDB-Tk ranks, method, closest reference [species, ANI, AF], RED, gene evidence counts),
// maps (gene maps for a few MAGs: contigs [id, length, circular, module-6 verdict] and genes
// [contig, start, stop, strand, product, symbol, evidence, identity %, Pfam]; products, symbols and pfam are lookups);
// fn (np26 scripts/66_course_function.py): two tools, leave-out, incomplete MAGs and the glycyl radical enzyme tree.
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
const KIND = { latin: "Latin species name", placeholder: "Placeholder species name", none: "Genus only" };
const VERDICT = { missing_motif: "flagged in module 6: lacks a motif of the rest", extra_motif: "flagged in module 6: extra motif" };
const pct = (a, b, d = 1) => !b ? "–" : a && (100 * a) / b < 10 ** -d ? `<${10 ** -d}%` : `${((100 * a) / b).toFixed(d)}%`;
const num = (n) => Number(n).toLocaleString("en");
const hypShare = (b) => b.hyp / b.cds;
const DEFAULTS = { mag: "1.308", map: "1.308", win: "20" };
const st = { mag: 0, map: "1.308", ctg: 0, pos: 0, q: "", amr: "", lv: "", inc: "c.38", meth: "blocks", col: "clade", tq: "", prod: "" };

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
  Object.assign(N, fnNumbers());
  for (const e of document.querySelectorAll("[data-n]")) e.textContent = N[e.dataset.n] ?? "?";
  $("anStats").innerHTML = [[NUM.mags, "MAGs"], [NUM.cds, "protein-coding genes"], [`${(100 * NUM.hyp / NUM.cds).toFixed(1)}%`, "without a name (hypothetical)"], [NUM.amr_genes, "matches to a resistance protein"]]
    .map(([n, t]) => `<div class="stat"><b>${typeof n === "number" ? num(n) : n}</b><span>${t}</span></div>`).join("");
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
  const named = b.cds - b.hyp;
  $("anCard").innerHTML = `<div class="head"><span class="kicker">MAG <span class="mono">${b.id}</span> · ${b.q === "HQ" ? "high quality" : "medium quality"}</span><h3><i>${esc(b.name)}</i></h3>
    <div class="facts"><span><b>${fmtBp(b.size)}</b> in ${b.n} contig${b.n === 1 ? "" : "s"}</span><span><b>${b.cov}x</b> depth</span><span>${KIND[b.kind]}</span></div>
    <p class="tax">${ranks}</p></div>
    <table class="chk"><tbody>
      <tr><th>Name</th><td>${KIND[b.kind]} from GTDB-Tk${b.ref ? `: ANI ${b.ref[1]}% to <i>${esc(b.ref[0])}</i>` : ""} <span class="muted">· the evidence for the name is in module 7</span></td></tr>
      <tr><th>Genes (CDS)</th><td>${num(b.cds)}: ${num(named)} named (${pct(named, b.cds)}), ${num(b.hyp)} hypothetical (${pct(b.hyp, b.cds)}); ${num(b.vague)} names are DUF or "uncharacterized"</td></tr>
      <tr><th>Resistance protein matches</th><td>${b.amr.length ? b.amr.map((a) => `<code>${esc(a)}</code>`).join(" ") : "none"}${ev.amr_family ? ` <span class="muted">· ${ev.amr_family} family-model match${ev.amr_family === 1 ? "" : "es"}</span>` : ""}</td></tr>
    </tbody></table>
    <div id="anCardEv"></div>
    <div class="legend">${EV_ORDER.filter((k) => ev[k]).map((k) => `<span><i class="sw" style="background:${EV[k].c}"></i>${esc(EV[k].t)}: ${num(ev[k])}</span>`).join("")}</div>
    ${MAPS.mags[b.id] ? `<button class="link" id="anToMap" type="button">Show its gene map</button>` : `<p class="note">Gene map available for: ${MAP_IDS.join(", ")}.</p>`}
    ${magLinks(b.id, "function")}`;
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


// --- new parts (np26 scripts/66_course_function.py, key "fn"): two tools, leave-out, incomplete MAGs, glycyl radical enzyme tree
const FN = DATA.fn;
const TCLS = [["both", "Both name it", "var(--c1)"], ["bakta_only", "Bakta only", "var(--c2)"], ["kofam_only", "KOfam only", "var(--c3)"], ["neither", "Neither", "var(--v4)"]];
const GRD = [["same", "Same function", "var(--c1)"], ["bakta_vaguer", "Bakta's name vaguer", "var(--c3)"], ["kofam_vaguer", "KOfam's KO vaguer", "var(--c4)"], ["different", "Different function", "var(--c2)"]];
const LVG = [["Same KO", "var(--c1)"], ["Another KO", "var(--c2)"], ["Match without a KO", "var(--c4)"], ["No match", "var(--v4)"]];
const LVN = { none: "Nothing removed", species: "Species removed", genus: "Genus removed", family: "Family removed", order: "Order removed" };
const TMAG = (id) => FN.tools.mags.find((m) => m.id === id);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const mean = (xs) => sum(xs) / xs.length;
const legendHtml = (items) => items.map(([t, c]) => `<span><i class="sw" style="background:${c}"></i>${esc(t)}</span>`).join("");
function hbars(host, rows, colors, opts = {}) {
  // rows: [label, [counts...], right label]; horizontal stacked bars of shares
  const W = Math.max(300, host.clientWidth || 300), lab = Math.min(opts.lab ?? 150, W * 0.4), right = opts.right ?? 0, rowH = 28, H = rows.length * rowH + 22;
  const X = (f) => lab + f * (W - lab - right - 6);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.aria || "Bar chart" });
  for (let f = 0; f <= 1.001; f += 0.25) { el("line", { class: "grid", x1: X(f), x2: X(f), y1: 0, y2: H - 18 }, svg); el("text", { x: X(f), y: H - 4, "text-anchor": "middle", class: "lbl" }, svg).textContent = `${Math.round(f * 100)}%`; }
  rows.forEach(([label, counts, rlab, names], i) => {
    const y = i * rowH + 4, tot = sum(counts);
    el("text", { x: lab - 8, y: y + 15, "text-anchor": "end", class: "mlbl" }, svg).textContent = label;
    let acc = 0;
    counts.forEach((c, j) => {
      if (!c) return;
      const x1 = X(acc / tot), x2 = X((acc + c) / tot);
      const r = el("rect", { x: x1, y, width: Math.max(0.5, x2 - x1 - 1), height: 20, fill: colors[j], rx: 2 }, svg);
      r.addEventListener("mousemove", (ev) => showTip(ev, `${esc(label)}<br>${esc(names[j])}: ${num(c)} of ${num(tot)} (${pct(c, tot)})`)); r.addEventListener("mouseleave", hideTip);
      if (x2 - x1 > 38) el("text", { x: (x1 + x2) / 2, y: y + 14, "text-anchor": "middle", class: "glbl", style: j === counts.length - 1 && colors[j] === "var(--v4)" ? "fill:var(--ink)" : "" }, svg).textContent = `${Math.round((100 * c) / tot)}%`;
      acc += c;
    });
    if (rlab) el("text", { x: W - 2, y: y + 15, "text-anchor": "end", class: "mlbl" }, svg).textContent = rlab;
  });
  host.innerHTML = ""; host.appendChild(svg);
}
function fnNumbers() {
  const t = FN.tools, P = t.pooled, lv = FN.leave, inc = FN.incomplete, gr = FN.gre, rec = FN.recoded;
  const pooledLv = (level) => [0, 1, 2, 3].map((j) => sum(lv.mags.map((m) => lv.grades[level][m][j])));
  const share = (level, j) => { const c = pooledLv(level); return c[j] / sum(c); };
  const p1 = (x) => `${(100 * x).toFixed(1)}%`;
  const rng = (xs, u = "%") => { const a = Math.min(...xs), b = Math.max(...xs); return a === b ? `${a}${u}` : `${a}-${b}${u}`; };
  const incShare = (k) => mean(inc.mags.map((m) => 1 - mean(inc.draws[m.id].blocks[k]) / m.full));
  const ords = Object.entries(rec.orders).sort((a, b) => b[1] - a[1]);
  const big = ords.filter(([, n]) => n > 1), small = ords.filter(([, n]) => n === 1);
  const cap = (x) => String(x)[0].toUpperCase() + String(x).slice(1);
  const words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  return {
    tCds: num(t.cds), tBakta: `${num(P.both + P.bakta_only)} (${pct(P.both + P.bakta_only, t.cds)})`, tKofam: `${num(P.both + P.kofam_only)} (${pct(P.both + P.kofam_only, t.cds)})`,
    tNeither: `${num(P.neither)} (${pct(P.neither, t.cds)})`, tEcN: num(t.ec_n), tEc: `${num(t.ec_agree)} (${pct(t.ec_agree, t.ec_n)})`, tGradeN: t.grade_n,
    recContigs: rec.contigs, recMags: rec.mags, recRt: num(rec.readthrough),
    recGainMag: rec.gain_mag_max, recGainCtrl: rec.gain_ctrl_min,
    recTgaMag: rng(rec.tga_mag.map((x) => Math.round(100 * x))), recTgaCtrl: rng(rec.tga_ctrl.map((x) => Math.round(100 * x))),
    recOutMag: p1(rec.outside_mag), recOutCtrl: p1(rec.outside_ctrl),
    recOrders: `${big.map(([o, n]) => `${n} in the order ${o}`).join(", ")}${small.length ? ` and ${words[small.length] || small.length} in other orders` : ""}`,
    lvN: num(lv.n), lvSpecies: p1(share("species", 0)), lvOrder: p1(share("order", 0)), lvOrderId: rng(lv.mags.map((m) => lv.median_id.order[m])),
    lvOther: p1(Math.max(...lv.levels.map((l) => share(l, 1)))),
    mmN: num(lv.models.n), mmAbove: `${num(lv.models.other_ko_above)} (${pct(lv.models.other_ko_above, lv.models.n)})`,
    mmBelow: `${num(lv.models.other_ko_no_threshold)} (${pct(lv.models.other_ko_no_threshold, lv.models.n)})`, mmNone: `${num(lv.models.none)} (${pct(lv.models.none, lv.models.n)})`,
    incFull: `${inc.mags.map((m) => m.full).slice(0, -1).join(", ")} and ${inc.mags[inc.mags.length - 1].full} modules in the four MAGs`,
    incKo: `${inc.keeps.map((k) => p1(inc.ko_lost[k])).join(", ")} of them at ${inc.keeps.map((k) => Math.round(k * 100)).join(", ")}% complete`,
    inc95: p1(incShare(String(inc.keeps[0]))), inc70: p1(incShare(String(inc.keeps[inc.keeps.length - 1]))),
    grGenes: num(gr.genes), grMags: num(gr.mags), grFull: num(gr.full), grOut: num(gr.not_tree), grRefs: gr.refs.length,
    grKinds: new Set(gr.refs.map((r) => r[2])).size, grPflNamed: num(gr.pfl_named.n), grPflIn: num(gr.pfl_named.in_pfl),
    grCounts: (() => { const c = gr.clades, other = sum(Object.entries(c).filter(([k]) => !["PFL", "HypD", "CutC", "diol dehydratase", "unresolved"].includes(k)).map(([, n]) => n)); return `${num(c.PFL)} come out as PFL, ${c["diol dehydratase"]} as diol dehydratase, ${c.HypD} as HypD, ${c.CutC} as CutC and ${other} as one of the other kinds; ${c.unresolved} stay unresolved`; })(),
    grSupport: (() => { const s80 = gr.support["80"], s99 = gr.support["99"], same = ["PFL", "HypD", "CutC", "diol dehydratase", "unresolved"].every((k) => s80[k] === gr.clades[k] && gr.support["90"][k] === gr.clades[k]); return `${same ? "the labels are the same at bootstrap 80 and 90" : "the labels shift at bootstrap 80 or 90"}, and at 99 ${gr.clades["diol dehydratase"] - s99["diol dehydratase"]} of the diol dehydratase genes become unresolved`; })(),
    grKo: `all ${num(gr.clades.PFL)} PFL genes have KEGG's PFL KO (K00656), all ${gr.clades.HypD} HypD genes the HypD KO (K23121), and ${gr.ko_clade.CutC.K20038} of the ${gr.clades.CutC} CutC genes the CutC KO (K20038)`,
    grDiolKo: gr.ko_clade["diol dehydratase"].none === gr.clades["diol dehydratase"] ? `none of the ${gr.clades["diol dehydratase"]}` : `${gr.clades["diol dehydratase"] - gr.ko_clade["diol dehydratase"].none} of the ${gr.clades["diol dehydratase"]}`,
    grNear: `${gr.near_agree.PFL} of the PFL, ${gr.near_agree.HypD} of the HypD, ${gr.near_agree["diol dehydratase"]} of the ${gr.clades["diol dehydratase"]} diol dehydratase and ${gr.near_agree.CutC} of the ${gr.clades.CutC} CutC genes`,
    grGly: num(gr.gly_named), grGlyIn: num(gr.ex_gly_diol.n), grGlyId: `${gr.ex_gly_diol.id[0]}-${gr.ex_gly_diol.id[1]}%`,
    grBss: num(gr.bss.n), grBssHypd: (words[gr.ex_bss_hypd.n] || num(gr.ex_bss_hypd.n)), grBssId: `${gr.ex_bss_hypd.id[0]}-${gr.ex_bss_hypd.id[1]}%`,
    grPflDiol: cap(words[gr.ex_pfl_diol.n] || gr.ex_pfl_diol.n), grPflDiolId: `${gr.ex_pfl_diol.id[0]}-${gr.ex_pfl_diol.id[1]}%`,
    grPflCutc: cap(words[gr.ex_pfl_cutc.n] || gr.ex_pfl_cutc.n), grPflCutcId: `${gr.ex_pfl_cutc.id[0]}-${gr.ex_pfl_cutc.id[1]}%`,
    grFar: cap(words[gr.ex_far.n] || gr.ex_far.n), grFarMax: `${gr.ex_far.id[1]}%`,
    grHpd: num(gr.ex_hpdb.n), grHpdInId: `${gr.ex_hpdb_in.id[1]}%`, grHpdUn: num(gr.ex_hpdb_unres.n), grHpdUnId: `${gr.ex_hpdb_unres.id[0]}-${gr.ex_hpdb_unres.id[1]}%`,
    grUnres: num(gr.clades.unresolved), grUnresId: `${gr.ex_unres.median_id}%`,
    grShown: `${sum(Object.values(gr.shown))} of the ${num(gr.full)}`,
  };
}
function drawTools() {
  const t = FN.tools, rows = t.mags.map((m) => [`${m.id} ${m.name}`, TCLS.map(([k]) => m[k] || 0), "", TCLS.map((c) => c[1])]);
  rows.push(["All four", TCLS.map(([k]) => t.pooled[k] || 0), "", TCLS.map((c) => c[1])]);
  hbars($("fnToolBars"), rows, TCLS.map((c) => c[2]), { lab: 240, right: 14, aria: "Which tool names the gene, per test MAG" });
  $("fnToolLegend").innerHTML = legendHtml(TCLS.map(([, n, c]) => [n, c]));
  hbars($("fnGradeBar"), [[`${t.grade_n} genes`, GRD.map(([k]) => t.grade[k] || 0), "", GRD.map((g) => g[1])]], GRD.map((g) => g[2]), { lab: 70, right: 14, aria: "Hand grading of genes named by both tools" });
  $("fnGradeLegend").innerHTML = legendHtml(GRD.map(([k, n, c]) => [`${n}: ${t.grade[k] || 0}`, c]));
  $("fnDiff").innerHTML = `<table class="ct gt"><thead><tr><th>Bakta</th><th>KO</th><th>KEGG name</th></tr></thead><tbody>${t.different.map(([p, k, d]) => `<tr><td>${esc(p)}</td><td class="mono">${k}</td><td>${esc(d)}</td></tr>`).join("")}</tbody></table>`;
}
function drawLeave() {
  const lv = FN.leave, mags = st.lv ? [st.lv] : lv.mags;
  const rows = lv.levels.map((l) => {
    const c = [0, 1, 2, 3].map((j) => sum(mags.map((m) => lv.grades[l][m][j])));
    const ids = mags.map((m) => lv.median_id[l][m]);
    return [LVN[l], c, mags.length === 1 ? `${ids[0]}%` : `${Math.min(...ids)}-${Math.max(...ids)}%`, LVG.map((g) => g[0])];
  });
  hbars($("fnLvBars"), rows, LVG.map((g) => g[1]), { lab: 120, right: 84, aria: "KO of the best remaining match by what was removed" });
  $("fnLvLegend").innerHTML = legendHtml(LVG);
  // same KO by identity
  const b = lv.by_id, host = $("fnById"), W = Math.max(280, host.clientWidth || 280), H = 200, mg = { l: 44, r: 10, t: 22, b: 34 };
  const n = b.n.length, bw = (W - mg.l - mg.r) / n, Y = (f) => H - mg.b - f * (H - mg.t - mg.b);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Share with the same KO by identity of the best match" });
  for (let f = 0; f <= 1.001; f += 0.25) { el("line", { class: "grid", x1: mg.l, x2: W - mg.r, y1: Y(f), y2: Y(f) }, svg); el("text", { x: mg.l - 6, y: Y(f) + 4, "text-anchor": "end", class: "lbl" }, svg).textContent = `${Math.round(f * 100)}%`; }
  b.n.forEach((tot, i) => {
    const f = tot ? b.same[i] / tot : 0, x = mg.l + i * bw;
    const r = el("rect", { x: x + 2, y: Y(f), width: bw - 4, height: H - mg.b - Y(f), fill: "var(--c1)", rx: 2 }, svg);
    r.addEventListener("mousemove", (ev) => showTip(ev, `${b.edges[i]}-${b.edges[i + 1]}% identity: ${num(b.same[i])} of ${num(tot)} genes keep their KO (${pct(b.same[i], tot)})`)); r.addEventListener("mouseleave", hideTip);
    el("text", { x: x + bw / 2, y: Y(f) - 4, "text-anchor": "middle", class: "lbl" }, svg).textContent = num(tot);
    el("text", { x: x + bw / 2, y: H - mg.b + 14, "text-anchor": "middle", class: "lbl" }, svg).textContent = `${b.edges[i]}-${b.edges[i + 1]}`;
  });
  el("text", { x: (mg.l + W - mg.r) / 2, y: H - 4, "text-anchor": "middle", class: "lbl" }, svg).textContent = "Identity of the best match (%)";
  host.innerHTML = ""; host.appendChild(svg);
}
function drawIncomplete() {
  const inc = FN.incomplete, m = inc.mags.find((x) => x.id === st.inc) || inc.mags[0], meth = st.meth;
  const host = $("fnIncDots"), W = Math.max(300, host.clientWidth || 300), lab = 110, rowH = 46, H = inc.keeps.length * rowH + 34, X = (f) => lab + f * (W - lab - 12);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Complete modules that look incomplete per draw" });
  for (let f = 0; f <= 1.001; f += 0.2) { el("line", { class: "grid", x1: X(f), x2: X(f), y1: 0, y2: H - 30 }, svg); el("text", { x: X(f), y: H - 16, "text-anchor": "middle", class: "lbl" }, svg).textContent = `${Math.round(f * 100)}%`; }
  el("text", { x: (lab + W) / 2, y: H - 2, "text-anchor": "middle", class: "lbl" }, svg).textContent = `Share of the ${m.full} complete modules that look incomplete`;
  inc.keeps.forEach((k, i) => {
    const vals = inc.draws[m.id][meth][String(k)].map((v) => 1 - v / m.full), y = i * rowH + rowH / 2;
    el("text", { x: lab - 8, y: y + 4, "text-anchor": "end", class: "mlbl" }, svg).textContent = `${Math.round(k * 100)}% kept`;
    vals.forEach((v, j) => {
      const c = el("circle", { cx: X(v), cy: y + (((j * 7919) % 13) - 6) * 1.3, r: 3, fill: "var(--c1)", "fill-opacity": 0.45 }, svg);
      c.addEventListener("mousemove", (ev) => showTip(ev, `Draw ${j + 1}: ${Math.round(v * m.full)} of ${m.full} modules look incomplete (${pct(v * m.full, m.full)})`)); c.addEventListener("mouseleave", hideTip);
    });
    const mu = mean(vals);
    el("line", { x1: X(mu), x2: X(mu), y1: y - 13, y2: y + 13, stroke: "var(--ink)", "stroke-width": 2.5 }, svg);
    el("text", { x: X(mu) + 6, y: y - 9, class: "lbl" }, svg).textContent = `mean ${(100 * mu).toFixed(1)}%`;
  });
  host.innerHTML = ""; host.appendChild(svg);
  $("fnIncLost").innerHTML = `<table class="ct gt"><thead><tr><th>Module</th><th>Name</th><th class="r">Draws</th></tr></thead><tbody>${inc.lost[m.id].map(([id, n, k]) => `<tr><td class="mono">${id}</td><td>${esc(n)}</td><td class="r">${k}</td></tr>`).join("")}</tbody></table>`;
}
// tree
const SHORT_GROUP = { "diol dehydratase": "Diol", "other kinds": "Other", unresolved: "Unres." };
const GROUP_C = { PFL: "var(--c1)", HypD: "var(--c2)", CutC: "var(--c3)", "diol dehydratase": "var(--c4)", "other kinds": "var(--c7)", unresolved: "var(--faint)" };
function treeColors() {
  const gr = FN.gre, L = gr.leaves.filter((l) => !l.ref);
  if (st.col === "clade") {
    const total = (g) => (g === "other kinds" ? sum(Object.entries(gr.clades).filter(([k]) => !(k in GROUP_C)).map(([, n]) => n)) : gr.clades[g]);
    return { of: (l) => GROUP_C[l.group], legend: Object.keys(GROUP_C).map((g) => [`${g}: ${gr.shown[g] || 0} of ${total(g)} shown`, GROUP_C[g]]) };
  }
  const key = st.col === "product" ? (l) => gr.products[l.p] : (l) => l.phylum;
  const counts = {}; for (const l of L) counts[key(l)] = (counts[key(l)] || 0) + 1;
  const order = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const col = Object.fromEntries(order.map((k, i) => [k, i < 6 ? `var(--c${i + 1})` : "var(--faint)"]));
  return { of: (l) => col[key(l)], legend: order.map((k, i) => [`${i < 6 ? k : k + " (grey)"}: ${counts[k]}`, col[k]]) };
}
function drawTree() {
  const cb = FN.gre, T = cb.tree, n = T.length, kids = T.map(() => []);
  T.forEach((r, i) => { if (r[0] >= 0) kids[r[0]].push(i); });
  const depth = new Array(n).fill(0), yy = new Array(n).fill(0);
  let leafNo = 0;
  for (let i = 0; i < n; i++) if (T[i][0] >= 0) depth[i] = depth[T[i][0]] + T[i][1];
  (function place(i) { if (!kids[i].length) { yy[i] = leafNo++; return; } kids[i].forEach(place); yy[i] = (yy[kids[i][0]] + yy[kids[i][kids[i].length - 1]]) / 2; })(0);
  const host = $("fnTreeSvg"), W = Math.max(360, host.clientWidth || 360), lab = Math.min(250, W * 0.45), step = 4.2, H = leafNo * step + 24, maxD = Math.max(...depth);
  const X = (d) => 8 + (d / maxD) * (W - lab - 16), Y = (k) => 12 + k * step;
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Tree of glycyl radical enzyme genes and reference enzymes" });
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = T[i][0];
    if (p >= 0) d += `M${X(depth[p])} ${Y(yy[i])}H${X(depth[i])}`;
    if (kids[i].length > 1) d += `M${X(depth[i])} ${Y(yy[kids[i][0]])}V${Y(yy[kids[i][kids[i].length - 1]])}`;
  }
  el("path", { d, fill: "none", stroke: "var(--muted)", "stroke-width": 0.8 }, svg);
  for (let i = 0; i < n; i++) if (kids[i].length && T[i][2] >= 95 && T[i][0] >= 0) el("circle", { cx: X(depth[i]), cy: Y(yy[i]), r: 1.4, fill: "var(--ink)" }, svg);
  const cc = treeColors(), q = st.tq.toLowerCase(), prod = st.prod;
  const refs = [];
  let marked = 0;
  for (let i = 0; i < n; i++) {
    const li = T[i][3];
    if (li < 0) continue;
    const l = cb.leaves[li], x = X(depth[i]), y = Y(yy[i]);
    if (l.ref) {
      el("path", { d: `M${x} ${y - 4} l4 4 l-4 4 l-4 -4 z`, fill: "var(--ink)", stroke: "var(--ink)", "stroke-width": 1.2 }, svg);
      refs.push([x, y, `${l.kind}: ${l.label}`]);
      continue;
    }
    const hit = (q && [l.id, l.bin, l.family, l.name, l.phylum].some((s) => String(s).toLowerCase().includes(q))) || (prod && cb.products[l.p] === prod);
    if (hit) marked++;
    const c = el("circle", { cx: x + 2, cy: y, r: hit ? 3.4 : 2, fill: cc.of(l), stroke: hit ? "var(--ink)" : "none", "stroke-width": 1.2 }, svg);
    c.addEventListener("mousemove", (ev) => showTip(ev, `<span class="mono">${l.id}</span> · MAG <span class="mono">${l.bin}</span> <i>${esc(l.name)}</i><br>${esc(l.phylum)}, ${esc(l.family)}<br>Bakta: ${esc(cb.products[l.p])}<br>Tree: ${esc(l.clade)} · KOfam: ${l.ko || "no KO"}<br>Nearest reference ${esc(cb.refs.find((r) => r[0] === l.near)?.[1] || l.near)} (${l.nid}% identity)`));
    c.addEventListener("mouseleave", hideTip);
  }
  // reference labels in a column at the right, spread so they do not overlap, with a leader line to the leaf
  let last = -1e9;
  for (const [x, y, t] of refs.sort((a, b) => a[1] - b[1])) {
    const ly = Math.max(y, last + 12);
    last = ly;
    el("path", { d: `M${x + 5} ${y}H${W - lab - 6}L${W - lab + 2} ${ly}`, fill: "none", stroke: "var(--faint)", "stroke-dasharray": "2 2" }, svg);
    el("text", { x: W - lab + 6, y: ly + 3.5, class: "mlbl", style: "font-size:10.5px" }, svg).textContent = t;
  }
  host.innerHTML = ""; host.appendChild(svg);
  $("fnTreeLegend").innerHTML = legendHtml(cc.legend) + `<span><i class="sw" style="background:var(--ink);transform:rotate(45deg)"></i>Reference enzyme</span>`;
  $("fnTreeInfo").textContent = q || prod ? `${marked} gene${marked === 1 ? "" : "s"} marked` : `${leafNo - cb.refs.length} of the ${num(cb.full)} MAG genes in the tree, and ${cb.refs.length} references`;
  const tab = cb.table;
  $("fnTreeTable").innerHTML = `<table class="ct"><thead><tr><th>Bakta's name</th>${tab.clades.map((c) => `<th class="r" title="${esc(c)}">${esc(SHORT_GROUP[c] || c)}</th>`).join("")}</tr></thead><tbody>${tab.rows.map(([p, ...v]) => `<tr class="click${p === prod ? " hl" : ""}" data-prod="${esc(p)}"><td>${esc(p)}</td>${v.map((x) => `<td class="r">${x}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  $("fnRefs").innerHTML = `<table class="ct gt"><thead><tr><th>Enzyme</th><th>Activity</th><th>UniProt</th><th>Measured in</th></tr></thead><tbody>${cb.refs.map(([a, l, k, src]) => { const m = /^(?:Swiss-Prot; )?(.*?) \((10\.[^)]+)\)$/.exec(src); return `<tr><td>${esc(l)}</td><td>${esc(k)}</td><td class="mono">${a}</td><td>${m ? `<a href="https://doi.org/${esc(m[2])}">${esc(m[1])}</a>` : esc(src)}</td></tr>`; }).join("")}</tbody></table>`;
}
function drawFn() { drawTools(); drawLeave(); drawIncomplete(); drawTree(); }

// --- state
function params() {
  const p = { mag: B[st.mag].id, map: st.map };
  if (st.ctg) p.ctg = M().contigs[st.ctg][0];
  if (st.pos) p.pos = st.pos;
  if ($("anWin").value !== DEFAULTS.win) p.win = $("anWin").value;
  if (st.q) p.q = st.q;
  if (st.amr) p.amr = st.amr;
  if (st.lv) p.lv = st.lv;
  if (st.inc !== "c.38") p.inc = st.inc;
  if (st.meth !== "blocks") p.meth = st.meth;
  if (st.col !== "clade") p.col = st.col;
  if (st.tq) p.tq = st.tq;
  if (st.prod) p.prod = st.prod;
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
  st.lv = FN.leave.mags.includes(s.lv) ? s.lv : "";
  st.inc = FN.incomplete.mags.some((m) => m.id === s.inc) ? s.inc : "c.38";
  st.meth = s.meth === "pieces" ? "pieces" : "blocks";
  st.col = ["clade", "product", "phylum"].includes(s.col) ? s.col : "clade";
  st.tq = s.tq || "";
  st.prod = FN.gre.table.rows.some((r) => r[0] === s.prod) ? s.prod : "";
  fnControls();
  if (st.q && s.pos === undefined) { const g = M().genes.find((g) => g[0] === st.ctg && matches(g, st.q)) || M().genes.find((g) => matches(g, st.q)); if (g) { st.ctg = g[0]; st.pos = Math.round((g[1] + g[2]) / 2 - winBp() / 2); } }
  clampPos();
}
function drawMagViews() { drawCard(); drawHyp(); }
function drawAll(push = true) { drawMagViews(); drawMapAll(); drawAmr(); drawFn(); if (push) write(); }
function fnControls() { $("fnLvMag").value = st.lv; $("fnIncMag").value = st.inc; $("fnIncMeth").value = st.meth; $("fnTreeCol").value = st.col; $("fnTreeQ").value = st.tq; }
function openMag(id) { if (!magIdx.has(id)) return; st.mag = magIdx.get(id); drawMagViews(); write(); }

function setup() {
  fillNumbers(); drawEvidence();
  $("anMags").innerHTML = B.map((b) => `<option value="${b.id} ${esc(b.name)}">`).join("");
  $("anMapLegend").innerHTML = EV_ORDER.map((k) => `<span><i class="sw" style="background:${EV[k].c}"></i>${esc(EV[k].t)}</span>`).join("");
  $("anFind").addEventListener("change", (e) => openMag(e.target.value.split(" ")[0]));
  for (const id of ["anHyp", "anAmrMags"]) $(id).addEventListener("click", (e) => { const t = e.target.closest("[data-mag]"); if (t) { hideTip(); openMag(t.dataset.mag); $("anCard").scrollIntoView({ behavior: "smooth", block: "nearest" }); } });
  $("anAmr").addEventListener("click", (e) => { const t = e.target.closest("[data-amr]"); if (t) { st.amr = st.amr === t.dataset.amr ? "" : t.dataset.amr; drawAmr(); write(); } });
  $("anMapMag").addEventListener("input", (e) => { setMap(e.target.value); drawMapAll(); write(); });
  $("anCtg").addEventListener("input", (e) => { st.ctg = +e.target.value; st.pos = 0; drawMapAll(); write(); });
  $("anWin").addEventListener("input", () => { clampPos(); drawOverview(); drawWindow(); write(); });
  $("anPrev").addEventListener("click", () => { st.pos -= winBp() * 0.8; clampPos(); drawOverview(); drawWindow(); write(); });
  $("anNext").addEventListener("click", () => { st.pos += winBp() * 0.8; clampPos(); drawOverview(); drawWindow(); write(); });
  let qTimer;
  $("anQ").addEventListener("input", (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { st.q = e.target.value.trim(); drawOverview(); drawWindow(); drawHits(); write(); }, 200); });
  $("anHits").addEventListener("click", (e) => { const r = e.target.closest("[data-c]"); if (r) { st.ctg = +r.dataset.c; st.pos = Math.round(+r.dataset.p - winBp() / 2); $("anCtg").value = st.ctg; clampPos(); drawOverview(); drawWindow(); write(); } });
  const tname = (id) => `${id} ${TMAG(id).name}`;
  $("fnLvMag").innerHTML = `<option value="">all four</option>` + FN.leave.mags.map((m) => `<option value="${m}">${esc(tname(m))}</option>`).join("");
  $("fnIncMag").innerHTML = FN.incomplete.mags.map((m) => `<option value="${m.id}">${esc(`${m.id} ${m.name}`)}</option>`).join("");
  $("fnLvMag").addEventListener("input", (e) => { st.lv = e.target.value; drawLeave(); write(); });
  $("fnIncMag").addEventListener("input", (e) => { st.inc = e.target.value; drawIncomplete(); write(); });
  $("fnIncMeth").addEventListener("input", (e) => { st.meth = e.target.value; drawIncomplete(); write(); });
  $("fnTreeCol").addEventListener("input", (e) => { st.col = e.target.value; drawTree(); write(); });
  let tqTimer;
  $("fnTreeQ").addEventListener("input", (e) => { clearTimeout(tqTimer); tqTimer = setTimeout(() => { st.tq = e.target.value.trim(); drawTree(); write(); }, 200); });
  $("fnTreeTable").addEventListener("click", (e) => { const r = e.target.closest("[data-prod]"); if (r) { st.prod = st.prod === r.dataset.prod ? "" : r.dataset.prod; drawTree(); write(); } });
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
