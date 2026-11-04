// Group 2 rationale document: numbers from DATA (np26 scripts/42_project_group2.py) and the input inventory.
const N2 = DATA.numbers;
document.querySelectorAll("[data-n]").forEach((s) => {
  const v = N2[s.dataset.n];
  s.textContent = v === undefined ? "?" : s.dataset.d !== undefined ? Number(v).toFixed(+s.dataset.d) : String(v);
});
table($("m2Inv"), { columns: [{ key: "file", label: "File" }, { key: "what", label: "What it holds" }, { key: "rows", label: "Rows", num: true, fmt: String }],
  rows: DATA.inventory, sortable: false });

// 3.7 worked example of the day resampling (DATA.boot_example; np26 scripts/42_project_group2.py)
const BX = DATA.boot_example;
document.querySelectorAll("[data-bx]").forEach((s) => { s.textContent = String(BX[s.dataset.bx]); });
let bxMag = 0;
const f2 = (v) => v.toFixed(2);
const sortedDays = (days, vals, first) => days.map((d) => ({ d, v: vals[d - first] })).sort((a, b) => a.d - b.d);
function bxSteps() {
  const m = BX.mags[bxMag], sep = DATA.mags.find((x) => x.mag === m.mag).sep;
  const dh = sortedDays(m.r1_days_high, m.high, 1), dl = sortedDays(m.r1_days_low, m.low, 6);
  const missing = (ds, first) => [0, 1, 2, 3, 4].map((i) => i + first).filter((d) => !ds.some((x) => x.d === d));
  const list = (ds) => ds.map((x) => `day ${x.d} (${f2(x.v)}%)`).join(", ");
  const steps = [
    `<b>Start from the measured shares.</b> ${esc(m.name)} held ${m.high.map(f2).join(", ")}% of the bases on days 1-5 and ${m.low.map(f2).join(", ")}% on days 6-10. The period means are ${f2(m.mean_high)}% and ${f2(m.mean_low)}%, and the log2 change is log2((${f2(m.mean_low)} + 0.01) / (${f2(m.mean_high)} + 0.01)) = ${f2(m.log2)}, a ${m.fold.toFixed(1)}-fold ${m.log2 > 0 ? "rise" : "fall"}. This is the dot in Fig. 4a.`,
    `<b>Make one resampled data set.</b> Within each period, draw five days at random from that period's five days, with replacement. In the first draw, days 1-5 were drawn as ${list(dh)}, and days 6-10 as ${list(dl)}; ${[...missing(dh, 1), ...missing(dl, 6)].map((d) => "day " + d).join(", ")} were not drawn. The means of the drawn days are ${f2(m.r1_mean_high)}% and ${f2(m.r1_mean_low)}%, a log2 change of ${f2(m.r1)} (Fig. R1a).`,
    `<b>Repeat ${BX.reps} times</b> with a fixed random seed, so a rerun gives the same numbers. Ignoring the order, each period has only ${BX.distinct} different draws of five days, so the ${BX.reps} draws repeat these many times.`,
    `<b>Read off the middle 90%.</b> Sort the ${BX.reps} log2 changes; the 5th and 95th percentiles, ${f2(m.lo)} to ${f2(m.hi)}, are the line in Fig. 4a (Fig. R1b). ${m.below1_pct}% of the draws gave less than a two-fold ${m.log2 > 0 ? "rise" : "fall"} (log2 change below ${m.log2 > 0 ? 1 : -1}), and ${m.log2 > 0 ? m.below0_pct : (100 - m.below0_pct).toFixed(1)}% a change in the other direction.`,
    `<b>Leave one day out.</b> Removing each day once gives ten log2 changes from ${f2(m.lodo_min)} to ${f2(m.lodo_max)} (Fig. R1c), so the MAG ${m.stays ? "stays two-fold in all ten runs (filled dot in Fig. 4a)" : `drops below two-fold in at least one run (open dot in Fig. 4a); leaving out day ${m.lodo.indexOf(m.lodo_min) + 1} gives ${f2(m.lodo_min)}`}.`,
  ];
  if (m.lo <= 0 && m.hi >= 0) steps.push(`<b>Why this interval includes zero.</b> The rise rests on days 9 and 10 (${f2(m.low[3])} and ${f2(m.low[4])}%). A draw of five days misses both of them with a chance of (3/5)<sup>5</sup> = ${BX.p_miss_two_pct}%, and such draws give a change below zero in almost every case: ${m.below0_pct}% of the draws were below zero. This is the warning the interval is meant to give: the rise depends on two late days, and it looks more like a late rise than a step at the switch.`);
  else steps.push(`<b>How to read it.</b> ${sep === 5 ? `Each of days 6-10 had a ${m.log2 > 0 ? "higher" : "lower"} share than each of days 1-5, so whichever days are drawn, the two means stay apart` : `Most draws keep the two means apart`}; the interval excludes zero. Because the ${N2.big} MAGs were picked for a large change, an interval that excludes zero is close to built in; it says that no single day carries the change, not that the change is certain or caused by the diet.`);
  $("m2BxSteps").innerHTML = steps.map((t) => `<li>${t}</li>`).join("");
}
function bxSchema(host) {
  return mountChart(host, () => {
    const m = BX.mags[bxMag];
    const rows = [
      { lab: "Days 1-5, measured", days: [1, 2, 3, 4, 5], vals: m.high, mean: m.mean_high },
      { lab: "Days 1-5, draw 1", days: sortedDays(m.r1_days_high, m.high, 1).map((x) => x.d), vals: sortedDays(m.r1_days_high, m.high, 1).map((x) => x.v), mean: m.r1_mean_high },
      { lab: "Days 6-10, measured", days: [6, 7, 8, 9, 10], vals: m.low, mean: m.mean_low },
      { lab: "Days 6-10, draw 1", days: sortedDays(m.r1_days_low, m.low, 6).map((x) => x.d), vals: sortedDays(m.r1_days_low, m.low, 6).map((x) => x.v), mean: m.r1_mean_low },
    ];
    const rowH = 44, top = 22, gapP = 14;
    const { svg, W } = newSvg(host, top + rows.length * rowH + gapP + 46);
    const labW = W < 480 ? 74 : 130, cell = Math.min(64, (W - labW - 8) / 6.4);
    rows.forEach((r, i) => {
      const y = top + i * rowH + (i >= 2 ? gapP : 0);
      const lab = el("text", { x: 0, y: y + 17, class: "dlab" }, svg);
      if (W < 480) { lab.textContent = r.lab.split(", ")[0]; el("text", { x: 0, y: y + 31, class: "note" }, svg).textContent = r.lab.split(", ")[1]; }
      else lab.textContent = r.lab;
      r.vals.forEach((v, k) => {
        const x = labW + k * cell;
        el("rect", { x, y, width: cell - 4, height: 36, rx: 4, class: "g2box" }, svg);
        el("text", { x: x + (cell - 4) / 2, y: y + 14, "text-anchor": "middle", class: "note" }, svg).textContent = "day " + r.days[k];
        el("text", { x: x + (cell - 4) / 2, y: y + 29, "text-anchor": "middle", class: "g2val" }, svg).textContent = f2(v);
      });
      const xm = labW + 5 * cell + cell * 0.3;
      el("rect", { x: xm, y, width: cell - 4, height: 36, rx: 4, class: "g2mean" }, svg);
      el("text", { x: xm + (cell - 4) / 2, y: y + 14, "text-anchor": "middle", class: "note" }, svg).textContent = "mean";
      el("text", { x: xm + (cell - 4) / 2, y: y + 29, "text-anchor": "middle", class: "g2val" }, svg).textContent = f2(r.mean);
    });
    el("text", { x: 0, y: 12, class: "dlab" }, svg).textContent = "a";
    const yb = top + rows.length * rowH + gapP + 16;
    el("text", { x: 0, y: yb, class: "lab" }, svg).textContent = `Measured: log2((${f2(m.mean_low)} + 0.01) / (${f2(m.mean_high)} + 0.01)) = ${f2(m.log2)}`;
    el("text", { x: 0, y: yb + 18, class: "lab" }, svg).textContent = `Draw 1: log2((${f2(m.r1_mean_low)} + 0.01) / (${f2(m.r1_mean_high)} + 0.01)) = ${f2(m.r1)}`;
  });
}
function bxHist(host) {
  return mountChart(host, () => {
    const m = BX.mags[bxMag], e = BX.edges;
    const { svg, W } = newSvg(host, 230);
    const box = { l: 46, r: W - 10, t: 22, b: 180 };
    const x = scale(e[0], e[e.length - 1], box.l, box.r), ymax = Math.max(...m.hist);
    const y = scale(0, ymax * 1.08, box.b, box.t);
    axes(svg, x, y, box, { xLabel: "log2 change, days 6-10 / days 1-5", yLabel: "Draws", xTicks: x.ticks(6), yTicks: y.ticks(4) });
    m.hist.forEach((c, k) => {
      if (!c) return;
      const r = el("rect", { x: x(e[k]) + 0.5, y: y(c), width: Math.max(1, x(e[k + 1]) - x(e[k]) - 1), height: box.b - y(c), style: `fill:${catColor(0)}` }, svg);
      tipOn(r, `${f2(e[k])} to ${f2(e[k + 1])}: ${c} of ${BX.reps} draws`);
    });
    for (const t of [-1, 1]) el("line", { x1: x(t), x2: x(t), y1: box.t, y2: box.b, class: "mark" }, svg);
    for (const t of [m.lo, m.hi]) el("line", { x1: x(t), x2: x(t), y1: box.t - 6, y2: box.b, class: "g2ci" }, svg);
    el("text", { x: x(m.lo) - 4, y: box.t - 8, "text-anchor": "end", class: "note" }, svg).textContent = `5%: ${f2(m.lo)}`;
    el("text", { x: x(m.hi) + (x(m.hi) + 70 > W ? -4 : 4), y: box.t - 8, "text-anchor": x(m.hi) + 70 > W ? "end" : "start", class: "note" }, svg).textContent = `95%: ${f2(m.hi)}`;
    const d = el("circle", { cx: x(m.log2), cy: box.b, r: 5, class: "dot", style: `fill:var(--ink)` }, svg);
    tipOn(d, `Observed log2 change ${f2(m.log2)}`);
    el("text", { x: 0, y: 12, class: "dlab" }, svg).textContent = "b";
  });
}
function bxLodo(host) {
  return mountChart(host, () => {
    const m = BX.mags[bxMag];
    const { svg, W } = newSvg(host, 230);
    const box = { l: 46, r: W - 10, t: 22, b: 180 };
    const x = scale(0.5, 10.5, box.l, box.r);
    const vals = m.lodo.concat([0, 1, m.log2]);
    const y = scale(Math.min(...vals) - 0.15, Math.max(...vals) + 0.15, box.b, box.t);
    axes(svg, x, y, box, { xLabel: "Day left out", yLabel: "log2 change", xTicks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], yTicks: y.ticks(4) });
    el("line", { x1: box.l, x2: box.r, y1: y(1), y2: y(1), class: "mark" }, svg);
    m.lodo.forEach((v, k) => {
      const c = el("circle", { cx: x(k + 1), cy: y(v), r: 4.5, class: "dot", style: `fill:${catColor(0)}` }, svg);
      tipOn(c, `Day ${k + 1} left out: log2 change ${f2(v)}`);
    });
    el("text", { x: 0, y: 12, class: "dlab" }, svg).textContent = "c";
  });
}
$("m2BxMag").innerHTML = BX.mags.map((m, i) => `<option value="${i}">${esc(m.name)}</option>`).join("");
const bxDraw = () => { bxSteps(); bxSchema($("m2BxSchema")); bxHist($("m2BxHist")); bxLodo($("m2BxLodo")); };
$("m2BxMag").addEventListener("change", (ev) => { bxMag = +ev.target.value; bxDraw(); });
bxDraw();
