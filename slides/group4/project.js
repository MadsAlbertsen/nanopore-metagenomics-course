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
    if (both) {
      el("line", { x1: x(5.5), x2: x(5.5), y1: box.t, y2: box.b, class: "mark" }, svg);
      el("text", { x: x(5.5) + 6, y: box.t + 14, class: "note" }, svg).textContent = "diet switch";
    }
    const line = (vals, color) => {
      el("path", { d: vals.map((v, j) => `${j ? "L" : "M"}${x(D.days[j]).toFixed(1)},${y(v).toFixed(1)}`).join(""), fill: "none", style: `stroke:${color}`, "stroke-width": 3.5 }, svg);
      vals.forEach((v, j) => { const c = el("circle", { cx: x(D.days[j]), cy: y(v), r: 5, style: `fill:${color}` }, svg); tipOn(c, `Day ${D.days[j]}: ${v.toFixed(3)}`); });
    };
    const sp = D.to_first.taxa, fn = D.to_first.functions;
    line(sp, SPECIES);
    if (both) {
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
    const { svg, W, H } = newSvg(host, 330);
    const box = { l: 46, r: W - 8, t: 40, b: H - 56 };
    const all = values.concat([obs]);
    let lo = Math.min(...all), hi = Math.max(...all);
    const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
    const nb = 30, w = (hi - lo) / nb, c = new Array(nb).fill(0);
    for (const v of values) c[Math.min(nb - 1, Math.floor((v - lo) / w))]++;
    const cmax = Math.max(...c);
    const x = scale(lo, hi, box.l, box.r), y = scale(0, cmax * 1.05, box.b, box.t);
    axes(svg, x, y, box, { xLabel, yLabel: "Null replicates", xTicks: x.ticks(2), yTicks: [], xFmt: fmt });
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

// Slide 5: Figure 5a (Revision 1), paired bars per bacterial family: share of the species change (blue) and of the CAZyme change (green)
function families(host) {
  mountChart(host, () => {
    const F = D.drivers, { svg, W, H } = newSvg(host, 345);
    const box = { l: 200, r: W - 10, t: 6, b: H - 62 };
    const x = scale(0, 75, box.l, box.r), band = (box.b - box.t) / F.length;
    axes(svg, x, () => 0, box, { xLabel: "Share of the change between the periods (%)", xTicks: [0, 20, 40, 60], yTicks: [] });
    F.forEach((f, i) => {
      const yc = box.t + band * (i + 0.5);
      el("text", { x: box.l - 8, y: yc + 6, "text-anchor": "end", style: "font-size:19px;fill:var(--ink)" }, svg).textContent = f.family;
      [[f.sp, SPECIES, -0.36, "species change"], [f.gp, CAZ, 0.02, "CAZyme change"]].forEach(([v, c, off, n]) => {
        const r = el("rect", { x: Math.min(x(0), x(v)), y: yc + band * off, width: Math.abs(x(v) - x(0)), height: band * 0.34, style: `fill:${c}`, rx: 2 }, svg);
        tipOn(r, `${f.family}: ${n} ${v.toFixed(1)}%`);
      });
    });
    const note = (i, lines, xv) => {
      const yc = box.t + band * (i + 0.5);
      lines.forEach((t, k) => el("text", { x: x(xv) + 12, y: yc - band * 0.19 + 6 + k * 21, class: "lab", style: "fill:var(--ink);font-weight:600;font-size:18px" }, svg).textContent = t);
    };
    const p = (n) => Math.round(n);
    const L = F.find((f) => f.family === "Lachnospiraceae"), B = F.find((f) => f.family === "Bacteroidaceae");
    note(F.indexOf(L), [`${p(L.sp)}% of species change,`, `only ${p(L.gp)}% of gene change`], L.sp);
    note(F.indexOf(B), [`${p(B.sp)}% of species change, ${p(B.gp)}% of gene change`], B.sp);
    chartLegend(host, [{ name: "share of species change", color: SPECIES }, { name: "share of CAZyme change", color: CAZ }]);
  });
}

// Slide 6: bubble plot (the group's article, Figure 2c): key MAGs ordered by log2 change; bubble area = degrading CAZyme genes per 1,000 genes
function bubbles(host) {
  const B = D.bubble, cols = ["Plant fibre", "Starch", "Fructan", "Host glycans"], nc = cols.length;
  const med = (a) => { const s = [...a].sort((p, q) => p - q), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const lachn = med(D.mag_caz.filter((m) => m.family === "Lachnospiraceae").map((m) => m.caz));
  const nl = document.getElementById("nLachn"); if (nl) nl.textContent = lachn.toFixed(0);
  const sl = document.getElementById("s6list");
  if (sl) sl.textContent = "MAGs (log2 change): " + B.map((m) => `${m.name} (${m.log2.toFixed(1)})`).join("; ") + ".";
  mountChart(host, () => {
    const rowH = 23, labW = 215, colW = 74, barW = 100, top = 54, nm = B.length;
    const { svg, W } = newSvg(host, top + nm * rowH + 26);
    const vmax = Math.max(...B.flatMap((m) => m.v));
    const r = (v) => 10.5 * Math.sqrt(v / vmax), x0 = labW, bx = x0 + colW * nc + 16, bs = (v) => (v / 4) * (barW / 2);
    cols.forEach((c, j) => el("text", { x: x0 + colW * (j + 0.5), y: top - 28, "text-anchor": "middle", style: "font-size:15px;fill:var(--ink)" }, svg).textContent = c === "Host glycans" ? "Host" : c);
    el("text", { x: x0 + colW * 3.5, y: top - 10, "text-anchor": "middle", style: "font-size:15px;fill:var(--ink)" }, svg).textContent = "glycans";
    el("text", { x: bx + barW / 2, y: top - 10, "text-anchor": "middle", style: "font-size:15px;fill:var(--ink)" }, svg).textContent = "log2 change";
    B.forEach((m, i) => {
      const y = top + i * rowH + rowH / 2;
      el("text", { x: labW - 8, y: y + 5, "text-anchor": "end", style: "font-size:15px;fill:var(--ink)" }, svg).textContent = m.name.replace(/ \(.*\)$/, "").replace(/^([A-Za-z]+)_[A-Z] /, "$1 ").replace(/^(\w+) sp\d+/, "$1 sp.");
      m.v.forEach((v, j) => {
        const c = el("circle", { cx: x0 + colW * (j + 0.5), cy: y, r: Math.max(1.5, r(v)), style: `fill:${CAZ};fill-opacity:.85` }, svg);
        tipOn(c, `${m.name}: ${cols[j]} ${v.toFixed(1)} genes per 1,000 genes of the MAG`);
      });
      el("rect", { x: Math.min(bx + barW / 2, bx + barW / 2 + bs(m.log2)), y: y - 5, width: Math.abs(bs(m.log2)), height: 10, style: `fill:${SPECIES}` }, svg);
    });
    el("line", { x1: bx + barW / 2, x2: bx + barW / 2, y1: top, y2: top + nm * rowH, class: "mark" }, svg);
    [-2, 0, 2].forEach((t) => el("text", { x: bx + barW / 2 + bs(t), y: top + nm * rowH + 16, "text-anchor": "middle", style: "font-size:14px" }, svg).textContent = t);
    // brackets and annotations on the right
    const nf = B.filter((m) => m.log2 < 0).length, ax = bx + barW + 14;
    const brace = (i0, i1, lines) => {
      const y0 = top + i0 * rowH + 3, y1 = top + i1 * rowH - 3;
      el("path", { d: `M${ax},${y0} L${ax + 8},${y0} L${ax + 8},${y1} L${ax},${y1}`, fill: "none", style: "stroke:var(--ink)", "stroke-width": 2 }, svg);
      lines.forEach((t, k) => el("text", { x: ax + 18, y: (y0 + y1) / 2 - ((lines.length - 1) * 10) + 5 + k * 21, style: "font-size:17px;font-weight:600;fill:var(--ink)" }, svg).textContent = t);
    };
    brace(0, nf, ["Lachnospiraceae: fell most,", `~${lachn.toFixed(0)} CAZyme genes per 1,000`]);
    brace(nf, nm, ["Bacteroidota:", `~${Math.round(N.caz_bct_med)} CAZyme genes`, "per 1,000"]);
  });
}

drift($("s3chart"), false);
drift($("s4chart"), true);
histo($("s6a"), { values: D.null.carrier.between, obs: D.null.obs.between, xLabel: "Change in CAZyme profile", fmt: (v) => v.toFixed(2) });
histo($("s6b"), { values: D.null.carrier.spearman, obs: D.null.obs.spearman, xLabel: "Carriers vs variation", fmt: (v) => v.toFixed(2) });
groups($("s7chart"));
families($("s5chart"));
bubbles($("s6chart"));
