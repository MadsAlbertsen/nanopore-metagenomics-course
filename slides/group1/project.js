// Group 1 deck: data from articles/group1/data.json (Bray-Curtis table, distances to reference days, enzyme genes per day).
const D = DATA, N = D.numbers;
document.querySelectorAll("[data-n]").forEach((e) => { e.textContent = N[e.dataset.n] ?? "?"; });
const SWITCH = [{ x: 5.5, label: "diet switch" }];
const heat = $("g1sHeat");
if (heat) {
  const values = D.bc.values.map((row, i) => row.map((v, j) => (i === j ? null : v)));
  heatmap(heat, { rows: D.bc.labels, cols: D.bc.labels.map((l) => l.replace("Day ", "")), values, label: "Bray-Curtis", cell: 20, colLabelHeight: 28,
    format: (v) => (v === null ? "–" : v.toFixed(3)) });
}
const tim = $("g1sTiming");
if (tim) {
  lineChart(tim, { x: D.days, xLabel: "Day", xName: "Day", yLabel: "Bray-Curtis dissimilarity", zero: true, marks: SWITCH, height: 240,
    series: [{ name: "to day 1", values: D.timing.toDay1 }, { name: "to days 8-10", values: D.timing.toLate }] });
}
const cz = $("g1sCz");
if (cz) {
  lineChart(cz, { x: D.days, xLabel: "Day", xName: "Day", yLabel: "Genes per 1,000 genes", zero: true, yRange: [0, 36], marks: SWITCH, height: 270,
    series: D.cazy.cats.map((name, k) => ({ name: name === "all degrading" ? "all degrading" : name, values: D.cazy.values[k] })) });
}

// ---- Figure 4 (changing genomes: share per day, enzyme genes per 1,000 genes), every genome name on its row, groups marked
const pl = $("g1sPairL");
if (pl) {
  const byName = Object.fromEntries(D.heatChange.map((r) => [r.name, r]));
  const lg = (v) => Math.log10(Math.max(v, N.heatFloor));
  const pct = (v) => (v === null ? "–" : 10 ** v <= N.heatFloor * 1.0001 ? `< ${N.heatFloor}%` : `${fmtNum(+(10 ** v).toPrecision(3))}%`);
  const labels = [], left = [], right = [], grps = [];
  for (const r of D.cazyRows.rows) {
    labels.push(r.name); left.push(byName[r.name].share.map(lg)); right.push(r.per); grps.push(r.grp);
  }
  const short = { "plant fibre": "fibre", "host glycan": "host", "all degrading": "total" };
  const CELL = 12, TOP = 36;
  heatmap(pl, { rows: labels, cols: D.days.map(String), values: left, label: "Share of the bases", format: pct, cell: CELL, colLabelHeight: TOP });
  heatmap($("g1sPairR"), { rows: labels.map(() => ""), cols: D.cazyRows.cats.map((x) => short[x] || x), values: right, label: "Genes per 1,000 genes", cell: CELL, colLabelHeight: TOP,
    format: (v) => (v === null ? "–" : v.toFixed(1)) });
  // group separators in both panels; group name at the right edge of the right panel (all names stay on the rows)
  const L = pl.querySelector("svg"), R = $("g1sPairR").querySelector("svg");
  const rects = R.querySelectorAll("rect"), nc = D.cazyRows.cats.length;
  const x0 = +rects[0].getAttribute("x"), x1 = +rects[nc - 1].getAttribute("x") + +rects[nc - 1].getAttribute("width");
  const mkEl = (svg, tag, a, txt) => { const e = document.createElementNS(NS0, tag); for (const k in a) e.setAttribute(k, a[k]); if (txt !== undefined) e.textContent = txt; svg.appendChild(e); return e; };
  const NS0 = "http://www.w3.org/2000/svg";
  const lx0 = +L.querySelector("rect").getAttribute("x"), lrects = L.querySelectorAll("rect"), lx1 = +lrects[D.days.length - 1].getAttribute("x") + +lrects[D.days.length - 1].getAttribute("width");
  let start = 0;
  for (let i = 1; i <= grps.length; i++) {
    if (i < grps.length && grps[i] === grps[start]) continue;
    const yTop = TOP + CELL * start, yBot = TOP + CELL * i, [dir, fam] = grps[start].split(" · ");
    if (start > 0) { mkEl(L, "line", { x1: 0, x2: lx1, y1: yTop - 0.5, y2: yTop - 0.5, stroke: "var(--ink)", "stroke-width": 1.2 }); mkEl(R, "line", { x1: x0, x2: x1 + 4, y1: yTop - 0.5, y2: yTop - 0.5, stroke: "var(--ink)", "stroke-width": 1.2 }); }
    const yc = (yTop + yBot) / 2, two = yBot - yTop >= 24;
    mkEl(R, "text", { x: x1 + 8, y: two ? yc - 2 : yc + 4, "font-weight": 600, fill: dir === "rising" ? "#1f6f8b" : "#c2571a" }, dir);
    if (two) mkEl(R, "text", { x: x1 + 8, y: yc + 11 }, fam);
    start = i;
  }
}

