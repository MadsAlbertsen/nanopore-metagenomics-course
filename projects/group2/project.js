// Group 2 manuscript: community and CAZyme potential over the ten days. Every number from DATA (np26 scripts/42_project_group2.py).
const D = DATA;
const N = D.numbers;
const st = { f1mag: "", f8: "metabolic", fig1: "phyla", mag: D.default_mag, cat: "all", big: false, f5: "mag", forest: "log2", pseudo: 0.01, sensVal: "n" };
const SPLITS = D.days.slice(0, -1).map((d) => `${d}|${d + 1}`);
const PHYLA = D.phyla.map((p) => p.name);
const phylumColor = (p) => `var(--c${(PHYLA.includes(p) ? PHYLA.indexOf(p) : PHYLA.indexOf("Other phyla")) + 1})`;
const byMag = Object.fromEntries(D.mags.map((m) => [m.mag, m]));
const catName = (c) => D.cazy.names[D.cazy.cats.indexOf(c)];
const fmtR = (v) => v.toFixed(2);
const f = (k) => (v) => (v === null || v === undefined ? "–" : Number(v).toFixed(k));

// numbers in the text: <span data-n="key" data-d="decimals"> filled from DATA.numbers
function numText(key, d) {
  const v = N[key];
  if (v === undefined) return "?";
  return d !== undefined ? Number(v).toFixed(+d) : String(v);
}
document.querySelectorAll("[data-n]").forEach((s) => { s.textContent = numText(s.dataset.n, s.dataset.d); });

// --- downloads: CSV / TSV built in the browser from DATA
function delim(cols, rows, sep) {
  const q = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return sep === "," ? (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s) : s.replace(/[\t\n]/g, " ");
  };
  return [cols.map((c) => q(c.label)).join(sep), ...rows.map((r) => cols.map((c) => q(c.get ? c.get(r) : r[c.key])).join(sep))].join("\n") + "\n";
}
function saveText(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type: type + ";charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
// one or more data sets [{file, title, cols, rows}] as download links in host
function dlLinks(host, sets, label = "Source data") {
  host.classList.add("dl");
  host.innerHTML = `<span class="muted">${esc(label)}:</span> ` + sets.map((s, i) =>
    `<span class="dlset">${sets.length > 1 ? esc(s.title) + " " : ""}<button class="link" data-i="${i}" data-f="csv">CSV</button> · <button class="link" data-i="${i}" data-f="tsv">TSV</button></span>`).join("");
  host.addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-f]");
    if (!b) return;
    const s = sets[+b.dataset.i], tsv = b.dataset.f === "tsv";
    saveText(`group2_${s.file}.${tsv ? "tsv" : "csv"}`, "\ufeff" + delim(s.cols, s.rows, tsv ? "\t" : ","), tsv ? "text/tab-separated-values" : "text/csv");
  });
}
const dayCols = (get) => D.days.map((d, j) => ({ label: `day ${d}`, get: (r) => get(r, j) }));

const SWITCH = [{ x: 5.5, label: "diet switch" }];

function drawFig1() {
  for (const b of $("g2F1Tabs").querySelectorAll("button")) b.setAttribute("aria-selected", b.dataset.v === st.fig1);
  $("g2F1MagCtl").hidden = st.fig1 !== "mags";
  if (st.fig1 === "phyla") {
    lineChart($("g2F1"), { x: D.days, series: D.phyla.map((p) => ({ name: p.name, values: p.values })), xLabel: "Day", xName: "Day",
      yLabel: "Share of the day's bases (%)", unit: "%", marks: SWITCH });
  } else if (st.fig1 === "mags") {
    lineChart($("g2F1"), { x: D.days, series: D.top_mags.map((m) => ({ name: m.name, values: m.share, color: phylumColor(m.phylum) })), xLabel: "Day", xName: "Day",
      yLabel: "Share of the day's bases (%)", unit: "%", marks: SWITCH, highlight: st.f1mag || undefined, height: 360 });
  } else {
    lineChart($("g2F1"), { x: D.days, series: [{ name: "Effective number of MAGs", values: D.effective }], xLabel: "Day", xName: "Day",
      yLabel: "Effective number of MAGs", marks: SWITCH, zero: true });
  }
}

function drawFig2() {
  const vals = D.bc.values.map((row, i) => row.map((v, j) => (i === j ? null : v)));
  heatmap($("g2Heat"), { rows: D.bc.days, cols: D.bc.days, values: vals, label: "Bray-Curtis", format: (v) => (v === null ? "–" : v.toFixed(2)), cell: 24 });
  scatter($("g2Pcoa"), { points: D.pcoa.map((p) => ({ x: p.x, y: p.y, label: `Day ${p.day}`, group: p.period })), labelled: true,
    xLabel: `PCoA axis 1 (${N.pc1}%)`, yLabel: `PCoA axis 2 (${N.pc2}%)`, xFmt: (v) => v.toFixed(2), yFmt: (v) => v.toFixed(2) });
}

