// Group 2: community and CAZyme potential over the ten days. Every number from DATA (np26 scripts/42_project_group2.py).
const D = DATA;
const N = D.numbers;
const st = { fig1: "phyla", mag: D.default_mag, cat: "all", big: false };
const SPLITS = D.days.slice(0, -1).map((d) => `${d}|${d + 1}`);
const PHYLA = D.phyla.map((p) => p.name);
const phylumColor = (p) => `var(--c${(PHYLA.includes(p) ? PHYLA.indexOf(p) : PHYLA.indexOf("Other phyla")) + 1})`;
const byMag = Object.fromEntries(D.mags.map((m) => [m.mag, m]));
const catName = (c) => D.cazy.names[D.cazy.cats.indexOf(c)];
const fmtR = (v) => v.toFixed(2);

// numbers in the text: <span data-n="key" data-d="decimals"> filled from DATA.numbers
function numText(key, d) {
  const v = N[key];
  if (v === undefined) return "?";
  return d !== undefined ? Number(v).toFixed(+d) : String(v);
}
document.querySelectorAll("[data-n]").forEach((s) => { s.textContent = numText(s.dataset.n, s.dataset.d); });

function stats() {
  const items = [[D.days.length, "daily samples, one person"], [N.mags_considered, "MAGs followed (mean ≥ 0.1%)"],
    [N.bc_between, "Bray-Curtis between the periods"], [`${N.down2} / ${N.up2}`, "MAGs ≥ 2-fold down / up"],
    [`${N.cz_all_pct}%`, "change in CAZyme genes per 1,000 genes"]];
  $("g2Stats").innerHTML = items.map(([n, t]) => `<div class="stat"><b>${esc(String(n))}</b><span>${esc(t)}</span></div>`).join("");
}

const SWITCH = [{ x: 5.5, label: "diet switch" }];