// ---- mini figures (slide 3 outputs, take-home cards)
const NS = "http://www.w3.org/2000/svg";
function mk(host, w, h) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("class", "mini"); host.appendChild(svg);
  const add = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; };
  return { svg, add, w, h };
}
function miniLines(host, w, h, series, colors, sw = 2, yMax = null) {
  const m = mk(host, w, h), top = yMax ?? Math.max(...series.flat());
  series.forEach((v, k) => {
    const pts = v.map((y, i) => `${(2 + (i / (v.length - 1)) * (w - 4)).toFixed(1)},${(h - 3 - (y / top) * (h - 6)).toFixed(1)}`).join(" ");
    m.add("polyline", { points: pts, fill: "none", stroke: colors[k], "stroke-width": sw, "stroke-linejoin": "round" });
  });
  m.add("line", { x1: 2 + (4.5 / 9) * (w - 4), x2: 2 + (4.5 / 9) * (w - 4), y1: 0, y2: h, stroke: "#888", "stroke-dasharray": "3 2" });
}
function miniHeat(host, w, h, M, norm) {
  const m = mk(host, w, h), nr = M.length, nc = M[0].length, cw = w / nc, ch = h / nr;
  const flat = M.flat().filter((v) => v !== null), lo = Math.min(...flat), hi = Math.max(...flat);
  M.forEach((row, i) => row.forEach((v, j) => m.add("rect", { x: j * cw, y: i * ch, width: cw + 0.3, height: ch + 0.3, fill: v === null ? "#ddd" : viridis(norm ? norm(v, lo, hi) : (v - lo) / (hi - lo || 1)) })));
}
if ($("th1")) {
  const m1 = mk($("th1"), 120, 44); [[4, 70], [12, 100], [20, 56], [28, 90], [36, 78]].forEach(([y, l]) => m1.add("line", { x1: 8, x2: 8 + l, y1: y, y2: y, stroke: "#1f6f8b", "stroke-width": 3, "stroke-linecap": "round" }));
  const m2 = mk($("th2"), 120, 44); for (let i = 0; i < 48; i++) m2.add("circle", { cx: 10 + (i % 12) * 9.2, cy: 8 + Math.floor(i / 12) * 9.5, r: 3.4, fill: viridis(((i * 7) % 12) / 12) });
  const pick = [0, 1, 2, D.heatChange.length - 1, D.heatChange.length - 2].map((i) => D.heatChange[i].share);
  miniLines($("th3"), 120, 44, pick.map((v) => { const t = Math.max(...v); return v.map((x) => x / t); }), ["#3b528b", "#3b528b", "#3b528b", "#21918c", "#5ec962"], 1.8, 1);
  miniHeat($("th4"), 120, 44, D.cazyRows.rows.map((r) => r.per.slice(0, 6)));
  miniHeat($("th5"), 120, 44, D.bc.values.map((row, i) => row.map((v, j) => (i === j ? null : v))));
  miniLines($("th6"), 120, 44, [D.timing.toDay1, D.timing.toLate], ["#2a78d6", "#e8693a"], 2.2);
  miniLines($("tk1"), 220, 80, [D.timing.toDay1, D.timing.toLate], ["#2a78d6", "#e8693a"], 3);
  miniLines($("tk2"), 220, 80, [D.cazy.values[2]], ["#1f9e6e"], 3, 36);
  const m3 = mk($("tk3"), 220, 80); m3.add("circle", { cx: 110, cy: 22, r: 14, fill: "#5a4fa8" }); m3.add("path", { d: "M78 78c0-22 14-34 32-34s32 12 32 34z", fill: "#5a4fa8" });
}