function magOptions() {
  const list = D.mags.filter((m) => !st.big || m.big);
  if (!list.some((m) => m.mag === st.mag)) st.mag = list[0].mag;
  $("g2Mag").innerHTML = list.map((m) => `<option value="${esc(m.mag)}"${m.mag === st.mag ? " selected" : ""}>${esc(m.name)} · ${m.mean.toFixed(2)}%</option>`).join("");
  $("g2Big").checked = st.big;
}

function drawFig3() {
  const m = byMag[st.mag];
  $("g2Mag").value = m.mag;
  const dir = m.log2 >= 0 ? "above" : "below";
  const fit = m.fit === "step" ? "a step at the switch fits better than a straight line" : m.fit === "trend" ? "a straight line fits better than a step at the switch" : "it changed less than two-fold, so it is not classed";
  $("g2MagSum").innerHTML = `<b>${esc(m.name)}</b> (${esc(m.phylum)}, ${esc(m.quality)}, ${m.completeness.toFixed(1)}% complete): mean ${m.high.toFixed(2)}% in days 1-5, ${m.low.toFixed(2)}% in days 6-10, log2 change ${m.log2.toFixed(2)} (interval ${m.lo.toFixed(2)} to ${m.hi.toFixed(2)}). ` +
    `Best split ${SPLITS[m.best - 1]} (R² ${fmtR(m.r2_best)}); step at the switch R² ${fmtR(m.r2_switch)}, straight line R² ${fmtR(m.r2_line)}: ${fit}. ` +
    `${m.sep} of 5 low-carbohydrate days lie ${dir} all five high-carbohydrate days.`;
  lineChart($("g2MagLine"), { x: D.days, series: [{ name: m.name, values: m.share }], xLabel: "Day", xName: "Day",
    yLabel: "Share of the day's bases (%)", unit: "%", marks: SWITCH, zero: true });
  const colors = SPLITS.map((s, i) => (i === 4 ? "var(--c2)" : i === m.best - 1 ? "var(--c1)" : "var(--v4)"));
  barChart($("g2Splits"), { labels: SPLITS, values: m.splits, yLabel: "R² of a step at this split", colors, fmt: (v) => v.toFixed(2) });
  barChart($("g2SplitCounts"), { labels: SPLITS, groups: [{ name: "MAGs that rose ≥ 2-fold", values: D.split_counts.rise }, { name: "MAGs that fell ≥ 2-fold", values: D.split_counts.fall }],
    yLabel: "MAGs with their best split here", unit: "MAGs", height: 240, fmt: (v) => String(Math.round(v)) });
}

// Fig. 4a: forest plot of the two-fold MAGs (chart kit primitives: mountChart, newSvg, scale, axes, el, tipOn)
function forest(host) {
  return mountChart(host, () => {
    const rows = D.mags.filter((m) => m.big).sort((a, b) => a.log2 - b.log2);
    const clr = st.forest === "clr";
    const val = (m) => (clr ? m.clr : m.log2);
    const rowH = 15, top = 10, bottom = 44;
    const { svg, W } = newSvg(host, top + rows.length * rowH + bottom);
    const labW = Math.min(250, W * 0.44), maxCh = Math.max(12, Math.floor((labW - 8) / 6));
    const box = { l: labW, r: W - 14, t: top, b: top + rows.length * rowH };
    const all = rows.flatMap((m) => (clr ? [m.clr] : [m.lo, m.hi, m.log2])).concat([-1, 1]);
    const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.04;
    const x = scale(lo - pad, hi + pad, box.l + 6, box.r);
    axes(svg, x, () => 0, box, { xLabel: clr ? "Change in centred log-ratio (log2 units)" : "log2 change, days 6-10 / days 1-5", xTicks: x.ticks(6), yTicks: [] });
    for (const t of [-1, 0, 1]) el("line", { x1: x(t), x2: x(t), y1: box.t, y2: box.b, class: t === 0 ? "base" : "mark" }, svg);
    rows.forEach((m, i) => {
      const y = top + i * rowH + rowH / 2;
      const color = phylumColor(m.phylum);
      const name = m.name.length > maxCh ? m.name.slice(0, maxCh - 1) + "…" : m.name;
      el("text", { x: box.l - 6, y: y + 4, "text-anchor": "end", class: "dlab" }, svg).textContent = name;
      if (!clr) el("line", { x1: x(m.lo), x2: x(m.hi), y1: y, y2: y, style: `stroke:${color};stroke-width:2` }, svg);
      const c = el("circle", { cx: x(val(m)), cy: y, r: 4.2, class: "dot", style: m.stays ? `fill:${color};stroke:${color}` : `fill:var(--surface);stroke:${color};stroke-width:1.6` }, svg);
      tipOn(c, `<b>${esc(m.name)}</b><br>${esc(m.phylum)}, ${esc(m.quality)}<br>log2 change ${m.log2.toFixed(2)} (interval ${m.lo.toFixed(2)} to ${m.hi.toFixed(2)})<br>centred log-ratio change ${m.clr.toFixed(2)}<br>${m.stays ? "two-fold and above the 0.1% cut-off in all ten leave-one-day-out runs" : "not two-fold and above the 0.1% cut-off in every leave-one-day-out run"}`);
    });
    const seen = [...new Set(rows.map((m) => (PHYLA.includes(m.phylum) ? m.phylum : "Other phyla")))];
    chartLegend(host, seen.map((p) => ({ name: p, color: phylumColor(p) })));
  });
}

