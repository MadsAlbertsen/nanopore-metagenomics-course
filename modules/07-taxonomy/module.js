// Module 7: taxonomy. DATA from the example analysis (np26 scripts/61_course_taxonomy.py):
// numbers and bins (GTDB-Tk per MAG: ranks, method, closest reference [species, ANI, AF], RED; from module 8's data),
// leaveout (test MAGs, per tool x MAG x level x query the count of calls per status, per-window tracks
// [status, name index], whole-contig calls, Sylph and skani ANI to the nearest kept genome, per-window alignment
// shares), contigs (Metabuli's contig names against GTDB-Tk's MAG names, by contig length).
const NUM = DATA.numbers, B = DATA.bins, LO = DATA.leaveout, CT = DATA.contigs;
const magIdx = new Map(B.map((b, i) => [b.id, i]));
const METHOD_SHORT = { topology_ani: "tree + ANI", topology: "tree alone", red: "tree + RED", ani_screen: "ANI screen" };
const METHOD = { topology_ani: "tree placement and ANI", topology: "tree placement alone", red: "tree placement and RED", ani_screen: "ANI screen" };
const KIND = { latin: "Latin species name", placeholder: "Placeholder species name", none: "Genus only" };
const TOOL = { kraken2: "Kraken2", metabuli: "Metabuli" };
const LEVEL = { none: "nothing removed", species: "species removed", genus: "genus removed", family: "family removed", order: "order removed" };
// call kinds in legend order, categorical colours in fixed order
const ST = {
  correct: { c: "var(--c1)", t: "Right, as deep as the database allows" },
  correct_higher: { c: "var(--c3)", t: "Right, but stops at a higher rank" },
  overcalled: { c: "var(--c4)", t: "Too deep: right as far as possible, then a name that cannot be right" },
  wrong: { c: "var(--c2)", t: "Wrong at a rank still in the database" },
  unclassified: { c: "var(--faint)", t: "Unclassified" },
};
const CTG = {
  agree_species: { c: "var(--c1)", t: "Agrees to species" },
  agree_higher: { c: "var(--c3)", t: "Agrees, but one of the two stops above species" },
  species: { c: "var(--c4)", t: "Differs at species" },
  genus: { c: "var(--c2)", t: "Differs at genus" },
  higher: { c: "var(--c5)", t: "Differs at family or above" },
  unclassified: { c: "var(--faint)", t: "Contig not classified" },
};
const pct = (a, b, d = 1) => !b ? "–" : `${((100 * a) / b).toFixed(d)}%`;
const num = (n) => Number(n).toLocaleString("en");
const DEFAULTS = { mag: "1.308", lo: "c.62", tool: "kraken2", q: "window" };
const st = { mag: 0, lo: DEFAULTS.lo, tool: DEFAULTS.tool, q: DEFAULTS.q };
const target = () => LO.targets.find((t) => t.id === st.lo);

