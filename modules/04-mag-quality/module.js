// Module 4: MAG quality. DATA = {rule, bins} from the example analysis (np26 scripts/21_course_mag_quality.py).
// Per MAG: CheckM2 (c2: completeness, contamination), CheckM (c1: completeness, contamination, strain heterogeneity),
// rRNA genes per type [Bakta, barrnap], unique tRNAs [Bakta, tRNAscan-SE], GUNC [css, rrs, pass], Longshot variant
// sites [n, % of positions], and the MAG explorer's view: contigs (verdict v, 100 kb windows, edges), fingerprint.
const B = DATA.bins;
const V = [
  { label: "Consistent", color: "var(--v0)" },
  { label: "Lacks a motif of the rest", color: "var(--v1)" },
  { label: "Extra motif", color: "var(--v2)" },
  { label: "One conflicting motif", color: "var(--v3)" },
  { label: "Too little data", color: "var(--v4)" },
];
const FLAG = new Set([1, 2]);
const RR = ["5s", "16s", "23s"], RRNAME = { "5s": "5S", "16s": "16S", "23s": "23S" };
const motifName = (m) => { const p = m.split("_"); const mod = { a: "6mA", m: "5mC", "21839": "4mC" }[p[2]] || p[2]; return `${p[0]} ${mod}@${p[1]}`; };
const motifList = (s) => s ? s.split(",").map(motifName).join(", ") : "";
const fmtKb = (bp) => `${(bp / 1e3).toFixed(1)} kb`;
const pct = (v, d = 1) => `${Number(v).toFixed(d)}%`;
const plural = (n, w) => `${n.toLocaleString("en")} ${w}${n === 1 ? "" : "s"}`;
const VIR = (t) => viridis(0.12 + 0.88 * Math.max(0, Math.min(1, t)));  // darkest step left out: it disappears on the dark surface

// derived numbers per MAG
for (const b of B) {
  b.flagBp = 0; b.nFlag = 0; b.winFlag = 0; b.nWin = 0; b.weak = 0; b.splits = 0; b.circN = 0; b.methInfo = false;
  for (const c of b.contigs) {
    if (FLAG.has(c.v)) { b.nFlag++; b.flagBp += c.len; }
    if (c.v !== 4) b.methInfo = true;
    if (c.circ) b.circN++;
    for (const w of c.win || []) { b.nWin++; if (FLAG.has(w[2])) b.winFlag++; }
    for (const e of c.edges || []) { if (e[3]) b.weak++; if (e[4] === 1) b.splits++; }
  }
  if (b.nWin) b.methInfo = true;
  b.rrMissing = RR.filter((k) => b.rrna[k][0] < 1 && b.rrna[k][1] < 1);
  b.diff = b.c1[0] - b.c2[0];
  b.meth = b.nFlag ? "contig" : b.winFlag ? "window" : b.methInfo ? "none" : "nodata";
}
const median = (a) => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const VAR_MED = median(B.map((b) => b.var[1]));
const VAR_P90 = B.map((b) => b.var[1]).sort((x, y) => x - y)[Math.floor(0.9 * (B.length - 1))];
const rankOf = (b, f) => 1 + B.filter((x) => f(x) > f(b)).length;