function drawFig4() {
  $("g2ForestKind").value = st.forest;
  forest($("g2Forest"));
  const folds = [...new Set(D.sens.map((r) => r.fold))], means = [...new Set(D.sens.map((r) => r.min_mean))];
  const cell = (mm, fo) => D.sens.find((r) => r.pseudo === st.pseudo && r.min_mean === mm && r.fold === fo);
  const value = (r) => (st.sensVal === "n" ? r.down + r.up : r.down + r.up ? (100 * r.at_switch) / (r.down + r.up) : null);
  heatmap($("g2Sens"), { rows: means.map((mm) => `mean ≥ ${mm}%`), cols: folds.map((fo) => `${fo}-fold`),
    values: means.map((mm) => folds.map((fo) => value(cell(mm, fo)))), cell: 44, colLabelHeight: 56,
    label: st.sensVal === "n" ? "MAGs changed" : "% with the best split at 5|6",
    format: (v) => (v === null ? "–" : st.sensVal === "n" ? String(Math.round(v)) : `${Math.round(v)}%`) });
}

function catOptions() {
  $("g2Cat").innerHTML = D.cazy.cats.map((c, i) => `<option value="${c}"${c === st.cat ? " selected" : ""}>${esc(D.cazy.names[i])}</option>`).join("");
}

function drawFig5() {
  $("g2Cat").value = st.cat;
  for (const b of $("g2F5Tabs").querySelectorAll("button")) b.setAttribute("aria-selected", b.dataset.v === st.f5);
  lineChart($("g2CzLine"), { x: D.days, series: [{ name: catName(st.cat), values: D.cazy.per_day[st.cat] }], xLabel: "Day", xName: "Day",
    yLabel: "Genes per 1,000 genes", unit: "per 1,000 genes", marks: SWITCH, zero: true });
  const host = $("g2CzBar");
  if (st.f5 === "mag") {
    const top = D.cazy.top[st.cat];
    barChart(host, { labels: top.map((t) => t.name), values: top.map((t) => t.value), horizontal: true, colors: top.map((t) => phylumColor(t.phylum)),
      yLabel: "Contribution to the change (genes per 1,000 genes)", fmt: (v) => v.toFixed(2) });
    const seen = [...new Set(top.map((t) => (PHYLA.includes(t.phylum) ? t.phylum : "Other phyla")))];
    chartLegend(host, seen.map((p) => ({ name: p, color: phylumColor(p) })));
  } else {
    const k = D.ph_contrib.cats.indexOf(st.cat), rows = D.ph_contrib.rows;
    barChart(host, { labels: rows.map((r) => r.phylum), values: rows.map((r) => r.values[k]), horizontal: true, colors: rows.map((r) => phylumColor(r.phylum)),
      yLabel: "Sum of the MAG contributions (genes per 1,000 genes)", fmt: (v) => v.toFixed(2) });
  }
}

function drawFig6() {
  const F = D.families;
  heatmap($("g2FamHeat"), { rows: F.map((x) => `${x.family} (${x.category.toLowerCase()})`), cols: D.days.map((d) => `Day ${d}`),
    values: F.map((x) => x.days), label: "log2 of the day over the days 1-5 mean", diverging: true, format: (v) => (v === null ? "–" : v.toFixed(2)) });
  table($("g2FamTable"), {
    columns: [{ key: "family", label: "Family" }, { key: "category", label: "Substrate group" },
      { key: "high", label: "Days 1-5 (per 1,000 genes)", num: true, fmt: f(2) },
      { key: "low", label: "Days 6-10 (per 1,000 genes)", num: true, fmt: f(2) },
      { key: "ratio", label: "Fold change (6-10 / 1-5)", num: true, fmt: f(2) },
      { key: "top_mag", label: "MAG adding most" }, { key: "top_value", label: "Its contribution", num: true, fmt: f(3) }],
    rows: F, sortKey: "ratio", maxRows: 20,
  });
}