// --- numbers in the text, all from the data
function fillNumbers() {
  const v = NUM.versions, k = NUM.kinds, novel = B.filter((b) => b.kind === "none"), arch = B.filter((b) => b.ranks[0] === "Archaea");
  const sizes = LO.targets.map((t) => t.genomes.none), gaps = LO.ani.filter((a) => a.skani.length && a.sylph !== null).map((a) => Math.abs(a.sylph - a.skani[0]));
  const ctgN = CT.table.reduce((s, r) => s + r.slice(1).reduce((a, b) => a + b, 0), 0), agree = CT.table.reduce((s, r) => s + r[1 + CT.classes.indexOf("agree_species")], 0);
  const N = {
    gtdbVersion: `v${v.gtdbtk}, GTDB release ${v.gtdb.replace(/^r/, "")}`,
    species: `${NUM.species} of ${NUM.mags} (${pct(NUM.species, NUM.mags)})`, spAni: `${NUM.sp_ani[1]}% (range ${NUM.sp_ani[0]}-${NUM.sp_ani[2]}%)`,
    spAf: `${NUM.sp_af[1]} (range ${NUM.sp_af[0]}-${NUM.sp_af[2]})`,
    latin: k.latin, placeholder: k.placeholder, genusOnly: k.none,
    byTree: novel.filter((b) => b.method === "topology").length, byRed: novel.filter((b) => b.method === "red").length,
    byAni: novel.filter((b) => b.method === "topology_ani").length,
    archaea: arch.length === 1 ? `One MAG (${arch[0].name}, ${arch[0].id})` : `${arch.length} MAGs`,
    refRange: `${Math.min(...sizes)}-${Math.max(...sizes)} genomes with nothing removed`,
    aniGap: `${Math.max(...gaps).toFixed(1)} ANI points`,
    ctgN: num(ctgN), ctgAgree: `${num(agree)} (${pct(agree, ctgN)})`,
  };
  for (const e of document.querySelectorAll("[data-n]")) e.textContent = N[e.dataset.n] ?? "?";
  $("txStats").innerHTML = [[NUM.mags, "MAGs"], [NUM.species, "named to species"], [LO.targets.length, "test MAGs, 5 leave-out levels"], [LO.tools.length, "read and contig classifiers, plus Sylph"], [ctgN, "binned contigs compared with their MAG"]]
    .map(([n, t]) => `<div class="stat"><b>${num(n)}</b><span>${t}</span></div>`).join("");
}