// --- colour modes: {label, col(b), legend, val(b) text for tooltips}
const cat = (k) => `var(--c${k})`;
const COLORS = {
  q: { col: (b) => b.q === "HQ" ? cat(1) : cat(2), legend: () => sw(cat(1), "High quality") + sw(cat(2), "Medium quality") },
  circ: { col: (b) => b.cbin ? cat(1) : b.circN ? cat(3) : "var(--faint)", legend: () => sw(cat(1), "MAG is one circular contig") + sw(cat(3), "has a circular contig among others") + sw("var(--faint)", "no circular contig") },
  rrna: { col: (b) => !b.rrMissing.length ? cat(1) : b.rrMissing.length < 3 ? cat(4) : cat(2), legend: () => sw(cat(1), "5S, 16S and 23S rRNA genes") + sw(cat(4), "one or two of them missing") + sw(cat(2), "none") },
  trna: { col: (b) => b.trna[0] >= 18 && b.trna[1] >= 18 ? cat(1) : b.trna[0] >= 18 || b.trna[1] >= 18 ? cat(4) : cat(2), legend: () => sw(cat(1), "18 or more unique tRNAs by both tools") + sw(cat(4), "by one of the two") + sw(cat(2), "fewer than 18 by both") },
  meth: { col: (b) => ({ contig: cat(2), window: cat(4), none: cat(1), nodata: "var(--faint)" }[b.meth]), legend: () => sw(cat(2), "a contig flagged against the rest of the MAG") + sw(cat(4), "only 100 kb windows flagged") + sw(cat(1), "nothing flagged") + sw("var(--faint)", "too little methylation data") },
  var: { col: (b) => VIR((Math.log10(Math.max(b.var[1], 0.001)) + 3) / 3), legend: () => ramp("Variant sites, % of positions (log scale)", "0.001% or less", "1%") },
  diff: { col: (b) => VIR(Math.abs(b.diff) / 25), legend: () => ramp("CheckM and CheckM2 completeness differ by", "0", "25 points or more") },
  gunc: { col: (b) => VIR(b.gunc[0] / 0.45), legend: () => ramp("GUNC clade separation score", "0", "0.45 (pass limit)") },
  cov: { col: (b) => VIR(Math.log10(Math.max(b.cov, 1)) / 3.5), legend: () => ramp("Depth over all reads (log scale)", "1x", "3,000x") },
};
const sw = (c, t) => `<span><i class="sw" style="background:${c}"></i>${esc(t)}</span>`;
const ramp = (t, lo, hi) => `<span>${esc(t)}</span><span class="ramp" style="background:linear-gradient(90deg,${VIRIDIS.slice(1).join(",")})"></span><span>${esc(lo)} → ${esc(hi)}</span>`;
const SORTS = {
  cont: { f: (b) => b.c2[1], txt: (b) => pct(b.c2[1], 2) + " cont." },
  comp: { f: (b) => -b.c2[0], txt: (b) => pct(b.c2[0]) + " compl." },
  diff: { f: (b) => Math.abs(b.diff), txt: (b) => `${b.diff > 0 ? "+" : ""}${b.diff.toFixed(1)} points` },
  var: { f: (b) => b.var[1], txt: (b) => pct(b.var[1], 3) + " variant" },
  flag: { f: (b) => b.flagBp + b.winFlag * 1e5, txt: (b) => b.flagBp ? fmtBp(b.flagBp) + " flagged" : b.winFlag ? plural(b.winFlag, "window") : "none" },
  cov: { f: (b) => b.cov, txt: (b) => b.cov.toLocaleString("en") + "x" },
};
const st = { sel: -1, ex: -1 };
const DEFAULTS = { color: "q", est: "c2", show: "all", sort: "cont" };

// --- state <-> link
function stateParams() {
  const p = {};
  for (const [k, id] of [["color", "mqColor"], ["est", "mqEst"], ["show", "mqShow"], ["sort", "mqSort"]]) if ($(id).value !== DEFAULTS[k]) p[k] = $(id).value;
  if (st.sel >= 0) p.mag = B[st.sel].id;
  if (examples.current >= 0) p.ex = examples.current + 1;
  return p;
}
function applyState(s) {
  const setSel = (id, v) => { const e = $(id); e.value = [...e.options].some((o) => o.value === String(v)) ? String(v) : e.options[0].value; };
  setSel("mqColor", s.color ?? DEFAULTS.color); setSel("mqEst", s.est ?? DEFAULTS.est); setSel("mqShow", s.show ?? DEFAULTS.show); setSel("mqSort", s.sort ?? DEFAULTS.sort);
  st.sel = s.mag ? B.findIndex((b) => b.id === s.mag) : -1;
  $("mqFind").value = "";
}

