// Group 3: butyrate genes across the two diet periods. DATA from np26 scripts/43_project_group3.py.
const D = DATA, N = D.numbers;
const st = { gview: "per1000", view: "genes", hset: "all", hscale: "share", series: "community", mag: D.mags.find((m) => m.main).id, contrib: "mag", capP: "hi" };
const byId = Object.fromEntries(D.mags.map((m) => [m.id, m]));
const mains = D.mags.filter((m) => m.main);
const SPLIT = "diet switch";

// numbers in the text: <span data-n="key"> and {key} in the key findings (project.yaml), from DATA.numbers
const fillText = (s) => s.replace(/\{([a-z0-9_]+)\}/gi, (_, k) => String(N[k]));
document.querySelectorAll("[data-n]").forEach((e) => { e.textContent = String(N[e.dataset.n]); });
document.querySelectorAll(".closing li").forEach((e) => { e.textContent = fillText(e.textContent); });
const KIN = { but: ["but", "var(--c1)"], ptb_buk: ["ptb + buk", "var(--c2)"], buk_only: ["buk without ptb", "var(--c3)"] };

function stats() {
  const items = [[N.n_mags, "MAGs searched"], [N.n_route, "with a complete butyrate route"], [N.n_route_main, `route MAGs with a mean ≥ ${N.min_mean}%`], [`${N.total_hi} → ${N.total_lo}%`, "route MAGs' share of the bases, days 1-5 → 6-10"]];
  $("pjStats").innerHTML = items.map(([n, t]) => `<div class="stat"><b>${esc(String(n))}</b><span>${esc(t)}</span></div>`).join("");
}

function setControls() {
  const sets = D.sets.filter((s) => s.main > 0);
  $("g3Set").innerHTML = `<option value="all">all gene sets (${mains.length} MAGs)</option>` + sets.map((s) => `<option value="${esc(s.set)}">${esc(s.set)} (${s.main})</option>`).join("");
  $("g3Mag").innerHTML = [...mains].sort((a, b) => b.mean - a.mean).map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("");
  $("g3GView").value = st.gview; $("g3View").value = st.view; $("g3Set").value = st.hset; $("g3Scale").value = st.hscale; $("g3Series").value = st.series; $("g3Mag").value = st.mag;
  $("g3MagLab").hidden = st.series !== "mag";
}

// Figure 1: genes x days, grouped by step (dehydrogenase, CoA-transferase, kinase)
function drawGeneHeat() {
  const G = D.gene_heat, order = ["bcd", "but", "atoD", "atoA", "ptb", "buk"].map((g) => G.genes.indexOf(g));
  const src = st.gview === "carrier" ? G.carrier : G.per1000;
  const vals = order.map((i) => {
    const row = src[i];
    if (st.gview === "per1000") return row.map((v) => (v > 0 ? Math.log10(v) : null));
    if (st.gview === "carrier") return row;
    const base = row.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    return row.map((v) => (v > 0 && base > 0 ? Math.log2(v / base) : null));
  });
  const fmt = (v) => {
    if (v === null || v === undefined) return "–";
    if (st.gview === "per1000") return `${(10 ** v).toPrecision(2)} per 1,000 genes`;
    if (st.gview === "carrier") return `${v.toFixed(1)}%`;
    return v.toFixed(2);
  };
  const label = { per1000: "copies per 1,000 genes (log scale)", carrier: "share of the bases in MAGs with the gene (%)", log2: "log2 change from days 1-5" }[st.gview];
  heatmap($("g3GeneHeat"), { rows: order.map((i) => `${G.genes[i]} · ${G.steps[i].replace(" final step", "").replace(" step", "")}`), cols: D.days.map((d) => (innerWidth < 600 ? String(d) : `day ${d}`)), values: vals,
    label, diverging: st.gview === "log2", format: fmt, cell: innerWidth < 600 ? 26 : 44 });
}