function drawFig1() {
  for (const b of $("g2F1Tabs").querySelectorAll("button")) b.setAttribute("aria-selected", b.dataset.v === st.fig1);
  if (st.fig1 === "phyla") {
    lineChart($("g2F1"), { x: D.days, series: D.phyla.map((p) => ({ name: p.name, values: p.values })), xLabel: "Day", xName: "Day",
      yLabel: "Share of the day's bases (%)", unit: "%", marks: SWITCH });
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
  const list = D.mags.filter((m) => !st.big || Math.abs(m.log2) >= 1);
  if (!list.some((m) => m.mag === st.mag)) st.mag = list[0].mag;
  $("g2Mag").innerHTML = list.map((m) => `<option value="${esc(m.mag)}"${m.mag === st.mag ? " selected" : ""}>${esc(m.name)} · ${m.mean.toFixed(2)}%</option>`).join("");
  $("g2Big").checked = st.big;
}

function drawFig3() {
  const m = byMag[st.mag];
  $("g2Mag").value = m.mag;
  const dir = m.log2 >= 0 ? "above" : "below";
  const fit = m.fit === "step" ? "a step at the switch fits better than a straight line" : m.fit === "trend" ? "a straight line fits better than a step at the switch" : "it changed less than two-fold, so it is not classed";
  $("g2MagSum").innerHTML = `<b>${esc(m.name)}</b> (${esc(m.phylum)}, ${esc(m.quality)}): mean ${m.high.toFixed(2)}% in days 1-5, ${m.low.toFixed(2)}% in days 6-10, log2 change ${m.log2.toFixed(2)}. ` +
    `Best split ${SPLITS[m.best - 1]} (R² ${fmtR(m.r2_best)}); step at the switch R² ${fmtR(m.r2_switch)}, straight line R² ${fmtR(m.r2_line)}: ${fit}. ` +
    `${m.sep} of 5 low-carbohydrate days lie ${dir} all five high-carbohydrate days.`;
  lineChart($("g2MagLine"), { x: D.days, series: [{ name: m.name, values: m.share }], xLabel: "Day", xName: "Day",
    yLabel: "Share of the day's bases (%)", unit: "%", marks: SWITCH, zero: true });
  const colors = SPLITS.map((s, i) => (i === 4 ? "var(--c2)" : i === m.best - 1 ? "var(--c1)" : "var(--v4)"));
  barChart($("g2Splits"), { labels: SPLITS, values: m.splits, yLabel: "R² of a step at this split", colors, fmt: (v) => v.toFixed(2) });
  barChart($("g2SplitCounts"), { labels: SPLITS, groups: [{ name: "MAGs that rose ≥ 2-fold", values: D.split_counts.rise }, { name: "MAGs that fell ≥ 2-fold", values: D.split_counts.fall }],
    yLabel: "MAGs with their best split here", unit: "MAGs", height: 240, fmt: (v) => String(Math.round(v)) });
}

function catOptions() {
  $("g2Cat").innerHTML = D.cazy.cats.map((c, i) => `<option value="${c}"${c === st.cat ? " selected" : ""}>${esc(D.cazy.names[i])}</option>`).join("");
}

function drawFig4() {
  $("g2Cat").value = st.cat;
  lineChart($("g2CzLine"), { x: D.days, series: [{ name: catName(st.cat), values: D.cazy.per_day[st.cat] }], xLabel: "Day", xName: "Day",
    yLabel: "Genes per 1,000 genes", unit: "per 1,000 genes", marks: SWITCH, zero: true });
  const top = D.cazy.top[st.cat];
  const host = $("g2CzBar");
  barChart(host, { labels: top.map((t) => t.name), values: top.map((t) => t.value), horizontal: true, colors: top.map((t) => phylumColor(t.phylum)),
    yLabel: "Contribution to the change (genes per 1,000 genes)", fmt: (v) => v.toFixed(2) });
  const seen = [...new Set(top.map((t) => (PHYLA.includes(t.phylum) ? t.phylum : "Other phyla")))];
  chartLegend(host, seen.map((p) => ({ name: p, color: phylumColor(p) })));
}

function drawTable() {
  table($("g2Table"), {
    columns: [{ key: "name", label: "MAG" }, { key: "phylum", label: "Phylum" },
      { key: "high", label: "Days 1-5 (%)", num: true, fmt: (v) => v.toFixed(3) }, { key: "low", label: "Days 6-10 (%)", num: true, fmt: (v) => v.toFixed(3) },
      { key: "log2", label: "log2 change", num: true, fmt: (v) => v.toFixed(2) }, { key: "best", label: "Best split", num: true, fmt: (v) => SPLITS[v - 1] },
      { key: "r2_switch", label: "R² step at 5|6", num: true, fmt: fmtR }, { key: "r2_line", label: "R² line", num: true, fmt: fmtR },
      { key: "sep", label: "Separation (of 5)", num: true, fmt: (v) => String(v) }, { key: "fit", label: "Fit" }],
    rows: D.mags, filter: true, sortKey: "log2", maxRows: 15,
  });
}

function drawFig5() {
  const F = D.families;
  heatmap($("g2FamHeat"), { rows: F.map((f) => `${f.family} (${f.category.toLowerCase()})`), cols: D.days.map((d) => `Day ${d}`),
    values: F.map((f) => f.days), label: "log2 of the day over the days 1-5 mean", diverging: true, format: (v) => (v === null ? "–" : v.toFixed(2)) });
  table($("g2FamTable"), {
    columns: [{ key: "family", label: "Family" }, { key: "category", label: "Substrate group" },
      { key: "high", label: "Days 1-5 (per 1,000 genes)", num: true, fmt: (v) => v.toFixed(2) },
      { key: "low", label: "Days 6-10 (per 1,000 genes)", num: true, fmt: (v) => v.toFixed(2) },
      { key: "ratio", label: "Fold change (6-10 / 1-5)", num: true, fmt: (v) => v.toFixed(2) },
      { key: "top_mag", label: "MAG adding most" }, { key: "top_value", label: "Its contribution", num: true, fmt: (v) => v.toFixed(3) }],
    rows: F, sortKey: "ratio", maxRows: 20,
  });
}

function drawAll() { drawFig1(); drawFig2(); magOptions(); drawFig3(); catOptions(); drawFig4(); drawFig5(); drawTable(); }

$("g2F1Tabs").addEventListener("click", (ev) => { const b = ev.target.closest("button[data-v]"); if (b) { st.fig1 = b.dataset.v; drawFig1(); } });
$("g2Mag").addEventListener("change", (ev) => { st.mag = ev.target.value; drawFig3(); });
$("g2Big").addEventListener("change", (ev) => { st.big = ev.target.checked; magOptions(); drawFig3(); });
$("g2Cat").addEventListener("change", (ev) => { st.cat = ev.target.value; drawFig4(); });
$("g2Table").addEventListener("click", (ev) => {
  const tr = ev.target.closest("tbody tr");
  if (!tr) return;
  const name = tr.querySelector("td")?.textContent;
  const m = D.mags.find((x) => x.name === name);
  if (m) { st.mag = m.mag; if (st.big && Math.abs(m.log2) < 1) st.big = false; magOptions(); drawFig3(); $("g2Mag").scrollIntoView({ block: "center", behavior: "smooth" }); }
});

stats();
drawAll();