// --- overview plot
let plot = null;
function shown() { const s = $("mqShow").value; return B.filter((b) => s === "all" || b.q === s); }
function drawPlot() {
  const host = $("mqPlot"), est = $("mqEst").value, mode = COLORS[$("mqColor").value];
  const W = Math.max(280, host.clientWidth), H = Math.round(Math.min(480, Math.max(280, W * 0.62)));
  const mg = { l: 46, r: 14, t: 14, b: 40 }, x0 = 45, x1 = 101, y0 = -0.3, y1 = 10.5;
  const X = (v) => mg.l + ((v - x0) / (x1 - x0)) * (W - mg.l - mg.r), Y = (v) => H - mg.b - ((v - y0) / (y1 - y0)) * (H - mg.t - mg.b);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Completeness against contamination for each MAG" });
  el("rect", { class: "band", x: X(90), y: Y(5), width: X(x1) - X(90), height: Y(y0) - Y(5) }, svg);
  for (const t of [50, 60, 70, 80, 90, 100]) { el("line", { class: "grid", x1: X(t), x2: X(t), y1: mg.t, y2: H - mg.b }, svg); el("text", { x: X(t), y: H - mg.b + 15, "text-anchor": "middle", class: "lbl" }, svg).textContent = t + "%"; }
  for (const t of [0, 2, 4, 6, 8, 10]) { el("line", { class: "grid", x1: mg.l, x2: W - mg.r, y1: Y(t), y2: Y(t) }, svg); el("text", { x: mg.l - 6, y: Y(t) + 4, "text-anchor": "end", class: "lbl" }, svg).textContent = t + "%"; }
  const thr = (a) => el("line", { ...a, stroke: "var(--ink)", "stroke-width": 1.2, "stroke-dasharray": "5 3" }, svg);
  thr({ x1: X(90), x2: X(90), y1: Y(5), y2: Y(y0) }); thr({ x1: X(90), x2: X(x1), y1: Y(5), y2: Y(5) });
  thr({ x1: X(50), x2: X(50), y1: Y(10), y2: Y(y0) }); thr({ x1: X(50), x2: X(x1), y1: Y(10), y2: Y(10) });
  el("text", { x: X(x1) - 4, y: Y(5) - 5, "text-anchor": "end", class: "lbl", style: "fill:var(--ink)" }, svg).textContent = "High quality: ≥ 90% and ≤ 5%";
  el("text", { x: X(50) + 4, y: Y(10) - 5, class: "lbl", style: "fill:var(--ink)" }, svg).textContent = "Medium quality: ≥ 50% and ≤ 10%";
  const name = est === "c2" ? "CheckM2" : "CheckM";
  el("text", { x: (mg.l + W - mg.r) / 2, y: H - 6, "text-anchor": "middle", class: "lbl" }, svg).textContent = `Completeness (${name})`;
  const yl = el("text", { x: 12, y: (mg.t + H - mg.b) / 2, "text-anchor": "middle", class: "lbl", transform: `rotate(-90 12 ${(mg.t + H - mg.b) / 2})` }, svg); yl.textContent = H < 380 ? "Contamination" : `Contamination (${name})`;
  const r = W < 520 ? 3.5 : 4.5, pts = [];
  const list = shown().slice().sort((a, b) => (B.indexOf(a) === st.sel) - (B.indexOf(b) === st.sel));
  for (const b of list) {
    const v = b[est], cx = X(Math.max(x0, v[0])), cy = Y(v[1]);
    const c = el("circle", { class: "pt", cx, cy, r, fill: mode.col(b), "fill-opacity": 0.85, stroke: "var(--surface)", "stroke-width": 0.8 }, svg);
    c.dataset.i = B.indexOf(b);
    pts.push(c);
  }
  if (st.sel >= 0 && list.includes(B[st.sel])) {
    const v = B[st.sel][est];
    el("circle", { cx: X(Math.max(x0, v[0])), cy: Y(v[1]), r: r + 4, fill: "none", stroke: "var(--ink)", "stroke-width": 2, "pointer-events": "none" }, svg);
  }
  svg.addEventListener("pointermove", (ev) => {
    const t = ev.target.closest("circle.pt");
    if (!t) { hideTip(); return; }
    const b = B[+t.dataset.i];
    showTip(ev, `<i>${esc(b.name)}</i> <span class="mono">${b.id}</span><br>${b.q} · CheckM2 ${pct(b.c2[0])} complete, ${pct(b.c2[1], 2)} contamination<br>CheckM ${pct(b.c1[0])}, ${pct(b.c1[1], 2)}<br>${plural(b.n, "contig")}, ${fmtBp(b.size)}, ${b.cov}x · single-base variant sites ${pct(b.var[1], 3)}`);
  });
  svg.addEventListener("pointerleave", hideTip);
  svg.addEventListener("click", (ev) => { const t = ev.target.closest("circle.pt"); if (t) select(+t.dataset.i); });
  host.innerHTML = ""; host.appendChild(svg);
  plot = { pts };
  $("mqLegend").innerHTML = mode.legend() + `<span>· shaded: the high-quality corner · ring: the open MAG</span>`;
  const n = list.length, outside = est === "c1" ? list.filter((b) => b.c1[0] >= 90 && b.c1[1] <= 5).length : null;
  $("mqPlotNote").textContent = est === "c2"
    ? `${n} MAGs shown. mmlong2 uses these CheckM2 estimates for the classes; the high-quality corner also needs rRNA and tRNA genes. Many complete genomes sit on top of each other at 100% and near 0%. Click a dot to open its MAG below.`
    : `${n} MAGs shown, placed by CheckM (version 1); ${outside} of them fall in the high-quality corner by CheckM. The colours and classes still come from CheckM2: compare where MAGs move when you switch the estimates.`;
}