// --- figure source data
const SOURCES = {
  fig1: [{ file: "fig1_phyla_diversity", title: "", rows: D.days.map((d, j) => ({ d, j })),
    cols: [{ label: "day", key: "d" }, ...D.phyla.map((p) => ({ label: `${p.name} (% of bases)`, get: (r) => p.values[r.j] })),
      { label: "Shannon index", get: (r) => D.shannon[r.j] }, { label: "effective number of MAGs", get: (r) => D.effective[r.j] }] },
  { file: "fig1c_mags_over_1pct", title: "c", rows: D.top_mags,
    cols: [{ label: "MAG", key: "mag" }, { label: "name", key: "name" }, { label: "phylum", key: "phylum" }, ...dayCols((r, j) => r.share[j])] }],
  fig2: [{ file: "fig2a_bray_curtis", title: "a", rows: D.bc.values.map((v, i) => ({ v, i })),
    cols: [{ label: "day", get: (r) => D.days[r.i] }, ...dayCols((r, j) => r.v[j])] },
  { file: "fig2b_pcoa", title: "b", rows: D.pcoa, cols: [{ label: "day", key: "day" }, { label: "period", key: "period" }, { label: "axis 1", key: "x" }, { label: "axis 2", key: "y" }] }],
  fig3: [{ file: "fig3a_mag_shares", title: "a (shares)", rows: D.mags,
    cols: [{ label: "MAG", key: "mag" }, { label: "name", key: "name" }, { label: "phylum", key: "phylum" }, ...dayCols((r, j) => r.share[j])] },
  { file: "fig3b_split_r2", title: "b (split R²)", rows: D.mags,
    cols: [{ label: "MAG", key: "mag" }, { label: "name", key: "name" }, ...SPLITS.map((s, k) => ({ label: `R2 split ${s}`, get: (r) => r.splits[k] })), { label: "R2 line", key: "r2_line" }, { label: "best split", get: (r) => SPLITS[r.best - 1] }] },
  { file: "fig3c_split_counts", title: "c", rows: SPLITS.map((s, k) => ({ s, k })),
    cols: [{ label: "split", key: "s" }, { label: "MAGs rising >= 2-fold", get: (r) => D.split_counts.rise[r.k] }, { label: "MAGs falling >= 2-fold", get: (r) => D.split_counts.fall[r.k] }] }],
  fig4: [{ file: "fig4a_effect_sizes", title: "a", rows: D.mags.filter((m) => m.big),
    cols: [{ label: "MAG", key: "mag" }, { label: "name", key: "name" }, { label: "phylum", key: "phylum" }, { label: "log2 change", key: "log2" },
      { label: "interval 5%", key: "lo" }, { label: "interval 95%", key: "hi" }, { label: "CLR change (log2 units)", key: "clr" }, { label: "two-fold and >= 0.1% in all leave-one-day-out runs", key: "stays" }] },
  { file: "fig4b_cutoff_grid", title: "b", rows: D.sens,
    cols: [{ label: "pseudocount (%)", key: "pseudo" }, { label: "mean share cut-off (%)", key: "min_mean" }, { label: "fold cut-off", key: "fold" }, { label: "MAGs followed", key: "mags" },
      { label: "down", key: "down" }, { label: "up", key: "up" }, { label: "best split at 5|6", key: "at_switch" }, { label: "later", key: "later" }, { label: "earlier", key: "earlier" }] }],
  fig5: [{ file: "fig5a_cazyme_per_day", title: "a", rows: D.cazy.cats.map((c, i) => ({ c, i })),
    cols: [{ label: "substrate group", get: (r) => D.cazy.names[r.i] }, ...dayCols((r, j) => D.cazy.per_day[r.c][j])] },
  { file: "fig5b_top_mag_contributions", title: "b (MAGs)", rows: D.cazy.cats.flatMap((c, i) => D.cazy.top[c].map((t) => ({ ...t, group: D.cazy.names[i] }))),
    cols: [{ label: "substrate group", key: "group" }, { label: "MAG", key: "mag" }, { label: "name", key: "name" }, { label: "phylum", key: "phylum" },
      { label: "contribution (genes per 1,000 genes)", key: "value" }, { label: "change in mean share (% points)", key: "share_change" }, { label: "MAG's genes per 1,000 genes", key: "rate" }] },
  { file: "fig5b_phylum_contributions", title: "b (phyla)", rows: D.ph_contrib.rows,
    cols: [{ label: "phylum", key: "phylum" }, ...D.ph_contrib.names.map((n, k) => ({ label: n, get: (r) => r.values[k] }))] }],
  fig7: [{ file: "fig7_cazyme_two_fold_mags", title: "", rows: D.cz35,
    cols: [{ label: "substrate group", key: "name" }, { label: "all MAGs: change (%)", key: "all_pct" }, { label: "two-fold MAGs: days 1-5 (per 1,000 genes)", key: "high" },
      { label: "two-fold MAGs: days 6-10", key: "low" }, { label: "two-fold MAGs: change (%)", key: "pct" }, { label: "interval 5%", key: "lo" }, { label: "interval 95%", key: "hi" }] }],
  fig8: [{ file: "fig8_traits", title: "", rows: D.traits_heat.rows,
    cols: [{ label: "feature", key: "feature" }, { label: "area", key: "area" }, { label: "q", key: "q" }, ...D.traits_heat.mags.map((mg, j) => ({ label: mg, get: (r) => r.values[j] }))] }],
  fig6: [{ file: "fig6_families", title: "", rows: D.families,
    cols: [{ label: "family", key: "family" }, { label: "substrate group", key: "category" }, { label: "days 1-5 (per 1,000 genes)", key: "high" }, { label: "days 6-10", key: "low" },
      { label: "fold change", key: "ratio" }, { label: "MAG adding most", key: "top_mag" }, { label: "its contribution", key: "top_value" }, ...dayCols((r, j) => r.days[j]).map((c) => ({ ...c, label: `log2 ${c.label} / days 1-5` }))] }],
};

