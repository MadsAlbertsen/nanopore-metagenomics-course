// Group 6: how much of the sequenced data does the assembly represent? DATA from np26 scripts/46_project_group6.py:
// numbers (every number in the text), days, samples (one row per sample: full data asm / mag / unbinned / off in % of
// the filtered bases; read sample k_* = filtered reads, a_* = all sequenced reads: reads, bases, reads_pct,
// reads_mag_pct, asm_pct / mag_pct with bootstrap intervals *_lo / *_hi).
const D = DATA, N = D.numbers, S = D.samples;
// counts as integers; every other number keeps at least one decimal (76.0, not 76, next to 84.2)
const INT = new Set(["mags", "contigs", "contigs_binned", "samples", "rs_raw_per_sample", "rs_reads", "rs_kept_reads", "rs_kept_min", "rs_kept_max", "boot", "min_q", "min_len", "rs_longest_kb", "rs_longest_aligned_pct"]);
const num = (v, k) => {
  if (typeof v !== "number") return String(v);
  if (INT.has(k)) return v.toLocaleString("en-US");
  const d = Math.max(1, (String(v).split(".")[1] || "").length);
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
};
const st = { rs: true, set: "k", zoom: false };
const SETNAME = { k: "filtered reads", a: "all sequenced reads" };

function fillNumbers() {
  document.querySelectorAll("[data-n]").forEach((e) => {
    const k = e.dataset.n;
    e.textContent = k in N ? num(N[k], k) : "?";
  });
}
function stats() {
  const items = [[num(N.asm_pooled, "") + "%", "of the filtered bases on the assembly"], [num(N.mag_pooled, "") + "%", "on the " + N.mags + " MAGs"],
    [num(N.binned_length_pct, "") + "%", "of the assembly's length in MAGs"], [num(N.total_gbp, "") + " Gbp", "filtered bases, ten samples"]];
  $("pjStats").innerHTML = items.map(([n, t]) => `<div class="stat"><b>${esc(String(n))}</b><span>${esc(t)}</span></div>`).join("");
}

// --- Figure 1: points per sample (custom: the chart kit has no categorical point chart with intervals)
function drawFig() {
  const host = $("g6Fig");
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 340);
    const box = { l: 56, r: W - 12, t: 22, b: H - 50 };
    const n = S.length, band = (box.r - box.l) / n;
    const xc = (i) => box.l + band * (i + 0.5);
    const y0 = st.zoom ? 60 : 0;
    const y = scale(y0, 100, box.b, box.t);
    axes(svg, () => 0, y, box, { yLabel: "Share of the sample's bases (%)", xTicks: [], yTicks: y.ticks(st.zoom ? 4 : 5) });
    // high-carbohydrate days shaded, diet switch dashed
    const hi = S.filter((s) => s.diet === "high_carb").length;
    el("rect", { x: box.l, width: band * hi, y: box.t, height: box.b - box.t, class: "band" }, svg);
    el("text", { x: box.l + (band * hi) / 2, y: box.t - 8, "text-anchor": "middle", class: "note" }, svg).textContent = band < 46 ? "high carb" : "high carbohydrate";
    el("text", { x: box.l + band * (hi + (n - hi) / 2), y: box.t - 8, "text-anchor": "middle", class: "note" }, svg).textContent = band < 46 ? "low carb" : "low carbohydrate";
    el("line", { x1: box.l + band * hi, x2: box.l + band * hi, y1: box.t, y2: box.b, class: "mark" }, svg);
    const small = band < 46;
    S.forEach((s, i) => {
      el("text", { x: xc(i), y: box.b + 16, "text-anchor": "middle" }, svg).textContent = small ? String(s.day) : s.sample;
      el("text", { x: xc(i), y: box.b + 30, "text-anchor": "middle", class: "note" }, svg).textContent = small ? "" : "day " + s.day;
    });
    if (small) el("text", { x: (box.l + box.r) / 2, y: box.b + 34, "text-anchor": "middle", class: "lab" }, svg).textContent = "Day (sample DNA01-DNA10)";
    const series = [["asm", "Assembly (all contigs)", "var(--c1)"], ["mag", "Bins (MAGs)", "var(--c2)"]];
    const off = st.rs ? Math.min(9, band * 0.18) : 0;
    const p = st.set;
    S.forEach((s, i) => {
      for (const [k, name, color] of series) {
        const v = s[k];
        const c = el("circle", { cx: xc(i) - off, cy: y(v), r: 5, style: `fill:${color}`, class: "dot" }, svg);
        tipOn(c, `<b>${esc(s.sample)} · day ${s.day}</b><br>${esc(name)}, all filtered reads (full data):<br>${v.toFixed(2)}% of ${s.gbp} Gbp`);
        if (!st.rs) continue;
        const rv = s[`${p}_${k}_pct`], lo = s[`${p}_${k}_lo`], hiv = s[`${p}_${k}_hi`];
        if (lo >= y0) el("line", { x1: xc(i) + off, x2: xc(i) + off, y1: y(Math.max(lo, y0)), y2: y(hiv), style: `stroke:${color}`, "stroke-width": 1.5 }, svg);
        if (rv < y0) continue;
        const o = el("circle", { cx: xc(i) + off, cy: y(rv), r: 4.5, style: `stroke:${color};fill:var(--surface)`, "stroke-width": 2, class: "dot" }, svg);
        tipOn(o, `<b>${esc(s.sample)} · day ${s.day}</b><br>${esc(name)}, read sample (${esc(SETNAME[p])}, ${num(s[p + "_reads"], "rs_reads")} reads):<br>${rv.toFixed(2)}% of the bases (95% interval ${lo.toFixed(1)}-${hiv.toFixed(1)}%)`);
      }
    });
    const leg = chartLegend(host, series.map(([, name, color]) => ({ name, color })));
    if (st.rs) leg.insertAdjacentHTML("beforeend", `<span>filled: full data · open with bar: read sample (${esc(SETNAME[p])}), 95% interval</span>`);
  });
}