// --- list
function drawList() {
  const s = SORTS[$("mqSort").value], list = shown().slice().sort((a, b) => s.f(b) - s.f(a));
  $("mqCount").textContent = `${list.length} MAGs`;
  $("mqRows").innerHTML = list.map((b) => { const i = B.indexOf(b); return `<button class="row" role="listitem" data-i="${i}" aria-current="${i === st.sel}"><span class="nm">${esc(b.name)}</span><span class="val">${esc(s.txt(b))}</span><span class="id">${b.id} · ${b.q}</span><span class="sub" style="text-align:right">${pct(b.c2[0])} / ${pct(b.c2[1], 2)}</span></button>`; }).join("");
}

// --- MAG card
function select(i, push = true) {
  st.sel = i;
  drawPlot(); drawList(); drawCard();
  if (push) writeHashParams(stateParams());
  if (i >= 0) { const r = $("mqRows").querySelector(`[data-i="${i}"]`); if (r) r.scrollIntoView({ block: "nearest" }); }
}
function mark(cls, text) { return `<span class="mark ${cls}">${esc(text)}</span>`; }
function verdict(b) {
  const why = [];
  if (b.c2[0] < 90) why.push(`CheckM2 completeness ${pct(b.c2[0])} is below 90%`);
  if (b.c2[1] > 5) why.push(`CheckM2 contamination ${pct(b.c2[1], 2)} is above 5%`);
  if (b.rrMissing.length) why.push(`no ${b.rrMissing.map((k) => RRNAME[k]).join(", ")} rRNA gene`);
  if (b.trna[0] < 18 && b.trna[1] === 0) why.push("too few tRNAs");
  if (b.q === "HQ") {
    const quirk = b.trna[0] < 18 && b.trna[1] < 18;
    return `<b>High quality</b>: it meets every part of the rule.${quirk ? ` But only because the rule as written accepts any tRNAscan-SE count: both tools find fewer than 18 unique tRNAs (${b.trna[0]} and ${b.trna[1]}). Read as MIMAG intends, it would be medium quality.` : ""}`;
  }
  return `<b>Medium quality</b>, because ${why.join("; ")}.`;
}
function drawCard() {
  const host = $("mqCard");
  if (st.sel < 0) { host.innerHTML = `<section class="panel"><h2>MAG card</h2><p class="note">Click a dot or a MAG in the list to open its card: the evidence for and against it being one complete, clean genome.</p></section>`; return; }
  const b = B[st.sel], sh = b.c1[2], score = b.c1[0] - 5 * b.c1[1];
  const rr = RR.map((k) => `${RRNAME[k]} ${b.rrna[k][0]}/${b.rrna[k][1]}`).join(" · ");
  const varRank = rankOf(b, (x) => x.var[1]);
  const flagTxt = b.nFlag ? `${plural(b.nFlag, "contig")} flagged, ${fmtBp(b.flagBp)} of ${fmtBp(b.size)}` : b.methInfo && b.contigs.some((c) => c.v !== 4) ? "no contig flagged" : "no contig could be tested";
  const methWhy = b.n === 1 ? "A MAG of one contig has no rest to compare with; the windows below still test it." : `Each contig with enough motif sites (5x depth or more) against the site-weighted rest of the MAG. ${b.contigs.filter((c) => c.v !== 4).length} of ${b.n} contigs had enough data.`;
  const rows = [
    ["CheckM2 completeness", pct(b.c2[0]), "High quality needs ≥ 90%, medium quality ≥ 50%.", b.c2[0] >= 90 ? mark("ok", "high-quality level") : mark("mid", "medium-quality level")],
    ["CheckM2 contamination", pct(b.c2[1], 2), "High quality needs ≤ 5%, medium quality ≤ 10%. An estimate from duplicated functions, not a share of the sequence.", b.c2[1] <= 5 ? mark("ok", "high-quality level") : mark("mid", "medium-quality level")],
    ["rRNA genes", rr, "Copies found by Bakta / barrnap. High quality needs at least one 5S, 16S and 23S gene, by either tool.", b.rrMissing.length ? mark("no", "missing " + b.rrMissing.map((k) => RRNAME[k]).join(", ")) : mark("ok", "all three")],
    ["tRNAs", `${b.trna[0]} Bakta · ${b.trna[1]} tRNAscan-SE`, "Unique tRNAs. MIMAG asks for at least 18 of the 20 amino acids; mmlong2's code accepts Bakta ≥ 18 or any tRNAscan-SE count.", b.trna[0] >= 18 || b.trna[1] >= 18 ? mark("ok", "18 or more") : mark("mid", "below 18")],
    ["CheckM (version 1)", `${pct(b.c1[0])} · ${pct(b.c1[1], 2)} · ${sh}%`, `Completeness · contamination · strain heterogeneity (share of pairs of duplicated markers ≥ 90% identical in amino acids: high points to a close strain). Completeness differs from CheckM2 by ${b.diff > 0 ? "+" : ""}${b.diff.toFixed(1)} points. Kept by mmlong2 because completeness − 5 × contamination = ${score.toFixed(1)} (needs more than 30).`, Math.abs(b.diff) > 10 ? mark("mid", "disagrees") : mark("ok", "agrees")],
    ["GUNC", `CSS ${b.gunc[0]} · RRS ${b.gunc[1]}`, "Clade separation score (passes at ≤ 0.45; set to 0 when too few genes match the reference, so 0 can also mean too little to judge) and how well the reference database covers this genome (reference representation score, 0 to 1). Blind to strains of one species.", b.gunc[2] ? mark("ok", "pass") : mark("no", "fail")],
    ["Contigs", `${b.n} · N50 ${fmtBp(b.n50)} · longest ${fmtBp(b.longest)}`, `Number of contigs, contig N50 (half of the ${fmtBp(b.size)} is in contigs at least this long), longest contig. Fewer, longer contigs leave less room for wrong ones, but one contig can still hold a misjoin.`, b.n === 1 ? mark("ok", "one contig") : mark("", b.n + " contigs")],
    ["Circular", b.cbin ? "the whole MAG is one circular contig" : b.circN ? `${b.circN} of ${b.n} contigs circular` : "no circular contig", "The assembler closed the contig on itself. A circular contig of chromosome size is likely a whole chromosome, if the closing join is right; a small one may be a plasmid.", b.cbin ? mark("ok", "circular") : mark("", b.circN ? "partly" : "no")],
    ["Microdiversity", `${pct(b.var[1], 3)} (${b.var[0].toLocaleString("en")} sites)`, `Single-base variant sites (Longshot), as % of the MAG's length. Median of the 421 MAGs: ${pct(VAR_MED, 3)}; this MAG ranks ${varRank} of 421. A site needs at least 6 reads, and the other base in at least 3 of them and 10%: at ${b.cov}x depth, low depth lowers the power to call variants.`, b.var[1] >= VAR_P90 ? mark("mid", "top 10%") : mark("ok", "typical")],
    ["Methylation: contigs", flagTxt, methWhy, b.nFlag ? mark("mid", "flagged") : mark("ok", b.n === 1 ? "n/a" : "none")],
    ["Methylation: windows", b.nWin ? `${b.winFlag} of ${b.nWin} windows flagged` : "no contig of 200 kb or more with data", `100 kb windows of contigs ≥ 200 kb against the rest of their contig.${b.winFlag ? ` Edges of flagged windows: ${b.weak ? plural(b.weak, "edge") + " with weak read support" : "all crossed by reads like normal positions"}${b.splits ? `; ${plural(b.splits, "proposed split")}` : ""}.` : ""}`, b.splits ? mark("no", "split proposed") : b.winFlag ? mark("mid", "flagged") : mark("ok", "none")],
  ];
  host.innerHTML = `
    <section class="panel head">
      <h3><i>${esc(b.name)}</i> <span class="mono muted" style="font-size:14px">MAG ${b.id}</span></h3>
      <div class="facts">
        <span class="chip ${b.q === "HQ" ? "hq" : ""}">${b.q === "HQ" ? "High quality" : "Medium quality"}</span>
        <span><b>${fmtBp(b.size)}</b> in <b>${b.n}</b> contig${b.n === 1 ? "" : "s"}</span><span>GC <b>${b.gc}%</b></span><span>depth <b>${b.cov}x</b></span>
        <span>Nanomotif motifs: ${b.nm.length ? b.nm.map((m) => `<code class="mono">${esc(m)}</code>`).join(" ") : "none found"}</span>
      </div>
      <div class="tax">${esc(b.tax)}</div>
      <p class="verdict">${verdict(b)}</p>${magLinks(b.id, "mag-quality")}
      <div><button class="link" id="mqClose" type="button">Close card</button></div>
    </section>
    <section class="panel"><h2>Evidence checklist</h2><div class="scroll"><table class="chk"><thead><tr><th>Evidence</th><th>This MAG</th><th>What it says</th><th></th></tr></thead><tbody>
      ${rows.map(([k, v, why, m]) => `<tr><th>${esc(k)}</th><td class="v">${esc(v)}</td><td class="why">${esc(why)}</td><td>${m}</td></tr>`).join("")}
    </tbody></table></div></section>
    <section class="panel"><h2>Contigs and windows, to scale</h2>
      <div class="legend">${V.map((v) => sw(v.color, v.label)).join("")}</div>
      <p class="note">Thin bar: the contig against the rest of the MAG. Thick bar: its 100 kb windows against the rest of the contig (contigs of 200 kb or more), otherwise the contig's own verdict, paler. Triangles mark the edges of flagged windows: hollow = reads cross it like any other position, filled = few or none do. Under an edge, a short line spans where the methylation changes (dot: best estimate). A dark vertical line marks a proposed split: many reads clipped there, or no read crossing it. Without one the stretch only differs in methylation (an island, a phage or a strain region are as likely as a misjoin). ○ circular contig. Hover for details.</p>
      <div class="scroll" id="track"></div></section>
    <div class="cardgrid">
      <section class="panel"><h2>Methylation fingerprint</h2>
        <div class="legend"><span>Share of motif sites methylated</span><span class="ramp" style="background:linear-gradient(90deg,${VIRIDIS.join(",")})"></span><span>0 → 1</span><span><i class="sw" style="box-shadow:0 0 0 2px var(--v1)"></i>lacks the rest's motif</span><span><i class="sw" style="box-shadow:0 0 0 2px var(--v2)"></i>extra motif</span><span><i class="sw" style="background:repeating-linear-gradient(135deg,var(--v4) 0 2px,transparent 2px 5px)"></i>fewer than 10 sites</span></div>
        <p class="note">One row per contig, one column per motif methylated in at least one contig of this MAG (motifs Nanomotif found in any MAG). Contigs of one genome should show the same pattern.</p>
        <div class="scroll" id="fp"></div></section>
      <section class="panel"><h2>Contigs</h2><div class="scroll" id="ctable"></div></section>
    </div>`;
  $("mqClose").addEventListener("click", () => select(-1));
  drawTrack(b); drawFingerprint(b); drawContigTable(b);
}