// --- supplementary tables: {title, note, file, cols (label, key, num?, fmt?), rows}
const SUPP = [
  { title: "Inputs used", note: "Every input table of the analysis, what it holds and its number of rows. Not available: food records, a sample before day 1, replicate extractions or sequencing, RNA, protein, metabolite or cell-count data.", file: "S1_inputs",
    rows: D.inventory, cols: [{ key: "file", label: "File" }, { key: "what", label: "What it holds" }, { key: "rows", label: "Rows", num: true, fmt: String }] },
  { title: "Sequencing depth and binned share per sample", note: "Reads and bases after filtering (Q ≥ 10, ≥ 1,000 bp) and trimming, read N50, percent of the bases on MAGs, PCoA axis 1 and MAGs with at least 0.01% of the bases.", file: "S2_depth",
    rows: D.depth, cols: [{ key: "day", label: "Day", num: true, fmt: String }, { key: "sample", label: "Sample" }, { key: "reads", label: "Reads", num: true, fmt: (v) => v.toLocaleString("en-US") },
      { key: "gbp", label: "Gbp", num: true, fmt: f(2) }, { key: "n50", label: "Read N50 (bp)", num: true, fmt: (v) => v.toLocaleString("en-US") }, { key: "binned", label: "Binned (% of bases)", num: true, fmt: f(1) },
      { key: "axis1", label: "PCoA axis 1", num: true, fmt: f(3) }, { key: "mags_present", label: "MAGs ≥ 0.01%", num: true, fmt: String }] },
  { title: "Phylum shares per period", note: "Mean percent of the day's bases per period, the difference (percentage points, days 6-10 minus days 1-5) and its interval.", file: "S3_phyla",
    rows: D.phyla_tab, cols: [{ key: "name", label: "Phylum" }, { key: "high", label: "Days 1-5 (%)", num: true, fmt: f(2) }, { key: "low", label: "Days 6-10 (%)", num: true, fmt: f(2) },
      { key: "diff", label: "Difference (points)", num: true, fmt: f(2) }, { key: "lo", label: "Interval 5%", num: true, fmt: f(2) }, { key: "hi", label: "Interval 95%", num: true, fmt: f(2) }] },
  { title: `The ${N.mags_considered} MAGs with a mean share of at least 0.1%`, note: "Quality (CheckM2), mean share per period (% of a day's bases), log2 change with its interval, change in centred log-ratio, whether it stays two-fold in all leave-one-day-out runs, best split, R² of a step at the switch and of a line, separation (of 5) and the fit class. Click a row to show the MAG in Fig. 3.", file: "S4_mags", id: "g2Table",
    rows: D.mags, cols: [{ key: "name", label: "MAG" }, { key: "phylum", label: "Phylum" }, { key: "quality", label: "Quality" }, { key: "completeness", label: "Completeness (%)", num: true, fmt: f(1) },
      { key: "contamination", label: "Contamination (%)", num: true, fmt: f(2) }, { key: "size_mb", label: "Size (Mbp)", num: true, fmt: f(2) },
      { key: "high", label: "Days 1-5 (%)", num: true, fmt: f(3) }, { key: "low", label: "Days 6-10 (%)", num: true, fmt: f(3) },
      { key: "log2", label: "log2 change", num: true, fmt: f(2) }, { key: "lo", label: "Interval 5%", num: true, fmt: f(2) }, { key: "hi", label: "Interval 95%", num: true, fmt: f(2) },
      { key: "clr", label: "CLR change", num: true, fmt: f(2) }, { key: "stays", label: "Two-fold and ≥ 0.1% in all leave-one-out runs", fmt: (v, r) => (!r.big ? "–" : v ? "yes" : "no") },
      { key: "best", label: "Best split", num: true, fmt: (v) => SPLITS[v - 1] },
      { key: "r2_switch", label: "R² step at 5|6", num: true, fmt: fmtR }, { key: "r2_line", label: "R² line", num: true, fmt: fmtR },
      { key: "sep", label: "Separation (of 5)", num: true, fmt: String }, { key: "fit", label: "Fit" }], sortKey: "log2", filter: true },
  { title: "Community CAZyme potential per substrate group", note: "Degrading CAZyme genes per 1,000 genes of the binned community (mean of the five days), % change with its interval, range over the leave-one-day-out runs, and the % change with high-quality MAGs only.", file: "S5_cazyme_groups",
    rows: D.cz_tab, cols: [{ key: "name", label: "Substrate group" }, { key: "high", label: "Days 1-5", num: true, fmt: f(2) }, { key: "low", label: "Days 6-10", num: true, fmt: f(2) },
      { key: "pct", label: "Change (%)", num: true, fmt: f(1) }, { key: "lo", label: "Interval 5%", num: true, fmt: f(1) }, { key: "hi", label: "Interval 95%", num: true, fmt: f(1) },
      { key: "lodo_min", label: "Leave-one-out min (%)", num: true, fmt: f(1) }, { key: "lodo_max", label: "Leave-one-out max (%)", num: true, fmt: f(1) }, { key: "hq", label: "HQ only (%)", num: true, fmt: f(1) }] },
  { title: "Contributions to the CAZyme change by phylum", note: "Sum of the MAG contributions per phylum (genes per 1,000 genes); each column adds up to the change at the period-mean shares.", file: "S6_phylum_contributions",
    rows: D.ph_contrib.rows.map((r) => Object.fromEntries([["phylum", r.phylum], ...D.ph_contrib.cats.map((c, k) => [c, r.values[k]])])),
    cols: [{ key: "phylum", label: "Phylum" }, ...D.ph_contrib.cats.map((c, k) => ({ key: c, label: D.ph_contrib.names[k], num: true, fmt: f(3) }))] },
  { title: `All ${N.fam_kept} CAZy families with at least ${N.fam_min} genes per 1,000 genes (exploratory)`, note: "Genes per 1,000 genes per period, plain fold change with its interval, and the MAG that adds most to the change.", file: "S7_families",
    rows: D.fam_all, cols: [{ key: "family", label: "Family" }, { key: "category", label: "Substrate group" }, { key: "high", label: "Days 1-5", num: true, fmt: f(3) }, { key: "low", label: "Days 6-10", num: true, fmt: f(3) },
      { key: "ratio", label: "Fold change", num: true, fmt: f(2) }, { key: "lo", label: "Interval 5%", num: true, fmt: f(2) }, { key: "hi", label: "Interval 95%", num: true, fmt: f(2) },
      { key: "top_mag", label: "MAG adding most" }, { key: "top_value", label: "Its contribution", num: true, fmt: f(3) }], sortKey: "ratio" },
  { title: "Cut-off sensitivity", note: `MAGs followed and changed for each pseudocount, mean-share cut-off and fold-change cut-off (${N.s_cells} settings), and where the changed MAGs have their best split.`, file: "S8_cutoffs",
    rows: D.sens, cols: [{ key: "pseudo", label: "Pseudocount (%)", num: true, fmt: String }, { key: "min_mean", label: "Mean ≥ (%)", num: true, fmt: String }, { key: "fold", label: "Fold ≥", num: true, fmt: String },
      { key: "mags", label: "MAGs followed", num: true, fmt: String }, { key: "down", label: "Down", num: true, fmt: String }, { key: "up", label: "Up", num: true, fmt: String },
      { key: "at_switch", label: "Best split 5|6", num: true, fmt: String }, { key: "later", label: "Later", num: true, fmt: String }, { key: "earlier", label: "Earlier", num: true, fmt: String }], sortable: false },
  { title: "Leave one day out", note: "Each day removed once: Bray-Curtis within and between the periods, two-fold MAGs, how many of the main two-fold MAGs stay two-fold, and the CAZyme % changes.", file: "S9_leave_one_day_out",
    rows: D.lodo, cols: [{ key: "day", label: "Day left out", num: true, fmt: String }, { key: "bc_w1", label: "BC within 1-5", num: true, fmt: f(3) }, { key: "bc_w2", label: "BC within 6-10", num: true, fmt: f(3) },
      { key: "bc_b", label: "BC between", num: true, fmt: f(3) }, { key: "mags", label: "MAGs followed", num: true, fmt: String }, { key: "down", label: "Down", num: true, fmt: String }, { key: "up", label: "Up", num: true, fmt: String },
      { key: "kept_of_big", label: `Of the ${N.big} still two-fold`, num: true, fmt: String }, { key: "cz_all", label: "CAZyme all (%)", num: true, fmt: f(1) },
      { key: "cz_host_glycan", label: "Host glycan (%)", num: true, fmt: f(1) }, { key: "cz_plant_fibre", label: "Plant fibre (%)", num: true, fmt: f(1) }], sortable: false },
  { title: "MAG quality: all MAGs against high-quality MAGs only", note: "The main contrasts with all MAGs (HQ and MQ) and with HQ MAGs only.", file: "S10_quality",
    rows: D.quality, cols: [{ key: "setting", label: "MAGs used" }, { key: "mags", label: "MAGs", num: true, fmt: String }, { key: "followed", label: "Mean ≥ 0.1%", num: true, fmt: String },
      { key: "down", label: "Down", num: true, fmt: String }, { key: "up", label: "Up", num: true, fmt: String }, { key: "bc_w1", label: "BC within 1-5", num: true, fmt: f(3) },
      { key: "bc_w2", label: "BC within 6-10", num: true, fmt: f(3) }, { key: "bc_b", label: "BC between", num: true, fmt: f(3) }, { key: "cz_all", label: "CAZyme all (%)", num: true, fmt: f(1) },
      { key: "cz_starch", label: "Starch (%)", num: true, fmt: f(1) }, { key: "cz_fructan", label: "Fructan (%)", num: true, fmt: f(1) }, { key: "cz_plant_fibre", label: "Plant fibre (%)", num: true, fmt: f(1) },
      { key: "cz_host_glycan", label: "Host glycan (%)", num: true, fmt: f(1) }], sortable: false },
  { title: `CAZyme potential of the ${N.big} two-fold MAGs`, note: "Degrading CAZyme genes per 1,000 genes with only the two-fold MAGs weighted (each MAG by its share of the DNA times its number of genes): mean of days 1-5 and 6-10, % change with its day-resampling interval, and the % change of the whole community for comparison.", file: "S11_cazyme_two_fold_mags",
    rows: D.cz35, cols: [{ key: "name", label: "Substrate group" }, { key: "high", label: "Days 1-5", num: true, fmt: f(2) }, { key: "low", label: "Days 6-10", num: true, fmt: f(2) },
      { key: "pct", label: "Change (%)", num: true, fmt: f(1) }, { key: "lo", label: "Interval 5%", num: true, fmt: f(1) }, { key: "hi", label: "Interval 95%", num: true, fmt: f(1) },
      { key: "all_pct", label: "All MAGs (%)", num: true, fmt: f(1) }], sortable: false },
  { title: `Risers against fallers: the ${N.q3_cur} curated features and the ${N.q3_names_hits} candidate gene names (exploratory)`, note: `Curated features (the primary set, its own false discovery rate) and the single Bakta gene names with q < ${N.q_max} in their own screen of ${N.q3_names} names; each feature present in at least four of the ${N.big} MAGs. Risers / fallers: MAGs with the feature (present/absent features) or median genes per 1,000 genes (other features; mean in brackets columns). Effect: share of risers minus share of fallers with the feature, or median difference. p: Fisher's exact or Wilcoxon rank-sum test; q: Benjamini-Hochberg false discovery rate within its set (curated or gene name); p Bacillota: the same test on the Bacillota only (${N.q3_fall} fallers, ${N.q3_bac_rise} risers), for features with q < ${N.q_max}. Single Bakta gene names often differ between lineages for the same gene, so many name differences reflect taxonomy (Results).`, file: "S12_riser_faller_features",
    rows: D.traits, cols: [{ key: "area", label: "Area" }, { key: "source", label: "Feature type" }, { key: "cls", label: "Name class" }, { key: "feature", label: "Feature" },
      { key: "set", label: "Set" }, { key: "rise", label: `Risers (${N.q3_rise})` }, { key: "fall", label: `Fallers (${N.q3_fall})` }, { key: "rise_mean", label: "Risers mean", num: true, fmt: (v) => (v === null ? "–" : v.toFixed(2)) },
      { key: "fall_mean", label: "Fallers mean", num: true, fmt: (v) => (v === null ? "–" : v.toFixed(2)) }, { key: "effect", label: "Effect", num: true, fmt: f(2) },
      { key: "p", label: "p", num: true, fmt: (v) => v.toPrecision(2) }, { key: "q", label: "q", num: true, fmt: (v) => v.toPrecision(2) },
      { key: "p_bac", label: "p Bacillota", num: true, fmt: (v) => (v === null ? "–" : v.toPrecision(2)) }], sortKey: "q", sortDesc: false, filter: true, maxRows: 50 },
];

