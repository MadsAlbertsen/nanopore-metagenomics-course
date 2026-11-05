// Group 4 deck. DATA = Revision 1 (Claude) of the group's article (articles/group4-r1/data.json), only the keys shown here.
// Chart code adapted from articles/group4-r1/project.js (fig1 drift lines, histo null distributions, fig4 group changes);
// every number on a slide is read from DATA.numbers (data-n) or from the series themselves.
const D = DATA, N = D.numbers;
for (const e of document.querySelectorAll("[data-n]")) {
  const v = N[e.dataset.n];
  if (v === undefined) throw new Error(`no number ${e.dataset.n} in data.json`);
  e.textContent = e.dataset.c !== undefined ? Math.round(v).toLocaleString("en-US") : e.dataset.d === undefined ? String(v) : v.toFixed(+e.dataset.d);
}
const SPECIES = "var(--c1)", CAZ = "var(--c3)", NULLC = "var(--c7)";

// Slides 3 and 4: Figure 1a, drift of the species profile (and the CAZyme profile) from the days 1-5 mean
function drift(host, both) {
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 335);
    const box = { l: 74, r: W - (both ? 250 : 24), t: 14, b: H - 50 };
    const x = scale(1, 10, box.l + 10, box.r - 10), y = scale(0, 0.42, box.b, box.t);
    axes(svg, x, y, box, { xLabel: "Day", yLabel: "Distance to days 1–5 mean", xTicks: D.days, yTicks: [0, 0.1, 0.2, 0.3, 0.4], yFmt: (v) => v.toFixed(1) });
    el("line", { x1: x(5.5), x2: x(5.5), y1: box.t, y2: box.b, class: "mark" }, svg);
    el("text", { x: x(5.5) + 6, y: box.t + 14, class: "note" }, svg).textContent = "diet switch";
    const line = (vals, color) => {
      el("path", { d: vals.map((v, j) => `${j ? "L" : "M"}${x(D.days[j]).toFixed(1)},${y(v).toFixed(1)}`).join(""), fill: "none", style: `stroke:${color}`, "stroke-width": 3.5 }, svg);
      vals.forEach((v, j) => { const c = el("circle", { cx: x(D.days[j]), cy: y(v), r: 5, style: `fill:${color}` }, svg); tipOn(c, `Day ${D.days[j]}: ${v.toFixed(3)}`); });
    };
    const sp = D.to_first.taxa, fn = D.to_first.functions;
    line(sp, SPECIES);
    if (!both) {
      // day 6 callout and the rise on days 7-10
      el("text", { x: x(5.35), y: y(0.33), "text-anchor": "end", style: `fill:${SPECIES}`, class: "lab" }, svg).textContent = "Day 6 — still like days 1–5";
      el("line", { x1: x(5.35) - 40, y1: y(0.33) + 8, x2: x(6) - 4, y2: y(sp[5]) - 10, style: `stroke:${SPECIES}`, "stroke-width": 2 }, svg);
      const ax1 = x(7) + 6, ay1 = y(sp[6]) + 34, ax2 = x(10) - 14, ay2 = y(sp[9]) + 34;
      el("line", { x1: ax1, y1: ay1, x2: ax2, y2: ay2, style: `stroke:${SPECIES}`, "stroke-width": 4 }, svg);
      const a = Math.atan2(ay2 - ay1, ax2 - ax1), hx = (k) => [ax2 - 16 * Math.cos(a + k), ay2 - 16 * Math.sin(a + k)];
      el("polygon", { points: `${ax2},${ay2} ${hx(0.4)} ${hx(-0.4)}`, style: `fill:${SPECIES}` }, svg);
      el("text", { x: (ax1 + ax2) / 2 + 20, y: (ay1 + ay2) / 2 + 30, "text-anchor": "middle", style: `fill:${SPECIES}`, class: "lab" }, svg).textContent = "rising, days 7–10";
    } else {
      line(fn, CAZ);
      el("text", { x: x(8), y: y(sp[7]) - 14, "text-anchor": "middle", style: `fill:${SPECIES}`, class: "lab" }, svg).textContent = "species";
      el("text", { x: x(8), y: y(fn[7]) - 14, "text-anchor": "middle", style: `fill:${CAZ}`, class: "lab" }, svg).textContent = "CAZyme genes";
      // bracket between the two lines at day 10
      const bx = x(10) + 18, yt = y(sp[9]), yb = y(fn[9]);
      el("path", { d: `M${bx - 8},${yt} L${bx},${yt} L${bx},${yb} L${bx - 8},${yb}`, fill: "none", style: "stroke:var(--ink)", "stroke-width": 2.5 }, svg);
      const f = Math.round(N.taxa_between / N.functions_between), ym = (yt + yb) / 2;
      el("text", { x: bx + 12, y: ym - 4, class: "lab", style: "fill:var(--ink);font-weight:600;font-size:22px" }, svg).textContent = `about ${f}×`;
      el("text", { x: bx + 12, y: ym + 22, class: "lab", style: "fill:var(--ink);font-weight:600;font-size:22px" }, svg).textContent = "less change";
    }
  });
}