// --- GTDB-Tk: MAGs without a species name, ANI / AF chart, MAG card
function drawNovel() {
  const rows = B.filter((b) => b.kind === "none").sort((a, b) => (b.ref ? b.ref[1] : 0) - (a.ref ? a.ref[1] : 0));
  $("txNovel").innerHTML = `<table class="ct"><thead><tr><th>MAG</th><th>Named as</th><th>Named by</th><th>Closest reference</th><th class="r">ANI</th><th class="r">AF</th><th class="r">RED</th></tr></thead><tbody>${rows.map((b) => `<tr class="click" data-mag="${b.id}"><td class="mono">${b.id}</td><td><i>${esc(b.name)}</i></td><td>${METHOD_SHORT[b.method]}</td><td>${b.ref ? `<i>${esc(b.ref[0])}</i>` : ""}</td><td class="r">${b.ref ? b.ref[1].toFixed(2) + "%" : ""}</td><td class="r">${b.ref ? b.ref[2].toFixed(2) : ""}</td><td class="r">${b.red ?? ""}</td></tr>`).join("")}</tbody></table>`;
}
function drawAni() {
  const host = $("txAni"), pts = B.filter((b) => b.ref);
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
  $("txAniNote").textContent = `${pts.length} of ${B.length} MAGs; ${B.length - pts.length} have no reference close enough for GTDB-Tk to report an ANI. ${radii} MAGs with a species name have a species radius other than 95% (shown in the card).`;
}
function drawCard() {
  const b = B[st.mag];
  const ranks = ["domain", "phylum", "class", "order", "family", "genus", "species"].map((r, i) => b.ranks[i] ? `<span>${r}: <i>${esc(b.ranks[i])}</i></span>` : `<span class="muted">${r}: –</span>`).join(" · ");
  const ref = b.ref ? `<i>${esc(b.ref[0])}</i>: ANI ${b.ref[1]}%, AF ${b.ref[2]}${b.radius ? ` (species radius ${b.radius}%)` : ""}` : "none close enough to report an ANI";
  $("txCard").innerHTML = `<div class="head"><span class="kicker">MAG <span class="mono">${b.id}</span> · ${b.q === "HQ" ? "high quality" : "medium quality"}</span><h3><i>${esc(b.name)}</i></h3>
    <div class="facts"><span><b>${fmtBp(b.size)}</b> in ${b.n} contig${b.n === 1 ? "" : "s"}</span><span><b>${b.cov}x</b> depth</span><span>${KIND[b.kind]}</span></div>
    <p class="tax">${ranks}</p></div>
    <table class="chk"><tbody>
      <tr><th>Named by</th><td>${METHOD[b.method]}${b.note ? `<div class="muted">${esc(b.note)}</div>` : ""}${b.warn ? `<div class="muted">Warning: ${esc(b.warn)}</div>` : ""}</td></tr>
      <tr><th>Closest reference</th><td>${ref}${b.related ? `<div class="muted">GTDB-Tk's other related references: ${b.related[0]}, at ${b.related[1]}-${b.related[2]}% ANI</div>` : ""}</td></tr>
      ${b.place && !b.radius ? `<tr><th>Placement reference</th><td><i>${esc(b.place[0])}</i>: ANI ${b.place[1]}%, AF ${b.place[2]} (radius ${b.place[3]}%) <span class="muted">· the reference on the MAG's branch of the tree</span></td></tr>` : ""}
      ${b.red !== null ? `<tr><th>RED</th><td>${b.red} <span class="muted">(GTDB-Tk reports it when it was needed for the classification)</span></td></tr>` : ""}
      <tr><th>Marker alignment</th><td>${b.msa}% of the marker-gene alignment covered</td></tr>
    </tbody></table>
    ${LO.targets.some((t) => t.id === b.id) ? `<button class="link" id="txToLo" type="button">Show it in the leave-out experiment</button>` : ""}
    ${magLinks(b.id, "taxonomy")}`;
  const go = $("txToLo");
  if (go) go.addEventListener("click", () => { st.lo = b.id; drawLeaveout(); write(); $("txBars").scrollIntoView({ behavior: "smooth", block: "center" }); });
}

// --- leave-out: bars per level, genome track, whole contig, ANI
function counts(tool, t, lv, q) { const r = LO.shares.find((x) => x[0] === tool && x[1] === t && x[2] === lv && x[3] === q); return r ? r.slice(4) : null; }
function drawBars() {
  const t = target(), host = $("txBars"), W = Math.max(320, host.clientWidth || 320), lab = 210, rowH = 30, H = LO.levels.length * rowH + 30, r = 12;
  const X = (v) => lab + v * (W - lab - r);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Share of calls of each kind per leave-out level" });
  for (let f = 0; f <= 1.001; f += 0.25) { el("line", { class: "grid", x1: X(f), x2: X(f), y1: 2, y2: H - 24 }, svg); el("text", { x: X(f), y: H - 10, "text-anchor": "middle", class: "lbl" }, svg).textContent = `${Math.round(f * 100)}%`; }
  LO.levels.forEach((lv, i) => {
    const c = counts(st.tool, t.id, lv, st.q), y = 4 + i * rowH, tot = c.reduce((a, b) => a + b, 0);
    el("text", { x: lab - 8, y: y + 12, "text-anchor": "end", class: "mlbl" }, svg).textContent = LEVEL[lv];
    el("text", { x: lab - 8, y: y + 24, "text-anchor": "end", class: "lbl" }, svg).textContent = `${t.genomes[lv]} genomes · best: ${t.best[lv]}`;
    let x0 = 0;
    LO.status.forEach((s, j) => {
      if (!c[j]) return;
      const w = c[j] / tot, rect = el("rect", { x: X(x0) + 1, y, width: Math.max(0, X(x0 + w) - X(x0) - 2), height: rowH - 8, rx: 3, fill: ST[s].c }, svg);
      rect.addEventListener("mousemove", (ev) => showTip(ev, `${LEVEL[lv]}<br>${esc(ST[s].t)}: ${num(c[j])} of ${num(tot)} (${pct(c[j], tot)})`)); rect.addEventListener("mouseleave", hideTip);
      x0 += w;
    });
  });
  host.innerHTML = ""; host.appendChild(svg);
  const c0 = counts(st.tool, t.id, "none", st.q), tot = c0.reduce((a, b) => a + b, 0);
  $("txBarsNote").textContent = `${t.id}: ${t.lineage[6]}, ${fmtBp(t.length)}. ${TOOL[st.tool]}, ${st.q === "window" ? `${num(tot)} windows of 5 kb` : `${num(tot)} simulated reads`}. "best": the lowest rank of the MAG's lineage still in the database at that level, the deepest correct answer.`;
}
function drawTrack() {
  const t = target(), host = $("txTrack"), n = t.support.own_species.length, lab = 150, rowH = 18;
  const W = Math.max(520, host.clientWidth || 520), bw = (W - lab - 8) / n, rows = LO.levels.length, H = (rows + 2) * rowH + 52;
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Calls along the genome, one row per leave-out level" });
  LO.levels.forEach((lv, i) => {
    const tr = LO.tracks[`${st.tool}|${t.id}|${lv}`], y = 4 + i * rowH;
    el("text", { x: lab - 8, y: y + 12, "text-anchor": "end", class: "mlbl" }, svg).textContent = LEVEL[lv];
    tr.forEach(([s, nm], k) => {
      const r = el("rect", { x: lab + k * bw, y, width: Math.max(bw, 0.6), height: rowH - 4, fill: ST[LO.status[s]].c }, svg);
      r.addEventListener("mousemove", (ev) => showTip(ev, `${LEVEL[lv]} · ${num(k * LO.window / 1000)}-${num((k + 1) * LO.window / 1000)} kb<br>${esc(ST[LO.status[s]].t)}${LO.names[nm] ? `<br>called: <i>${esc(LO.names[nm])}</i>` : ""}<br>aligned to own species: ${Math.round(100 * t.support.own_species[k])}% · to another species of the genus: ${Math.round(100 * t.support.genus_other[k])}%`));
      r.addEventListener("mouseleave", hideTip);
    });
  });
  [["own_species", "aligned: own species"], ["genus_other", "aligned: rest of genus"]].forEach(([key, label], i) => {
    const y = 10 + (rows + i) * rowH;
    el("text", { x: lab - 8, y: y + 12, "text-anchor": "end", class: "mlbl" }, svg).textContent = label;
    t.support[key].forEach((v, k) => el("rect", { x: lab + k * bw, y, width: Math.max(bw, 0.6), height: rowH - 4, fill: viridis(v) }, svg));
  });
  const yAx = 14 + (rows + 2) * rowH, step = t.length > 4e6 ? 1e6 : 5e5;
  for (let p = 0; p <= t.length; p += step) { const x = lab + (p / LO.window) * bw; el("line", { class: "grid", x1: x, x2: x, y1: yAx - 4, y2: yAx }, svg); el("text", { x, y: yAx + 12, "text-anchor": "middle", class: "lbl" }, svg).textContent = `${p / 1e6} Mb`; }
  host.innerHTML = ""; host.appendChild(svg);
  $("txTrackNote").textContent = `${t.id} (${t.lineage[6]}), ${TOOL[st.tool]}, ${num(n)} windows of 5 kb; colours as in section 5. Alignment rows: the largest share of a window that aligns to one genome (viridis, dark 0% to yellow 100%); own species: ${LO.targets.find((x) => x.id === t.id).genomes.none - LO.targets.find((x) => x.id === t.id).genomes.species} genomes.`;
}
function drawContig() {
  const t = target(), rows = LO.levels.map((lv) => [lv, ...LO.tools.map((tool) => LO.contigs.find((c) => c.tool === tool && c.target === t.id && c.level === lv))]);
  $("txContig").innerHTML = `<table class="ct gt"><thead><tr><th>Level</th><th>Best possible</th>${LO.tools.map((tool) => `<th>${TOOL[tool]}: call</th><th>Kind of call</th>${tool === "kraken2" ? "<th class=\"r\">k-mers without a match</th>" : ""}`).join("")}</tr></thead><tbody>${rows.map(([lv, ...cs]) => `<tr><td>${LEVEL[lv]}</td><td>${t.best[lv]}: <i>${esc(t.lineage[["domain", "phylum", "class", "order", "family", "genus", "species"].indexOf(t.best[lv])] || "")}</i></td>${cs.map((c, j) => c ? `<td><i>${esc(c.name)}</i> <span class="muted">(${c.rank})</span></td><td><i class="sw" style="background:${ST[c.status].c}"></i>${esc(ST[c.status].t)}</td>${LO.tools[j] === "kraken2" ? `<td class="r">${(100 * c.nohit).toFixed(1)}%</td>` : ""}` : "<td></td><td></td>").join("")}</tr>`).join("")}</tbody></table>`;
}
function drawAniTable() {
  const t = target(), rows = LO.levels.map((lv) => [lv, LO.ani.find((a) => a.target === t.id && a.level === lv && a.query === "contig"), LO.ani.find((a) => a.target === t.id && a.level === lv && a.query === "read")]);
  $("txAniTable").innerHTML = `<table class="ct gt"><thead><tr><th>Level</th><th>Closest genome left (species)</th><th class="r">Sylph, contig</th><th class="r">Sylph, reads</th><th class="r">skani ANI</th><th class="r">skani: share of MAG aligned</th></tr></thead><tbody>${rows.map(([lv, c, r]) => `<tr><td>${LEVEL[lv]}</td><td>${c && c.species ? `<i>${esc(c.species)}</i>` : '<span class="muted">none at 80% ANI or more</span>'}</td><td class="r">${c && c.sylph !== null ? c.sylph.toFixed(2) + "%" : ""}</td><td class="r">${r && r.sylph !== null ? r.sylph.toFixed(2) + "%" : ""}</td><td class="r">${c && c.skani.length ? c.skani[0].toFixed(2) + "%" : c && c.species ? '<span class="muted">too far to align</span>' : ""}</td><td class="r">${c && c.skani.length ? c.skani[1].toFixed(1) + "%" : ""}</td></tr>`).join("")}</tbody></table>`;
}
function drawLeaveout() { drawBars(); drawTrack(); drawContig(); drawAniTable(); $("txLo").value = st.lo; $("txTool").value = st.tool; $("txQ").value = st.q; }