function hoverContig(id) { for (const e of $("mqCard").querySelectorAll("[data-contig]")) e.classList.toggle("hl", e.dataset.contig === id); }

function drawTrack(b) {
  const host = $("track");
  const W = Math.max(520, host.clientWidth), lab = 150, right = 14, rowH = 36;
  const maxLen = Math.max(...b.contigs.map((c) => c.len)), H = b.contigs.length * rowH + 26;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": "Contigs of the MAG to scale with window verdicts", class: "trk" }, host);
  const X = (bp) => lab + (bp / maxLen) * (W - lab - right);
  const step = [1e4, 5e4, 1e5, 2.5e5, 5e5, 1e6, 2e6].find((s) => maxLen / s <= 8) || 1e6;
  for (let v = 0; v <= maxLen; v += step) { el("line", { x1: X(v), x2: X(v), y1: 14, y2: H, stroke: "var(--line)" }, svg); el("text", { x: X(v), y: 10, "text-anchor": "middle", class: "lbl" }, svg).textContent = fmtBp(v); }
  b.contigs.forEach((c, i) => {
    const y = 20 + i * rowH, g = el("g", { "data-contig": c.id }, svg);
    el("text", { x: 0, y: y + 14, class: "mlbl" }, g).textContent = c.id.replace(/ctg.*/, "") + (c.circ ? " ○" : "");
    el("text", { x: lab - 8, y: y + 14, "text-anchor": "end", class: "lbl" }, g).textContent = fmtBp(c.len);
    const w = Math.max(2, X(c.len) - lab);
    el("rect", { x: lab, y, width: w, height: 4, rx: 1, fill: V[c.v].color }, g);
    const tipContig = `<b class="mono">${c.id}</b> ${c.circ ? "(circular)" : ""}<br>${fmtBp(c.len)}, ${c.cov}x · against the rest of the MAG: ${V[c.v].label}${c.tested ? `, ${c.tested} motifs tested` : ""}${c.miss ? `<br>lacks: <span class="mono">${esc(motifList(c.miss))}</span>` : ""}${c.extra ? `<br>extra: <span class="mono">${esc(motifList(c.extra))}</span>` : ""}`;
    if (c.win) {
      for (const [s, e, v, miss, extra] of c.win) {
        const r = el("rect", { x: X(s) + 0.5, y: y + 7, width: Math.max(1, X(e) - X(s) - 1), height: 14, fill: V[v].color }, g);
        r.addEventListener("pointermove", (ev) => showTip(ev, `<b class="mono">${c.id}</b> ${Math.round(s / 1e3)}–${Math.round(e / 1e3)} kb<br>window against the rest of the contig: ${V[v].label}${miss ? `<br>lacks: <span class="mono">${esc(motifList(miss))}</span>` : ""}${extra ? `<br>extra: <span class="mono">${esc(motifList(extra))}</span>` : ""}`));
        r.addEventListener("pointerleave", hideTip);
      }
    } else {
      const r = el("rect", { x: lab, y: y + 7, width: w, height: 14, rx: 2, fill: V[c.v].color, "fill-opacity": 0.55 }, g);
      r.addEventListener("pointermove", (ev) => showTip(ev, tipContig)); r.addEventListener("pointerleave", hideTip);
    }
    for (const [pos, over, span, bad, bv, cp, lo, hi, cut, evid, clip, depth] of c.edges || []) {
      let bpTip = "";
      if (bv === 2) bpTip = "<br>too few motif sites to place the change";
      else if (bv !== undefined) {
        bpTip = `<br>methylation changes at ${fmtKb(cp)} (range ${fmtKb(lo)}–${fmtKb(hi)})`;
        if (clip) bpTip += `<br>clipping peak: ${clip} of ${depth} reads clipped`;
        bpTip += bv === 1 ? `<br><b>proposed split at ${fmtKb(cut)}</b> (${esc(evid)})` : "<br>methylation only: flag, don't cut";
        el("line", { x1: X(lo), x2: Math.max(X(hi), X(lo) + 1), y1: y + 29, y2: y + 29, stroke: "var(--ink)", "stroke-width": 2, "stroke-linecap": "round" }, g);
        el("circle", { cx: X(cp), cy: y + 29, r: 2.5, fill: "var(--ink)" }, g);
        if (bv === 1) el("line", { x1: X(cut), x2: X(cut), y1: y + 3, y2: y + 25, stroke: "var(--ink)", "stroke-width": 2 }, g);
      }
      const t = el("path", { d: `M${X(pos)} ${y + 22} l-4 6 h8 z`, fill: bad ? "var(--v1)" : "var(--surface)", stroke: bad ? "var(--v1)" : "var(--muted)", "stroke-width": 1 }, g);
      t.addEventListener("pointermove", (ev) => showTip(ev, `<b class="mono">${c.id}</b> edge at ${Math.round(pos / 1e3)} kb<br>${span} of ${over} reads cross it by ≥ 2 kb on both sides${bad ? "<br><b>weak read support</b>" : ""}${bpTip}`));
      t.addEventListener("pointerleave", hideTip);
    }
    const hit = el("rect", { x: 0, y, width: lab, height: rowH - 4, fill: "transparent" }, g);
    hit.addEventListener("pointermove", (ev) => showTip(ev, tipContig)); hit.addEventListener("pointerleave", hideTip);
    g.addEventListener("pointerenter", () => hoverContig(c.id)); g.addEventListener("pointerleave", () => hoverContig(null));
  });
}