// Slide 6: Figures 2a and 2b, null distribution (purple) with the observed value ("our data")
function histo(host, { values, obs, xLabel, fmt }) {
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 250);
    const box = { l: 56, r: W - 10, t: 34, b: H - 52 };
    const all = values.concat([obs]);
    let lo = Math.min(...all), hi = Math.max(...all);
    const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
    const nb = 30, w = (hi - lo) / nb, c = new Array(nb).fill(0);
    for (const v of values) c[Math.min(nb - 1, Math.floor((v - lo) / w))]++;
    const cmax = Math.max(...c);
    const x = scale(lo, hi, box.l, box.r), y = scale(0, cmax * 1.05, box.b, box.t);
    axes(svg, x, y, box, { xLabel, yLabel: "Null replicates", xTicks: x.ticks(3), yTicks: [], xFmt: fmt });
    c.forEach((n, i) => {
      if (!n) return;
      const r = el("rect", { x: x(lo + i * w), y: y(n), width: Math.max(1, x(lo + (i + 1) * w) - x(lo + i * w) - 0.5), height: y(0) - y(n), style: `fill:${NULLC}`, opacity: 0.8 }, svg);
      tipOn(r, `${fmt(lo + i * w)} to ${fmt(lo + (i + 1) * w)}: ${n} replicates`);
    });
    el("line", { x1: x(obs), x2: x(obs), y1: box.t - 12, y2: box.b, style: "stroke:var(--ink)", "stroke-width": 3 }, svg);
    const tx = Math.min(Math.max(x(obs), box.l + 40), box.r - 40);
    el("text", { x: tx, y: box.t - 18, "text-anchor": "middle", class: "lab", style: "fill:var(--ink);font-weight:600" }, svg).textContent = "our data";
  });
}

// Slide 7: Figure 4b, observed |log2| change of each substrate group (green) against the null 95th percentile (purple)
function groups(host) {
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 250);
    const box = { l: 150, r: W - 10, t: 8, b: H - 54 };
    const q95 = (v) => { const a = v.map(Math.abs).sort((p, q) => p - q); return a[Math.floor(0.95 * (a.length - 1))]; };
    const rows = D.groups.map((g) => ({ name: g.name, obs: Math.abs(g.obs), hi: q95(g.null) }));
    const x = scale(0, 0.5, box.l, box.r), band = (box.b - box.t) / rows.length;
    axes(svg, x, () => 0, box, { xLabel: "|log2 change| of gene potential, days 6–10 vs days 1–5", xTicks: [0, 0.1, 0.2, 0.3, 0.4, 0.5], yTicks: [], xFmt: (v) => v.toFixed(1) });
    rows.forEach((r, i) => {
      const yc = box.t + band * (i + 0.5);
      el("text", { x: box.l - 8, y: yc + 6, "text-anchor": "end", style: "font-size:19px;fill:var(--ink)" }, svg).textContent = r.name;
      const a = el("rect", { x: x(0), y: yc - band * 0.4, width: x(r.obs) - x(0), height: band * 0.36, style: `fill:${CAZ}`, rx: 2 }, svg);
      const b = el("rect", { x: x(0), y: yc + band * 0.04, width: x(r.hi) - x(0), height: band * 0.36, style: `fill:${NULLC}`, opacity: 0.75, rx: 2 }, svg);
      tipOn(a, `${r.name}: observed |log2| ${r.obs.toFixed(3)}`);
      tipOn(b, `${r.name}: null 95th percentile ${r.hi.toFixed(3)}`);
      if (r.name === "Host glycans") {
        const tx = x(r.obs) + 14;
        el("text", { x: tx, y: yc - 8, class: "lab", style: "fill:var(--ink);font-weight:600;font-size:20px" }, svg).textContent = "exceeds the null";
        el("text", { x: tx, y: yc + 16, class: "lab", style: "fill:var(--ink);font-size:18px" }, svg).textContent = `(${N.r1_g_host_glycan_pct.toFixed(1)}th percentile)`;
      }
    });
    chartLegend(host, [{ name: "our data (gene potential)", color: CAZ }, { name: "null, 95th percentile", color: NULLC }]);
  });
}

drift($("s3chart"), false);
drift($("s4chart"), true);
histo($("s6a"), { values: D.null.carrier.between, obs: D.null.obs.between, xLabel: "Change between periods (CAZyme)", fmt: (v) => v.toFixed(2) });
histo($("s6b"), { values: D.null.carrier.spearman, obs: D.null.obs.spearman, xLabel: "Carrier number vs variation", fmt: (v) => v.toFixed(2) });
groups($("s7chart"));