function buildSupp() {
  const host = $("g2SuppList");
  host.innerHTML = SUPP.map((s, i) => `<details class="g2supp" data-i="${i}"><summary><b>Supplementary Table ${i + 1} |</b> ${esc(s.title)}</summary>` +
    `<p class="note">${esc(s.note)}</p><p class="dl" id="g2SuppDl${i}"></p><div id="${s.id || `g2Supp${i}`}"></div></details>`).join("");
  SUPP.forEach((s, i) => {
    const cols = s.cols.map((c) => ({ label: c.label, key: c.key }));
    dlLinks($(`g2SuppDl${i}`), [{ file: s.file, title: "", cols, rows: s.rows }], "Download");
  });
  // tables are drawn when opened (they need the width), and kept
  host.addEventListener("toggle", (ev) => {
    const d = ev.target;
    if (!d.open || d.dataset.drawn) return;
    const s = SUPP[+d.dataset.i];
    d.dataset.drawn = "1";
    table($(s.id || `g2Supp${d.dataset.i}`), { columns: s.cols, rows: s.rows, filter: !!s.filter, sortKey: s.sortKey, maxRows: s.maxRows || 15, sortable: s.sortable });
  }, true);
}

// Fig. 7: CAZyme change, whole community against the two-fold MAGs only
// horizontal bars, two per substrate group, with the day-resampling interval of the two-fold MAGs as a whisker
function drawFig7() {
  const host = $("g2Cz35"), rows = D.cz35.filter((r) => r.cat !== "unmapped");
  mountChart(host, () => {
    const rowH = 34, top = 8, bottom = 40;
    const { svg, W } = newSvg(host, top + rows.length * rowH + bottom);
    const labW = Math.min(150, W * 0.34), box = { l: labW, r: W - 14, t: top, b: top + rows.length * rowH };
    const vals = rows.flatMap((r) => [r.all_pct, r.pct, r.lo, r.hi, 0]);
    const x = scale(Math.min(...vals) - 3, Math.max(...vals) + 3, box.l, box.r);
    axes(svg, x, () => 0, box, { xLabel: "Change from days 1-5 to days 6-10 (%)", xTicks: x.ticks(6), yTicks: [] });
    el("line", { x1: x(0), x2: x(0), y1: box.t, y2: box.b, class: "base" }, svg);
    rows.forEach((r, i) => {
      const y0 = top + i * rowH;
      el("text", { x: labW - 6, y: y0 + rowH / 2 + 4, "text-anchor": "end" }, svg).textContent = r.name;
      [[r.all_pct, catColor(0), "All MAGs"], [r.pct, catColor(1), `The ${N.big} two-fold MAGs`]].forEach(([v, c, nm], k) => {
        const yy = y0 + 5 + k * 12;
        const b = el("rect", { x: Math.min(x(0), x(v)), y: yy, width: Math.abs(x(v) - x(0)), height: 10, rx: 2, style: `fill:${c}` }, svg);
        tipOn(b, `<b>${esc(r.name)}</b> · ${esc(nm)}<br>${v.toFixed(1)}%` + (k ? `<br>interval ${r.lo.toFixed(1)} to ${r.hi.toFixed(1)}%` : ""));
        if (k) {
          el("line", { x1: x(r.lo), x2: x(r.hi), y1: yy + 5, y2: yy + 5, style: "stroke:var(--ink);stroke-width:1.4" }, svg);
          for (const e of [r.lo, r.hi]) el("line", { x1: x(e), x2: x(e), y1: yy + 1, y2: yy + 9, style: "stroke:var(--ink);stroke-width:1.4" }, svg);
        }
      });
    });
    chartLegend(host, [{ name: "All MAGs (Fig. 5)", color: catColor(0) }, { name: `The ${N.big} two-fold MAGs, with day-resampling interval`, color: catColor(1) }]);
  });
}