function drawFingerprint(b) {
  const host = $("fp");
  if (!b.fpMotifs.length || !Object.keys(b.fp).length) { host.innerHTML = `<p class="note">No motif is methylated in any contig of this MAG with enough depth (5x or more).</p>`; return; }
  const head = b.fpMotifs.map((m) => `<th scope="col"><div>${esc(m)}</div></th>`).join("");
  const body = b.contigs.filter((c) => b.fp[c.id]).map((c) => {
    const cells = b.fp[c.id].map(([s, k, n], j) => {
      const cls = [s === null ? "na" : "", k ? "c" + k : ""].join(" ").trim();
      const t = `${b.fpMotifs[j]} · ${c.id}: ${s === null ? `${n} sites (too few)` : `${Math.round(s * 100)}% of ${n} sites methylated`}${k === 1 ? " · lacks the rest's motif" : k === 2 ? " · extra motif" : ""}`;
      return `<td class="${cls}" style="${s === null ? "" : `background:${viridis(s)}`}" title="${esc(t)}"></td>`;
    }).join("");
    return `<tr data-contig="${c.id}"><th scope="row"><i class="sw" style="background:${V[c.v].color}"></i>${c.id.replace(/ctg.*/, "")}</th>${cells}</tr>`;
  }).join("");
  host.innerHTML = `<table class="fp"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table>`;
  for (const tr of host.querySelectorAll("tbody tr")) { tr.addEventListener("pointerenter", () => hoverContig(tr.dataset.contig)); tr.addEventListener("pointerleave", () => hoverContig(null)); }
}