function drawGenes() {
  if (st.view === "genes") {
    barChart($("g3Genes"), { labels: D.genes, groups: [{ name: `all ${N.n_mags} MAGs`, values: D.all_counts }, { name: `${N.n_route} route MAGs`, values: D.route_counts }], yLabel: "MAGs with the gene", unit: "MAGs" });
  } else {
    barChart($("g3Genes"), { labels: D.sets.map((s) => s.set), values: D.sets.map((s) => s.n), horizontal: true, yLabel: "Route MAGs with this gene set", unit: "MAGs" });
  }
}

function drawHeat() {
  const rows = mains.filter((m) => st.hset === "all" || m.set === st.hset);
  const vals = rows.map((m) => {
    // share: coloured on a log10 scale (the largest MAGs would hide the rest), shown as percent
    if (st.hscale === "share") return m.share.map((v) => (v > 0 ? Math.log10(v) : null));
    const base = m.share.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    return m.share.map((v) => (v > 0 && base > 0 ? Math.log2(v / base) : null));
  });
  // genus shortened so the row labels fit ("Agathobacter rectalis" -> "Agath. rectalis"): the shortest prefix of at
  // least five letters that no other genus in the table shares
  const genera = [...new Set(mains.map((m) => m.name.split(" ")[0]))];
  const prefix = (g) => { for (let k = 5; k < g.length; k++) if (genera.filter((x) => x.startsWith(g.slice(0, k))).length === 1) return g.slice(0, k); return g; };
  const short = (n) => {
    const [g, ...rest] = n.split(" "), [base, suf] = g.split("_"), p = prefix(g);
    if (!/^[a-z]/.test(rest[0] || "") || !/^[A-Za-z_]+$/.test(g)) return n;
    if (suf && base.length > 7) return `${base.slice(0, 5)}._${suf} ${rest.join(" ")}`;
    return p.length < g.length - 1 ? `${p}. ${rest.join(" ")}` : n;
  };
  // a long species epithet is cut so that name plus gene set stay within the label space
  const rowLabel = (m) => {
    const set = m.set.replace("bcd + ", "").replaceAll(" + ", "+"), s = short(m.name), room = 44 - set.length;
    return `${s.length > room ? s.replace(/ (\S+) \(/, (_, e) => ` ${e.slice(0, Math.max(4, e.length - (s.length - room) - 1))}… (`) : s} · ${set}`;
  };
  const pct = (v) => { const p = 10 ** v; return p >= 1 ? p.toFixed(2) + "%" : p.toPrecision(2) + "%"; };
  heatmap($("g3Heat"), {
    rows: rows.map((m) => (st.hset === "all" ? rowLabel(m) : m.name)), cols: D.days.map((d) => (innerWidth < 600 ? String(d) : `day ${d}`)), values: vals,
    label: st.hscale === "share" ? "share of the sample's bases (log scale)" : "log2 change from days 1-5", diverging: st.hscale === "log2",
    format: (v) => (v === null || v === undefined ? "–" : st.hscale === "share" ? pct(v) : v.toFixed(2)), cell: 18,
  });
}

function drawPcoa() {
  const fams = D.pcoa.families;
  const pts = D.pcoa.ids.map((id, i) => {
    const m = byId[id];
    return { x: D.pcoa.x[i], y: D.pcoa.y[i], label: m.name, group: m.fam, color: catColor(fams.indexOf(m.fam)), size: 4.5, extra: `${m.family} · ${m.set}` };
  });
  scatter($("g3Pcoa"), { points: pts, xLabel: `PCoA axis 1 (${N.pc1}%)`, yLabel: `PCoA axis 2 (${N.pc2}%)`, height: 320 });
  // legend in the fixed family order (scatter's own legend follows first appearance)
  $("g3Pcoa").querySelector(".legend")?.remove();
  chartLegend($("g3Pcoa"), fams.map((f, i) => ({ name: f, color: catColor(i) })));
  heatmap($("g3FamSet"), { ...D.pcoa.fam_set, label: "route MAGs", format: (v) => String(v), cell: 22, colLabelHeight: 150 });
}

function lineSeries() {
  if (st.series === "community") {
    const c = D.community;
    return { series: [{ name: "all route MAGs", values: c.total }, { name: "with but", values: c.type_but }, { name: "ptb/buk only", values: c.type_pb }], yLabel: "Share of the sample's bases (%)", unit: "%",
      keys: ["Route MAGs, % of bases", "MAGs with but, % of bases", "MAGs with ptb/buk only, % of bases"] };
  }
  if (st.series === "per1000") {
    const g = ["bcd", "but", "ptb", "buk"];
    return { series: g.map((k) => ({ name: k, values: D.community.per1000[k] })), yLabel: "Genes per 1,000 genes (weighted)", unit: "per 1,000 genes", keys: g.map((k) => `${k} per 1,000 genes`) };
  }
  const m = byId[st.mag];
  return { series: [{ name: m.name, values: m.share }], yLabel: "Share of the sample's bases (%)", unit: "%", mag: m };
}

function breakText(name, b) {
  const first = b.first_out_day ? `first day outside days 1-5: day ${b.first_out_day} (${b.first_out_dir})` : "no day of 6-10 outside the range of days 1-5";
  return `${esc(name)}: break after day ${b.break_after_day} (log2 ${b.break_log2.toFixed(2)}; at the diet switch ${b.diet_log2.toFixed(2)}); ${first}.`;
}

function drawLine() {
  const L = lineSeries();
  lineChart($("g3Line"), { x: D.days, series: L.series, xLabel: "Day", xName: "Day", yLabel: L.yLabel, unit: L.unit, marks: [{ x: 5.5, label: SPLIT }], zero: false });
  if (L.mag) {
    const m = L.mag;
    $("g3Break").innerHTML = breakText(m.name, { break_after_day: m.brk, break_log2: m.brk_log2, diet_log2: m.diet_log2, first_out_day: m.first, first_out_dir: m.first_dir });
  } else {
    $("g3Break").innerHTML = L.keys.map((k, i) => breakText(L.series[i].name, D.breaks[k])).join("<br>");
  }
}

// Figure 5: change in percentage points per MAG (largest 16) or per genus and final step
function drawBars() {
  let rows;
  if (st.contrib === "mag") {
    rows = [...D.mags].sort((a, b) => Math.abs(b.pp) - Math.abs(a.pp)).slice(0, 16).sort((a, b) => b.pp - a.pp)
      .map((m) => ({ label: m.name, v: m.pp, kin: m.kin }));
  } else {
    rows = Object.entries(D.groups).flatMap(([kin, gs]) => gs.filter((g) => Math.abs(g.pp) >= 0.05).map((g) => ({ label: `${g.genus} (${g.n}) · ${KIN[kin][0]}`, v: g.pp, kin })))
      .sort((a, b) => b.v - a.v);
  }
  barChart($("g3Bars"), { labels: rows.map((r) => r.label), values: rows.map((r) => r.v), colors: rows.map((r) => KIN[r.kin][1]), horizontal: true,
    yLabel: "Days 6-10 minus days 1-5 (percentage points)", unit: "percentage points" });
  chartLegend($("g3Bars"), Object.values(KIN).map(([name, color]) => ({ name, color })));
}

function drawTables() {
  table($("g3Table"), {
    columns: [{ key: "name", label: "MAG" }, { key: "set", label: "Gene set" }, { key: "mean", label: "Mean share (%)", num: true },
      { key: "log2", label: "log2 change", num: true }, { key: "brk", label: "Break after day", num: true, fmt: (v) => String(v) },
      { key: "first", label: "First day outside", num: true, fmt: (v, r) => (v ? `${v} (${r.first_dir})` : "none") }],
    rows: mains, filter: true, sortKey: "mean", maxRows: 12,
  });
  const R = D.ranks, rk = { phylum: "Phylum", class: "Class", order: "Order", family: "Family", genus: "Genus", species: "Species" };
  table($("g3Tax"), {
    columns: [{ key: "id", label: "MAG" }, ...R.map((k) => ({ key: k, label: rk[k] })), { key: "deepest", label: "Deepest rank" }, { key: "set", label: "Gene set" }],
    rows: D.mags.map((m) => ({ ...m, ...Object.fromEntries(R.map((k, i) => [k, m.lineage[i] || "–"])) })), filter: true, sortKey: "family", maxRows: 15,
  });
  const n2 = (v) => (v === null || v === undefined ? "–" : v.toFixed(2));
  table($("g3Duncan"), {
    columns: [{ key: "group", label: "Duncan et al. group" }, { key: "lit", label: "399 → 24 g/day" }, { key: "lit_log2", label: "log2", num: true, fmt: n2 },
      { key: "ours", label: "Our MAGs" }, { key: "hi", label: "Days 1-5 (%)", num: true, fmt: (v) => (v === null ? "–" : v.toFixed(1)) },
      { key: "lo", label: "Days 6-10 (%)", num: true, fmt: (v) => (v === null ? "–" : v.toFixed(1)) }, { key: "log2", label: "log2", num: true, fmt: n2 }],
    rows: D.duncan, sortable: false,
  });
  const g = D.genes;
  table($("g3All"), {
    columns: [{ key: "name", label: "MAG" }, { key: "family", label: "Family" }, { key: "quality", label: "Quality" },
      ...g.map((k, i) => ({ key: k, label: k, num: true, fmt: (v, r) => String(r.genes[i]) })),
      { key: "etf", label: "Etf", fmt: (v) => (v ? "yes" : "no") }, { key: "hi", label: "Days 1-5 (%)", num: true }, { key: "lo", label: "Days 6-10 (%)", num: true },
      { key: "log2", label: "log2 change", num: true }],
    rows: D.mags.map((m) => ({ ...m, ...Object.fromEntries(g.map((k, i) => [k, m.genes[i]])) })), filter: true, sortKey: "hi", maxRows: 15,
  });
}

// part 3.5 (Q1, Q6): what the MAGs capture of the DNA, the butyrate genes and the genomes
const CAP = D.capture, FR = ["HQ", "MQ", "unbinned"], FRN = { HQ: "HQ MAGs", MQ: "MQ MAGs", unbinned: "unbinned contigs" };
const meanOf = (a, p) => { const s = p === "hi" ? a.slice(0, 5) : p === "lo" ? a.slice(5) : [a[p]]; return s.reduce((x, y) => x + y, 0) / s.length; };
const cap1 = (x) => x[0].toUpperCase() + x.slice(1);
function drawCapture() {
  const B = CAP.bases;
  lineChart($("g3Cap"), { x: D.days, series: [...FR.map((q) => ({ name: FRN[q], values: B[q] })), { name: "not on any contig", values: B["not assembled"] }, { name: "route MAGs (summed)", values: CAP.route }],
    xLabel: "Day", xName: "Day", yLabel: "Share of the sample's bases (%)", unit: "%", marks: [{ x: 5.5, label: SPLIT }], zero: true });
  barChart($("g3CapGenes"), { labels: D.genes, groups: FR.map((q) => ({ name: FRN[q], values: D.genes.map((g) => meanOf(CAP.gene_share[g][q], st.capP)) })),
    yLabel: "Share of the gene's depth-weighted copies (%)", unit: "%", fmt: (v) => v.toFixed(0) });
}
function drawCaptureTables() {
  const B = CAP.bases, f1 = (v) => v.toFixed(1);
  table($("g3CapTable"), {
    columns: [{ key: "day", label: "Day", num: true, fmt: String }, { key: "hq", label: "HQ MAGs (%)", num: true, fmt: f1 }, { key: "mq", label: "MQ MAGs (%)", num: true, fmt: f1 },
      { key: "all", label: "All MAGs (%)", num: true, fmt: f1 }, { key: "route", label: "Route MAGs (%)", num: true, fmt: f1 },
      { key: "unb", label: "Unbinned contigs (%)", num: true, fmt: f1 }, { key: "na", label: "Not on any contig (%)", num: true, fmt: f1 }],
    rows: D.days.map((d, i) => ({ day: d, hq: B.HQ[i], mq: B.MQ[i], all: B.HQ[i] + B.MQ[i], route: CAP.route[i], unb: B.unbinned[i], na: B["not assembled"][i] })), sortable: false,
  });
  const f3 = (v) => v.toFixed(3), arrow = (a) => `${f3(meanOf(a, "hi"))} → ${f3(meanOf(a, "lo"))}`;
  table($("g3CapGeneTable"), {
    columns: [{ key: "gene", label: "Gene" }, ...FR.map((q, i) => ({ key: q, label: `Copies, ${FRN[q]}`, num: true, fmt: String })),
      { key: "bin", label: "Per 1,000 genes, MAGs" }, { key: "all", label: "Per 1,000 genes, all contigs" }],
    rows: D.genes.map((g) => ({ gene: g, ...Object.fromEntries(FR.map((q, i) => [q, CAP.gene_copies[g][i]])), bin: arrow(CAP.per_bin[g]), all: arrow(CAP.per_all[g]) })), sortable: false,
  });
  table($("g3Markers"), {
    columns: [{ key: "marker", label: "Marker" }, ...FR.map((q) => ({ key: q, label: cap1(FRN[q]), num: true, fmt: String })), { key: "total", label: "Total", num: true, fmt: String },
      ...FR.map((q) => ({ key: `dep_${q}`, label: `${cap1(FRN[q])}, depth-weighted (%)`, num: true, fmt: (v) => v.toFixed(0) }))],
    rows: CAP.markers, sortKey: "total", sortDesc: true,
  });
}

// part 3.6 (Q2): reliability of the gene calls
const REL = D.reliability;
function drawRelTables() {
  const arrow = (v) => (v[0] === null ? "–" : `${v[0].toFixed(3)} → ${v[1].toFixed(3)}`);
  table($("g3Rel"), {
    columns: [{ key: "gene", label: "Gene" }, { key: "n", label: "Calls", num: true, fmt: String }, { key: "confident", label: "Confident", num: true, fmt: String },
      { key: "borderline", label: "Borderline", num: true, fmt: String }, { key: "doubtful", label: "Doubtful", num: true, fmt: String },
      { key: "score", label: "Score / threshold" }, { key: "near", label: "Within 10% above" }, { key: "below", label: "Just below" },
      { key: "all", label: "Per 1,000 genes, all" }, { key: "nod", label: "Without doubtful" }, { key: "conf", label: "Confident only" }],
    rows: REL.summary.map((r) => {
      const g = r.gene, isBut = g === "but";
      return { ...r, n: r.confident + r.borderline + r.doubtful,
        score: isBut ? `identity ${N.q2_strict_min}-${N.q2_strict_max}% (exact name), ${N.q2_broad_min}-${N.q2_broad_max}% (broad name)` : `${N[`q2_${g}_rmin`]}-${N[`q2_${g}_rmax`]}`,
        near: isBut ? "–" : String(N[`q2_${g}_near`]), below: isBut ? "–" : String(N[`q2_${g}_below`]),
        all: arrow(REL.robust.all[g]), nod: arrow(REL.robust.no_doubtful[g]), conf: r.confident ? arrow(REL.robust.confident[g]) : "no confident call" };
    }), sortable: false,
  });
  table($("g3Calls"), {
    columns: [{ key: "gene", label: "Gene" }, { key: "name", label: "MAG" }, { key: "ev", label: "Evidence", num: true, fmt: (v, r) => (r.gene === "but" ? `${Math.round(100 * v)}% identity` : `${v.toFixed(2)} × threshold`) },
      { key: "partner", label: "Neighbour", fmt: (v) => (v === null ? "–" : v ? "yes" : "no") }, { key: "meth", label: "Methylation" },
      { key: "contam", label: "Contamination (%)", num: true, fmt: (v) => v.toFixed(1) }, { key: "cls", label: "Class" }, { key: "why", label: "Reasons", fmt: (v) => v || "–" }],
    rows: REL.calls, filter: true, sortKey: "gene", maxRows: 15,
  });
}
const BUTG = [["strict", "butyryl-CoA:acetate CoA-transferase (counted)"], ["broad", "acetyl-CoA hydrolase/transferase (counted)"], ["putative", "putative butyrate:acetyl-CoA CoA-transferase"], ["other", "other family members"]];
function drawButId() {
  const bins = Array.from({ length: 20 }, (_, i) => i * 5);
  const count = (gr) => bins.map((b) => REL.but_family.filter((f) => f.group === gr && f.ident >= b && (f.ident < b + 5 || (b === 95 && f.ident <= 100))).length);
  barChart($("g3ButId"), { labels: bins.map((b) => `${b}-${b + 5}`), groups: BUTG.map(([k, name]) => ({ name, values: count(k) })), yLabel: "Proteins", unit: "proteins", fmt: String });
}

// Figure 1 (Q4): the pathway as a drawn scheme; gene boxes from D.pathway (np26 scripts/43 pathway())
function drawPathway() {
  const P = Object.fromEntries(D.pathway.map((g) => [g.gene, g]));
  const W = 480, X = 150; // main chain at x = X
  const col = (g) => (g.dir === "down" ? "var(--c1)" : g.dir === "up" ? "var(--c2)" : "var(--muted)");
  const sym = { up: "▲", down: "▼", level: "●" };
  const t = (x, y, txt, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 12}" text-anchor="${o.anchor || "start"}" fill="${o.fill || "var(--ink)"}"${o.bold ? ' font-weight="600"' : ""}>${esc(txt)}</text>`;
  const arrow = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke || "var(--muted)"}" stroke-width="1.6"${o.dash ? ' stroke-dasharray="5 4"' : ""} marker-end="url(#g3ah)"/>`;
  const box = (x, y, w, genes) => {
    // one box per enzyme step; genes: list of gene ids shown in it
    const lines = [];
    genes.forEach((id) => {
      const g = P[id];
      lines.push([`${g.gene} · ${g.enzyme}`, "var(--ink)", true]);
      if (!g.dir) lines.push(["not searched", "var(--muted)", false]);
      else {
        lines.push([`found by ${g.how}`, "var(--muted)", false]);
        const gen = g.genera.filter((x) => Math.abs(x.pp) >= 0.05).map((x) => `${x.genus} ${x.pp > 0 ? "+" : "−"}${Math.abs(x.pp).toFixed(1)}`).join(", ");
        lines.push([`${sym[g.dir]} ${g.dir} (log2 ${g.log2 > 0 ? "+" : "−"}${Math.abs(g.log2).toFixed(2)})`, col(g), true]);
        if (gen) lines.push([`${gen} points`, col(g), false]);
      }
    });
    const h = 10 + lines.length * 15;
    const searched = genes.some((id) => P[id].dir);
    const stroke = genes.map((id) => P[id]).find((g) => g.dir && g.dir !== "level");
    let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--surface)" stroke="${stroke ? col(stroke) : "var(--line)"}" stroke-width="${stroke ? 2 : 1}"${searched ? "" : ' stroke-dasharray="4 3"'}/>`;
    lines.forEach(([txt, fill, bold], i) => { out += t(x + 8, y + 18 + i * 15, txt, { size: 10.5, fill, bold }); });
    return { svg: out, h };
  };
  let svg = `<defs><marker id="g3ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--muted)"/></marker></defs>`;
  const met = [["acetyl-CoA (× 2)", 24], ["acetoacetyl-CoA", 104], ["3-hydroxybutyryl-CoA", 184], ["crotonyl-CoA", 264], ["butyryl-CoA", 360]];
  met.forEach(([m, y]) => { svg += t(X, y, m, { anchor: "middle", bold: true, size: 13 }); });
  [["thl", 30], ["hbd", 110], ["crt", 190]].forEach(([id, y]) => {
    svg += arrow(X, y + 2, X, y + 60);
    svg += box(X + 70, y + 4, 255, [id]).svg;
  });
  svg += arrow(X, 272, X, 344);
  const b = box(X + 70, 280, 255, ["bcd"]);
  svg += b.svg;
  // alternative entries (not searched), joining at crotonyl-CoA
  svg += `<rect x="4" y="212" width="112" height="34" rx="6" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/>`;
  svg += t(10, 226, "lysine, glutarate,", { size: 10, fill: "var(--muted)" }) + t(10, 239, "4-aminobutyrate routes", { size: 10, fill: "var(--muted)" });
  svg += arrow(60, 247, X - 50, 258, { dash: true });
  svg += t(8, 262, "not searched", { size: 10, fill: "var(--muted)" });
  // two final steps
  const L = 90, R = 340;
  svg += arrow(X - 10, 368, L, 398) + arrow(X + 10, 368, R, 398);
  const bb = box(4, 402, 228, ["but"]);
  svg += bb.svg;
  const ba = box(4, 402 + bb.h + 6, 228, ["atoD", "atoA"]);
  svg += ba.svg;
  svg += t(118, 402 + bb.h + ba.h + 22, "acetate in → acetyl-CoA out", { size: 10, anchor: "middle", fill: "var(--muted)" });
  const yL = 402 + bb.h + ba.h + 30;
  const pb = box(248, 402, 228, ["ptb"]);
  svg += pb.svg;
  svg += t(R + 22, 402 + pb.h + 28, "butyryl-phosphate", { anchor: "middle", bold: true, size: 12 });
  svg += arrow(R + 22, 402 + pb.h + 2, R + 22, 402 + pb.h + 14) + arrow(R + 22, 402 + pb.h + 34, R + 22, 402 + pb.h + 46);
  const kb = box(248, 402 + pb.h + 50, 228, ["buk"]);
  svg += kb.svg;
  svg += t(R + 22, 402 + pb.h + 50 + kb.h + 22, "ATP made", { size: 10, anchor: "middle", fill: "var(--muted)" });
  const yB = Math.max(yL, 402 + pb.h + 50 + kb.h + 30) + 24;
  svg += arrow(118, yL, 200, yB - 14) + arrow(R + 22, 402 + pb.h + 50 + kb.h + 30, 300, yB - 14);
  svg += t(250, yB, "butyrate", { anchor: "middle", bold: true, size: 14 });
  svg += t(6, 384, "CoA-transferase route", { size: 10.5, fill: "var(--muted)" });
  svg += t(474, 384, "kinase route", { anchor: "end", size: 10.5, fill: "var(--muted)" });
  const H = yB + 12;
  $("g3Path").innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:640px;display:block;margin:0 auto" role="img" aria-label="Butyrate pathway with the searched genes and their change">${svg}</svg>`;
}