// --- contigs against their MAG
function drawContigsVsMags() {
  const host = $("txCtg"), W = Math.max(300, host.clientWidth || 300), lab = 90, rowH = 28, H = CT.table.length * rowH + 30, r = 12;
  const X = (v) => lab + v * (W - lab - r), ci = (k) => CT.classes.indexOf(k);
  const group = (row) => ({ agree_species: row[1 + ci("agree_species")], agree_higher: row[1 + ci("agree_higher")], species: row[1 + ci("species")], genus: row[1 + ci("genus")],
    higher: ["family", "order", "class", "phylum", "domain"].reduce((s, k) => s + row[1 + ci(k)], 0), unclassified: row[1 + ci("unclassified")] });
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Agreement of contig and MAG names by contig length" });
  for (let f = 0; f <= 1.001; f += 0.25) { el("line", { class: "grid", x1: X(f), x2: X(f), y1: 2, y2: H - 24 }, svg); el("text", { x: X(f), y: H - 10, "text-anchor": "middle", class: "lbl" }, svg).textContent = `${Math.round(f * 100)}%`; }
  CT.table.forEach((row, i) => {
    const g = group(row), tot = Object.values(g).reduce((a, b) => a + b, 0), y = 4 + i * rowH;
    el("text", { x: lab - 8, y: y + 15, "text-anchor": "end", class: "mlbl" }, svg).textContent = row[0];
    let x0 = 0;
    for (const k of Object.keys(CTG)) {
      if (!g[k]) continue;
      const w = g[k] / tot, rect = el("rect", { x: X(x0) + 1, y, width: Math.max(0, X(x0 + w) - X(x0) - 2), height: rowH - 8, rx: 3, fill: CTG[k].c }, svg);
      rect.addEventListener("mousemove", (ev) => showTip(ev, `Contigs ${esc(row[0])}<br>${esc(CTG[k].t)}: ${num(g[k])} of ${num(tot)} (${pct(g[k], tot)})`)); rect.addEventListener("mouseleave", hideTip);
      x0 += w;
    }
  });
  host.innerHTML = ""; host.appendChild(svg);
}
function drawContigTables() {
  $("txCtgLegend").innerHTML = Object.entries(CTG).map(([, v]) => `<span><i class="sw" style="background:${v.c}"></i>${esc(v.t)}</span>`).join("");
  const nm = (s) => esc(s).replace(/\b[gs]:/g, (m) => m === "g:" ? "genus " : "species ");
  $("txCtgBig").innerHTML = `<table class="ct gt"><thead><tr><th>Contig</th><th class="r">Length</th><th>MAG</th><th>Differs at</th><th>Metabuli (contig)</th><th>GTDB-Tk (MAG)</th></tr></thead><tbody>${CT.largest_conflicts.map(([c, len, mag, rank, m, g]) => `<tr class="click" data-mag="${esc(mag)}"><td class="mono">${esc(c)}</td><td class="r">${fmtBp(len)}</td><td class="mono">${esc(mag)}</td><td>${rank}</td><td>${nm(m)}</td><td>${nm(g)}</td></tr>`).join("")}</tbody></table>`;
}