// Fig. 8: curated features with q < 0.1, fallers then risers (short labels: genus and MAG id)
const shortMag = (s) => { const w = s.split(" "); return `${w[0]} ${w[1]} ${w[w.length - 1]}`; };
const shortFeat = (f) => f.replace(/ \(per 1,000 genes\)$/, "").replace(/^CAZy family (.+)$/, "$1 (CAZy family)").replace(/^CAZyme genes: (.+)$/, "$1 CAZyme genes").split(":")[0].replace("Sugar phosphotransferase system (PTS)", "PTS sugar uptake").replace("SusC/SusD outer-membrane glycan uptake", "SusC/SusD glycan uptake");
function drawFig8() {
  for (const b of $("g2F8Tabs").querySelectorAll("button")) b.setAttribute("aria-selected", b.dataset.v === st.f8);
  const rows = D.traits_heat.rows.filter((r) => r.area === st.f8);
  // a blank column separates the fallers from the risers
  const gap = D.traits_heat.mags.findIndex((mg) => mg.startsWith("↑"));
  const ins = (a, v) => [...a.slice(0, gap), v, ...a.slice(gap)];
  heatmap($("g2Traits"), { rows: rows.map((r) => `${shortFeat(r.feature)} · q ${r.q}`), cols: ins(D.traits_heat.mags.map(shortMag), " "), values: rows.map((r) => ins(r.scaled, null)),
    cell: 18, colLabelHeight: 150, min: 0, max: 1, label: "Relative to the row maximum (markers: 1 = present)", format: (v) => (v === null ? "–" : v.toFixed(2)) });
}