function drawContigTable(b) {
  const rows = b.contigs.map((c) => {
    const wf = c.win ? c.win.filter((w) => FLAG.has(w[2])).length : null;
    return `<tr data-contig="${c.id}"><td class="mono">${c.id}${c.circ ? " ○" : ""}</td><td class="r">${fmtBp(c.len)}</td><td class="r">${c.cov}</td><td><i class="sw" style="background:${V[c.v].color}"></i>${V[c.v].label}</td><td class="m">${esc(motifList(c.miss))}</td><td class="m">${esc(motifList(c.extra))}</td><td class="r">${c.win ? `${wf} of ${c.win.length}` : ""}</td></tr>`;
  }).join("");
  $("ctable").innerHTML = `<table class="ct"><thead><tr><th>Contig</th><th class="r">Length</th><th class="r">Depth (x)</th><th>Against the MAG</th><th>Lacks</th><th>Extra</th><th class="r">Flagged windows</th></tr></thead><tbody>${rows}</tbody></table><p class="note">Motifs: sequence, modification (6mA, 5mC, 4mC) and its 0-based position in the motif.</p>`;
  for (const tr of $("ctable").querySelectorAll("tbody tr")) { tr.addEventListener("pointerenter", () => hoverContig(tr.dataset.contig)); tr.addEventListener("pointerleave", () => hoverContig(null)); }
}

