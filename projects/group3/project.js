// Group 3: butyrate genes across the two diet periods. DATA from np26 scripts/43_project_group3.py.
const D = DATA, N = D.numbers;
const st = { view: "genes", hset: "all", hscale: "share", series: "community", mag: D.mags.find((m) => m.main).id, hl: null };
const byId = Object.fromEntries(D.mags.map((m) => [m.id, m]));
const mains = D.mags.filter((m) => m.main);
const SPLIT = "diet switch";

// numbers in the text and in example answers: {key} from DATA.numbers, {mag:ID:field} from a MAG's row
function fillText(s) {
  return s.replace(/\{mag:([^:}]+):([a-z0-9_]+)\}/gi, (_, id, f) => String(byId[id][f])).replace(/\{([a-z0-9_]+)\}/gi, (_, k) => String(N[k]));
}
document.querySelectorAll("[data-n]").forEach((e) => { e.textContent = String(N[e.dataset.n]); });
for (const ex of EXAMPLES) { ex.question = fillText(ex.question); ex.answer = fillText(ex.answer); }

function stats() {
  const items = [[N.n_mags, "MAGs searched"], [N.n_route, "with a complete butyrate route"], [N.n_route_main, `route MAGs with a mean ≥ ${N.min_mean}%`], [`${N.total_hi} → ${N.total_lo}%`, "route MAGs' share of the bases, days 1-5 → 6-10"]];
  $("pjStats").innerHTML = items.map(([n, t]) => `<div class="stat"><b>${esc(String(n))}</b><span>${esc(t)}</span></div>`).join("");
}

function setControls() {
  const sets = D.sets.filter((s) => s.main > 0);
  $("g3Set").innerHTML = `<option value="all">all gene sets (${mains.length} MAGs)</option>` + sets.map((s) => `<option value="${esc(s.set)}">${esc(s.set)} (${s.main})</option>`).join("");
  $("g3Mag").innerHTML = [...mains].sort((a, b) => b.mean - a.mean).map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("");
  $("g3View").value = st.view; $("g3Set").value = st.hset; $("g3Scale").value = st.hscale; $("g3Series").value = st.series; $("g3Mag").value = st.mag;
  $("g3MagLab").hidden = st.series !== "mag";
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
    rows: rows.map((m) => (st.hset === "all" ? rowLabel(m) : m.name)), cols: D.days.map((d) => `day ${d}`), values: vals,
    label: st.hscale === "share" ? "share of the sample's bases (log scale)" : "log2 change from days 1-5", diverging: st.hscale === "log2",
    format: (v) => (v === null || v === undefined ? "–" : st.hscale === "share" ? pct(v) : v.toFixed(2)), cell: 18,
  });
}

function drawPcoa() {
  const fams = D.pcoa.families;
  const pts = D.pcoa.ids.map((id, i) => {
    const m = byId[id];
    return { x: D.pcoa.x[i], y: D.pcoa.y[i], label: m.name, group: m.fam, color: catColor(fams.indexOf(m.fam)), size: st.hl === id ? 8 : 4.5, extra: `${m.family} · ${m.set}` };
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

function drawTables() {
  table($("g3Table"), {
    columns: [{ key: "name", label: "MAG" }, { key: "set", label: "Gene set" }, { key: "mean", label: "Mean share (%)", num: true },
      { key: "log2", label: "log2 change", num: true }, { key: "brk", label: "Break after day", num: true, fmt: (v) => String(v) },
      { key: "first", label: "First day outside", num: true, fmt: (v, r) => (v ? `${v} (${r.first_dir})` : "none") }],
    rows: mains, filter: true, sortKey: "mean", maxRows: 12,
  });
  const g = D.genes;
  table($("g3All"), {
    columns: [{ key: "name", label: "MAG" }, { key: "family", label: "Family" }, { key: "quality", label: "Quality" },
      ...g.map((k, i) => ({ key: k, label: k, num: true, fmt: (v, r) => String(r.genes[i]) })),
      { key: "etf", label: "Etf", fmt: (v) => (v ? "yes" : "") }, { key: "hi", label: "Days 1-5 (%)", num: true }, { key: "lo", label: "Days 6-10 (%)", num: true },
      { key: "log2", label: "log2 change", num: true }],
    rows: D.mags.map((m) => ({ ...m, ...Object.fromEntries(g.map((k, i) => [k, m.genes[i]])) })), filter: true, sortKey: "hi", maxRows: 15,
  });
}

function drawAll() { setControls(); drawGenes(); drawHeat(); drawPcoa(); drawLine(); }

$("g3View").addEventListener("change", (e) => { st.view = e.target.value; drawGenes(); });
$("g3Set").addEventListener("change", (e) => { st.hset = e.target.value; drawHeat(); });
$("g3Scale").addEventListener("change", (e) => { st.hscale = e.target.value; drawHeat(); });
$("g3Series").addEventListener("change", (e) => { st.series = e.target.value; $("g3MagLab").hidden = st.series !== "mag"; drawLine(); });
$("g3Mag").addEventListener("change", (e) => { st.mag = e.target.value; drawLine(); });

const DEFAULT = { ...st };
const applyState = (s) => { Object.assign(st, DEFAULT, s); };
const examples = setupExamples($("pjExamples"), (k) => {
  applyState(EXAMPLES[k].state);
  drawAll();
  writeHashParams({ ex: k + 1 });
});
stats();
drawTables();
(function start() {
  const ex = parseInt(readHashParams().ex, 10);
  if (ex >= 1 && ex <= EXAMPLES.length) { examples.current = ex - 1; examples.draw(); applyState(EXAMPLES[ex - 1].state); }
  drawAll();
})();