function drawAll() { setControls(); drawGeneHeat(); drawGenes(); drawHeat(); drawPcoa(); drawLine(); drawBars(); drawCapture(); drawButId(); drawPathway(); }
$("g3CapP").addEventListener("change", (e) => { st.capP = /^\d+$/.test(e.target.value) ? Number(e.target.value) : e.target.value; drawCapture(); });
$("g3CapP").insertAdjacentHTML("beforeend", D.days.map((d, i) => `<option value="${i}">day ${d}</option>`).join(""));

$("g3GView").addEventListener("change", (e) => { st.gview = e.target.value; drawGeneHeat(); });
$("g3View").addEventListener("change", (e) => { st.view = e.target.value; drawGenes(); });
$("g3Set").addEventListener("change", (e) => { st.hset = e.target.value; drawHeat(); });
$("g3Scale").addEventListener("change", (e) => { st.hscale = e.target.value; drawHeat(); });
$("g3Series").addEventListener("change", (e) => { st.series = e.target.value; $("g3MagLab").hidden = st.series !== "mag"; drawLine(); });
$("g3Mag").addEventListener("change", (e) => { st.mag = e.target.value; drawLine(); });
$("g3Contrib").addEventListener("change", (e) => { st.contrib = e.target.value; drawBars(); });

stats();
drawTables();
drawCaptureTables();
drawRelTables();
drawAll();