// --- Figure 2: reads vs bases (all sequenced reads, read sample)
function drawUnits() {
  barChart($("g6Units"), {
    labels: S.map((s) => s.sample),
    groups: [{ name: "share of reads", values: S.map((s) => s.a_reads_pct) }, { name: "share of bases", values: S.map((s) => s.a_asm_pct) }],
    yLabel: "Aligned to the assembly (%)", unit: "%",
  });
}

function drawTable() {
  const f2 = (v) => (v === null ? "–" : v.toFixed(1));
  table($("g6Table"), {
    columns: [
      { key: "sample", label: "Sample" }, { key: "day", label: "Day", num: true, fmt: String },
      { key: "reads_m", label: "Reads (M)", num: true, fmt: (v) => v.toFixed(2) }, { key: "gbp", label: "Gbp", num: true, fmt: (v) => v.toFixed(2) },
      { key: "asm", label: "Assembly %", num: true, fmt: f2 }, { key: "mag", label: "MAGs %", num: true, fmt: f2 },
      { key: "unbinned", label: "Unbinned contigs %", num: true, fmt: f2 }, { key: "off", label: "No contig %", num: true, fmt: f2 },
      { key: "k_reads", label: "Sample: filtered reads", num: true }, { key: "k_reads_pct", label: "reads aligned %", num: true, fmt: f2 },
      { key: "k_asm_pct", label: "bases on assembly %", num: true, fmt: f2 }, { key: "k_mag_pct", label: "bases on MAGs %", num: true, fmt: f2 },
      { key: "a_reads", label: "Sample: all reads", num: true }, { key: "a_reads_pct", label: "reads aligned %", num: true, fmt: f2 },
      { key: "a_asm_pct", label: "bases on assembly %", num: true, fmt: f2 }, { key: "a_mag_pct", label: "bases on MAGs %", num: true, fmt: f2 },
    ],
    rows: S, sortKey: "day", sortDesc: false,
  });
}

function write() { writeHashParams({ rs: st.rs ? null : 0, set: st.set === "k" ? null : st.set, zoom: st.zoom ? 1 : null }); }
(function start() {
  const h = readHashParams();
  if (h.rs === "0") st.rs = false;
  if (h.set === "a") st.set = "a";
  if (h.zoom === "1") st.zoom = true;
  $("g6Rs").checked = st.rs; $("g6Set").value = st.set; $("g6Zoom").checked = st.zoom; $("g6Set").disabled = !st.rs;
  $("g6Rs").addEventListener("change", (e) => { st.rs = e.target.checked; $("g6Set").disabled = !st.rs; drawFig(); write(); });
  $("g6Set").addEventListener("change", (e) => { st.set = e.target.value; drawFig(); write(); });
  $("g6Zoom").addEventListener("change", (e) => { st.zoom = e.target.checked; drawFig(); write(); });
  fillNumbers();
  stats();
  drawFig();
  drawUnits();
  drawTable();
})();