function drawAll() { drawFig1(); drawFig2(); magOptions(); drawFig3(); drawFig4(); catOptions(); drawFig5(); drawFig6(); drawFig7(); drawFig8(); }

$("g2SensPseudo").innerHTML = [...new Set(D.sens.map((r) => r.pseudo))].map((p) => `<option value="${p}"${p === st.pseudo ? " selected" : ""}>${p}%</option>`).join("");
$("g2F1Tabs").addEventListener("click", (ev) => { const b = ev.target.closest("button[data-v]"); if (b) { st.fig1 = b.dataset.v; drawFig1(); } });
$("g2F8Tabs").addEventListener("click", (ev) => { const b = ev.target.closest("button[data-v]"); if (b) { st.f8 = b.dataset.v; drawFig8(); } });
$("g2F1Mag").innerHTML = `<option value="">none</option>` + D.top_mags.map((m) => `<option value="${esc(m.name)}">${esc(m.name)}</option>`).join("");
$("g2F1Mag").addEventListener("change", (ev) => { st.f1mag = ev.target.value; drawFig1(); });
$("g2F5Tabs").addEventListener("click", (ev) => { const b = ev.target.closest("button[data-v]"); if (b) { st.f5 = b.dataset.v; drawFig5(); } });
$("g2Mag").addEventListener("change", (ev) => { st.mag = ev.target.value; drawFig3(); });
$("g2Big").addEventListener("change", (ev) => { st.big = ev.target.checked; magOptions(); drawFig3(); });
$("g2Cat").addEventListener("change", (ev) => { st.cat = ev.target.value; drawFig5(); });
$("g2ForestKind").addEventListener("change", (ev) => { st.forest = ev.target.value; drawFig4(); });
$("g2SensPseudo").addEventListener("change", (ev) => { st.pseudo = +ev.target.value; drawFig4(); });
$("g2SensVal").addEventListener("change", (ev) => { st.sensVal = ev.target.value; drawFig4(); });

buildSupp();
for (const host of document.querySelectorAll("[data-dl]")) dlLinks(host, SOURCES[host.dataset.dl]);
$("g2Table").addEventListener("click", (ev) => {
  const tr = ev.target.closest("tbody tr");
  if (!tr) return;
  const name = tr.querySelector("td")?.textContent;
  const m = D.mags.find((x) => x.name === name);
  if (m) { st.mag = m.mag; if (st.big && !m.big) st.big = false; magOptions(); drawFig3(); $("g2Mag").scrollIntoView({ block: "center", behavior: "smooth" }); }
});

drawAll();