// --- state
function params() {
  const p = { mag: B[st.mag].id };
  for (const k of ["lo", "tool", "q"]) if (st[k] !== DEFAULTS[k]) p[k] = st[k];
  if (examples.current >= 0) p.ex = examples.current + 1;
  return p;
}
const write = () => writeHashParams(params());
function applyState(s) {
  st.mag = magIdx.has(s.mag) ? magIdx.get(s.mag) : magIdx.get(DEFAULTS.mag);
  st.lo = LO.targets.some((t) => t.id === s.lo) ? s.lo : DEFAULTS.lo;
  st.tool = LO.tools.includes(s.tool) ? s.tool : DEFAULTS.tool;
  st.q = ["window", "read"].includes(s.q) ? s.q : DEFAULTS.q;
}
function drawMagViews() { drawCard(); drawAni(); }
function drawAll(push = true) { drawMagViews(); drawLeaveout(); if (push) write(); }
function openMag(id) { if (!magIdx.has(id)) return; st.mag = magIdx.get(id); drawMagViews(); write(); }

function setup() {
  fillNumbers(); drawNovel(); drawContigTables(); drawContigsVsMags();
  $("txMags").innerHTML = B.map((b) => `<option value="${b.id} ${esc(b.name)}">`).join("");
  $("txLo").innerHTML = LO.targets.map((t) => `<option value="${t.id}">${t.id} ${esc(t.lineage[6])}</option>`).join("");
  $("txTool").innerHTML = LO.tools.map((t) => `<option value="${t}">${TOOL[t]}</option>`).join("");
  $("txLegend").innerHTML = LO.status.map((s) => `<span><i class="sw" style="background:${ST[s].c}"></i>${esc(ST[s].t)}</span>`).join("");
  $("txFind").addEventListener("change", (e) => openMag(e.target.value.split(" ")[0]));
  for (const id of ["txAni", "txNovel", "txCtgBig"]) $(id).addEventListener("click", (e) => { const t = e.target.closest("[data-mag]"); if (t && magIdx.has(t.dataset.mag)) { hideTip(); openMag(t.dataset.mag); $("txCard").scrollIntoView({ behavior: "smooth", block: "nearest" }); } });
  $("txLo").addEventListener("input", (e) => { st.lo = e.target.value; drawLeaveout(); write(); });
  $("txTool").addEventListener("input", (e) => { st.tool = e.target.value; drawLeaveout(); write(); });
  $("txQ").addEventListener("input", (e) => { st.q = e.target.value; drawLeaveout(); write(); });
  $("txCopy").addEventListener("click", async () => {
    write();
    let ok = true; try { await navigator.clipboard.writeText(location.href); } catch (e) { ok = false; }
    $("txCopied").textContent = ok ? "Copied." : "Copy the address from the browser bar.";
    setTimeout(() => { $("txCopied").textContent = ""; }, 2500);
  });
}
const examples = setupExamples($("txExamples"), (k) => { applyState(EXAMPLES[k].state); drawAll(); });
setup();
(function start() {
  const s = readHashParams(), ex = parseInt(s.ex, 10);
  if (ex >= 1 && ex <= EXAMPLES.length) { examples.current = ex - 1; examples.draw(); applyState({ ...EXAMPLES[ex - 1].state, ...s }); }
  else applyState(s);
  drawAll(false);
})();
let resizeTimer;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { drawContigsVsMags(); drawAll(false); }, 150); });