// --- page
function drawAll(push = true) { drawPlot(); drawList(); drawCard(); if (push) writeHashParams(stateParams()); }
function setup() {
  const hq = B.filter((b) => b.q === "HQ").length, circ = B.filter((b) => b.cbin).length, flagged = B.filter((b) => b.nFlag || b.winFlag).length;
  $("mqStats").innerHTML = [[B.length, "MAGs"], [hq, "high quality"], [B.length - hq, "medium quality"], [circ, "one circular contig"], [flagged, "with methylation flags"]].map(([n, t]) => `<div class="stat"><b>${n}</b><span>${t}</span></div>`).join("");
  $("mqStatsNote").textContent = "Methylation flags: at least one contig or 100 kb window lacks or adds two or more motifs compared with the rest of its MAG or contig; differences in a single motif are not counted here.";
  $("mqCss0").textContent = `${B.filter((b) => b.gunc[0] === 0).length} of the ${B.length} MAGs here score 0.`;
  $("mqVersion").textContent = DATA.rule.version;
  const q = DATA.rule.trna_as_coded_only;
  $("mqRuleNote").textContent = `Applied to the table, this rule gives the class mmlong2 reported for ${DATA.rule.reproduced} of ${B.length} MAGs. In mmlong2's code the tRNA condition reads "Bakta count ≥ 18, or the tRNAscan-SE count", and a count counts as true whenever it is not zero. ${q.length ? `${q.length === 1 ? "One MAG" : q.length + " MAGs"} (${q.join(", ")}) ${q.length === 1 ? "is" : "are"} high quality only because of this; read as MIMAG intends (18 or more), ${q.length === 1 ? "it" : "they"} would be medium quality.` : "No MAG's class depends on this here."}`;
  $("mqMags").innerHTML = B.map((b) => `<option value="${b.id} ${esc(b.name)}">`).join("");
  for (const id of ["mqColor", "mqEst", "mqShow", "mqSort"]) $(id).addEventListener("input", () => drawAll());
  $("mqFind").addEventListener("change", (e) => { const i = B.findIndex((b) => b.id === e.target.value.split(" ")[0]); if (i >= 0) { if ($("mqShow").value !== "all" && B[i].q !== $("mqShow").value) $("mqShow").value = "all"; select(i); } });
  $("mqRows").addEventListener("click", (e) => { const r = e.target.closest("[data-i]"); if (r) select(+r.dataset.i); });
  $("mqCopy").addEventListener("click", async () => {
    writeHashParams(stateParams());
    let ok = true; try { await navigator.clipboard.writeText(location.href); } catch (e) { ok = false; }
    $("mqCopied").textContent = ok ? "Copied." : "Copy the address from the browser bar.";
    setTimeout(() => { $("mqCopied").textContent = ""; }, 2500);
  });
}
const examples = setupExamples($("mqExamples"), (k) => { applyState(EXAMPLES[k].state); drawAll(); });
setup();
(function start() {
  const s = readHashParams(), ex = parseInt(s.ex, 10);
  if (ex >= 1 && ex <= EXAMPLES.length) { examples.current = ex - 1; examples.draw(); applyState({ ...EXAMPLES[ex - 1].state, ...s }); }
  else applyState(s);
  drawAll(false);
})();
let resizeTimer;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => drawAll(false), 150); });
