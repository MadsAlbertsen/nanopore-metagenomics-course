// Shared interactive charts for the project pages (loaded after common.js; modules do not load it).
// Each function draws into a host element, redraws when the window is resized or the colour scheme changes, and shows
// a tooltip for every mark. Colours: categorical --c1..--c7 in fixed order (color: an explicit CSS colour wins);
// continuous scales use viridis (common.js); diverging maps use two hues and a neutral grey midpoint.
const CHARTS = [];
const catColor = (i) => `var(--c${(i % 7) + 1})`;
const fmtNum = (v) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  const a = Math.abs(v);
  if (a >= 1000) return Math.round(v).toLocaleString("en-US");
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  if (a >= 1) return v.toFixed(2);
  return a === 0 ? "0" : v.toPrecision(2);
};

function mountChart(host, draw) {
  // calling a chart function again on the same host replaces its drawing (e.g. after a guided example)
  host.classList.add("chart");
  const entry = CHARTS.find((c) => c.host === host);
  if (entry) entry.draw = draw;
  else CHARTS.push({ host, draw });
  draw();
  return { redraw: draw };
}
(() => {
  let t;
  const again = () => { clearTimeout(t); t = setTimeout(() => CHARTS.forEach((c) => c.draw()), 150); };
  addEventListener("resize", again);
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", again);
})();

// --- scales and axes
function niceTicks(lo, hi, n = 5) {
  if (!(hi > lo)) return [lo];
  const step0 = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= step0);
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toPrecision(12));
  return out;
}
function scale(lo, hi, a, b, log = false) {
  if (log) {
    const l0 = Math.log10(lo), l1 = Math.log10(hi);
    const f = (v) => a + ((Math.log10(Math.max(v, lo)) - l0) / (l1 - l0 || 1)) * (b - a);
    // decades; within less than two decades also 2x and 5x steps
    f.ticks = () => {
      const steps = l1 - l0 < 2 ? [1, 2, 5] : [1], t = [];
      for (let e = Math.floor(l0); e <= Math.ceil(l1); e++) for (const k of steps) { const v = k * 10 ** e; if (v >= lo && v <= hi) t.push(+v.toPrecision(6)); }
      return t.length > 1 ? t : [lo, hi];
    };
    return f;
  }
  const f = (v) => a + ((v - lo) / (hi - lo || 1)) * (b - a);
  f.ticks = (n) => niceTicks(lo, hi, n);
  return f;
}
function extent(vals, { log = false, zero = false, pad = 0.05 } = {}) {
  let v = vals.filter((x) => x !== null && x !== undefined && Number.isFinite(x) && (!log || x > 0));
  if (!v.length) v = [0, 1];
  let lo = Math.min(...v), hi = Math.max(...v);
  if (log) return [lo / 1.3, hi * 1.3];
  if (zero) lo = Math.min(0, lo), hi = Math.max(0, hi);
  if (lo === hi) { lo -= 1; hi += 1; }
  const p = (hi - lo) * pad;
  return [zero && lo === 0 ? 0 : lo - p, hi + p];
}
function newSvg(host, height) {
  host.innerHTML = "";
  const W = Math.max(280, host.clientWidth || 640), H = height;
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img" }, host);
  return { svg, W, H };
}
const fmtTick = (v) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en-US") : String(+v.toPrecision(4)));
function axes(svg, x, y, box, { xLabel, yLabel, xTicks, yTicks, xFmt = fmtTick, yFmt = fmtTick }) {
  const g = el("g", { class: "axis" }, svg);
  for (const t of yTicks) {
    el("line", { x1: box.l, x2: box.r, y1: y(t), y2: y(t), class: "grid" }, g);
    el("text", { x: box.l - 6, y: y(t) + 4, "text-anchor": "end" }, g).textContent = yFmt(t);
  }
  for (const t of xTicks) el("text", { x: x(t), y: box.b + 16, "text-anchor": "middle" }, g).textContent = xFmt(t);
  el("line", { x1: box.l, x2: box.r, y1: box.b, y2: box.b, class: "base" }, g);
  if (xLabel) el("text", { x: (box.l + box.r) / 2, y: box.b + 34, "text-anchor": "middle", class: "lab" }, g).textContent = xLabel;
  if (yLabel) el("text", { x: -(box.t + box.b) / 2, y: 14, transform: "rotate(-90)", "text-anchor": "middle", class: "lab" }, g).textContent = yLabel;
}
function tipOn(node, html) {
  node.addEventListener("mousemove", (ev) => showTip(ev, typeof html === "function" ? html() : html));
  node.addEventListener("mouseleave", hideTip);
}

// legend below a chart: items [{name, color}]
function chartLegend(host, items) {
  const d = document.createElement("div");
  d.className = "legend";
  d.innerHTML = items.map((it) => `<span><i class="sw" style="background:${it.color}"></i>${esc(it.name)}</span>`).join("");
  host.appendChild(d);
  return d;
}

// --- line chart: x values (e.g. days) and series [{name, values, color}]; marks [{x, label}] draw dashed lines,
// bands [{from, to, label}] shade a range (e.g. a diet period); highlight: the name of one series to emphasise.
function lineChart(host, o) {
  return mountChart(host, () => {
    const { svg, W, H } = newSvg(host, o.height || 300);
    const right = o.series.length <= 4 ? 120 : 16;
    const box = { l: 56, r: W - right, t: 18, b: H - 44 };
    const all = o.series.flatMap((s) => s.values);
    const [y0, y1] = o.yRange || extent(all, { log: o.logY, zero: !o.logY && o.zero !== false });
    const x = scale(Math.min(...o.x), Math.max(...o.x), box.l + 8, box.r - 8);
    const y = scale(y0, y1, box.b, box.t, o.logY);
    for (const b of o.bands || []) {
      el("rect", { x: x(b.from), width: x(b.to) - x(b.from), y: box.t, height: box.b - box.t, class: "band" }, svg);
      if (b.label) el("text", { x: (x(b.from) + x(b.to)) / 2, y: box.t + 12, "text-anchor": "middle", class: "note" }, svg).textContent = b.label;
    }
    axes(svg, x, y, box, { xLabel: o.xLabel, yLabel: o.yLabel, xTicks: o.x, yTicks: o.logY ? y.ticks() : y.ticks(5), xFmt: o.xFmt || String, yFmt: o.yFmt });
    for (const m of o.marks || []) {
      el("line", { x1: x(m.x), x2: x(m.x), y1: box.t, y2: box.b, class: "mark" }, svg);
      if (m.label) el("text", { x: x(m.x) + 4, y: box.t + 10, class: "note" }, svg).textContent = m.label;
    }
    o.series.forEach((s, i) => {
      const color = s.color || catColor(i), dim = o.highlight && o.highlight !== s.name;
      const pts = o.x.map((xv, j) => [xv, s.values[j]]).filter(([, v]) => v !== null && v !== undefined && (!o.logY || v > 0));
      const d = pts.map(([xv, v], j) => `${j ? "L" : "M"}${x(xv).toFixed(1)},${y(v).toFixed(1)}`).join("");
      el("path", { d, fill: "none", style: `stroke:${color}`, "stroke-width": dim ? 1.2 : 2, opacity: dim ? 0.35 : 1 }, svg);
      for (const [xv, v] of pts) el("circle", { cx: x(xv), cy: y(v), r: dim ? 2 : 3, style: `fill:${color}`, opacity: dim ? 0.35 : 1 }, svg);
      if (right > 16 && pts.length) {
        const [xl, vl] = pts[pts.length - 1];
        el("text", { x: x(xl) + 8, y: y(vl) + 4, class: "dlab", style: `fill:${color}` }, svg).textContent = s.name.length > 16 ? s.name.slice(0, 15) + "…" : s.name;
      }
    });
    // hover: the nearest x shows every series' value there
    const hit = el("rect", { x: box.l, y: box.t, width: box.r - box.l, height: box.b - box.t, fill: "transparent" }, svg);
    const cross = el("line", { y1: box.t, y2: box.b, class: "cross", visibility: "hidden" }, svg);
    hit.addEventListener("mousemove", (ev) => {
      const px = ev.clientX - svg.getBoundingClientRect().left;
      const j = o.x.reduce((b, xv, k) => (Math.abs(x(xv) - px) < Math.abs(x(o.x[b]) - px) ? k : b), 0);
      cross.setAttribute("x1", x(o.x[j])); cross.setAttribute("x2", x(o.x[j])); cross.setAttribute("visibility", "visible");
      const rows = o.series.map((s, i) => ({ s, i, v: s.values[j] })).sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity)).slice(0, 12);
      showTip(ev, `<b>${esc(o.xName || o.xLabel || "x")} ${esc(String(o.x[j]))}</b><br>` + rows.map((r) => `<i class="sw" style="background:${r.s.color || catColor(r.i)}"></i>${esc(r.s.name)}: ${(o.yFmt || fmtNum)(r.v)}${o.unit ? " " + esc(o.unit) : ""}`).join("<br>"));
    });
    hit.addEventListener("mouseleave", () => { cross.setAttribute("visibility", "hidden"); hideTip(); });
    if (right === 16) chartLegend(host, o.series.map((s, i) => ({ name: s.name, color: s.color || catColor(i) })));
  });
}

// --- bar chart: labels + values (one series) or groups [{name, values}]; horizontal for long labels; colors per bar
function barChart(host, o) {
  return mountChart(host, () => {
    const groups = o.groups || [{ name: o.name || "", values: o.values }];
    const n = o.labels.length, k = groups.length;
    const hz = !!o.horizontal;
    const height = o.height || (hz ? Math.max(160, n * (12 + 10 * k) + 60) : 300);
    const { svg, W, H } = newSvg(host, height);
    const labW = hz ? Math.min(220, 8 + 6.6 * Math.max(...o.labels.map((l) => String(l).length))) : 56;
    const box = { l: labW, r: W - 16, t: 14, b: H - (hz ? 40 : 56) };
    const [v0, v1] = extent(groups.flatMap((g) => g.values), { zero: true, pad: 0.04 });
    const color = (gi, i) => (o.colors ? o.colors[i] : k > 1 ? catColor(gi) : groups[0].color || catColor(0));
    const band = ((hz ? box.b - box.t : box.r - box.l) / n);
    const bw = Math.max(2, (band * 0.75) / k);
    if (hz) {
      const x = scale(v0, v1, box.l, box.r);
      axes(svg, x, () => 0, { ...box, l: box.l }, { xLabel: o.yLabel, xTicks: x.ticks(5), yTicks: [], xFmt: o.fmt });
      o.labels.forEach((lab, i) => {
        const yc = box.t + band * (i + 0.5);
        el("text", { x: box.l - 6, y: yc + 4, "text-anchor": "end" }, svg).textContent = lab;
        groups.forEach((g, gi) => {
          const v = g.values[i], yy = yc - (bw * k) / 2 + gi * bw;
          const r = el("rect", { x: Math.min(x(0), x(v)), y: yy, width: Math.abs(x(v) - x(0)), height: bw - 1, style: `fill:${color(gi, i)}`, rx: 2 }, svg);
          tipOn(r, `<b>${esc(lab)}</b>${g.name ? " · " + esc(g.name) : ""}<br>${(o.fmt || fmtNum)(v)}${o.unit ? " " + esc(o.unit) : ""}`);
        });
      });
    } else {
      const y = scale(v0, v1, box.b, box.t);
      axes(svg, () => 0, y, box, { yLabel: o.yLabel, xTicks: [], yTicks: y.ticks(5), yFmt: o.fmt });
      const rot = n > 8;
      o.labels.forEach((lab, i) => {
        const xc = box.l + band * (i + 0.5);
        el("text", rot ? { x: xc, y: box.b + 12, transform: `rotate(-40 ${xc} ${box.b + 12})`, "text-anchor": "end" } : { x: xc, y: box.b + 16, "text-anchor": "middle" }, svg).textContent = lab;
        groups.forEach((g, gi) => {
          const v = g.values[i], xx = xc - (bw * k) / 2 + gi * bw;
          const r = el("rect", { x: xx, y: Math.min(y(0), y(v)), width: bw - 1, height: Math.abs(y(v) - y(0)), style: `fill:${color(gi, i)}`, rx: 2 }, svg);
          tipOn(r, `<b>${esc(lab)}</b>${g.name ? " · " + esc(g.name) : ""}<br>${(o.fmt || fmtNum)(v)}${o.unit ? " " + esc(o.unit) : ""}`);
        });
      });
    }
    if (k > 1) chartLegend(host, groups.map((g, gi) => ({ name: g.name, color: catColor(gi) })));
  });
}

// --- scatter: points [{x, y, label, group, size}]; groups take categorical colours in order of first appearance;
// diagonal draws y = x; labelled: label every point (keep it to few points)
function scatter(host, o) {
  return mountChart(host, () => {
    const { svg, W, H } = newSvg(host, o.height || 340);
    const box = { l: 60, r: W - 16, t: 14, b: H - 44 };
    const groups = [...new Set(o.points.map((p) => p.group).filter((g) => g !== undefined))];
    let [x0, x1] = o.xRange || extent(o.points.map((p) => p.x), { log: o.logX });
    let [y0, y1] = o.yRange || extent(o.points.map((p) => p.y), { log: o.logY });
    if (o.diagonal) { x0 = y0 = Math.min(x0, y0); x1 = y1 = Math.max(x1, y1); }
    const x = scale(x0, x1, box.l, box.r, o.logX), y = scale(y0, y1, box.b, box.t, o.logY);
    axes(svg, x, y, box, { xLabel: o.xLabel, yLabel: o.yLabel, xTicks: o.logX ? x.ticks() : x.ticks(6), yTicks: o.logY ? y.ticks() : y.ticks(5), xFmt: o.xFmt, yFmt: o.yFmt });
    if (o.diagonal) el("line", { x1: x(x0), y1: y(y0), x2: x(x1), y2: y(y1), class: "mark" }, svg);
    for (const p of o.points) {
      if ((o.logX && !(p.x > 0)) || (o.logY && !(p.y > 0))) continue;
      const color = p.color || (p.group !== undefined ? catColor(groups.indexOf(p.group)) : catColor(0));
      const c = el("circle", { cx: x(p.x), cy: y(p.y), r: p.size || 4.5, style: `fill:${color}`, class: "dot" }, svg);
      tipOn(c, `<b>${esc(p.label || "")}</b>${p.group !== undefined ? "<br>" + esc(p.group) : ""}<br>${esc(o.xLabel || "x")}: ${(o.xFmt || fmtNum)(p.x)}<br>${esc(o.yLabel || "y")}: ${(o.yFmt || fmtNum)(p.y)}${p.extra ? "<br>" + esc(p.extra) : ""}`);
      if (o.labelled && p.label) el("text", { x: x(p.x) + 6, y: y(p.y) - 5, class: "dlab" }, svg).textContent = p.label;
    }
    if (groups.length > 1) chartLegend(host, groups.map((g, i) => ({ name: g, color: catColor(i) })));
  });
}

// --- heatmap: rows x cols matrix; sequential viridis, or diverging (centre 0 unless o.center) blue - grey - orange
function hexRgb(h) { const m = h.replace("#", ""); return [0, 2, 4].map((k) => parseInt(m.slice(k, k + 2), 16)); }
function mix(a, b, f) { const A = hexRgb(a), B = hexRgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * f)).join(",")})`; }
function heatmap(host, o) {
  return mountChart(host, () => {
    const nr = o.rows.length, nc = o.cols.length;
    const labW = Math.min(240, 10 + 6.4 * Math.max(...o.rows.map((r) => String(r).length)));
    const cell = o.cell || 22, top = o.colLabelHeight || 70;
    const W0 = Math.max(280, host.clientWidth || 640);
    const cw = Math.max(10, Math.min(48, (W0 - labW - 90) / nc));
    const { svg } = newSvg(host, top + nr * cell + 20);
    const vals = o.values.flat().filter((v) => v !== null && Number.isFinite(v));
    const fmt = o.format || fmtNum;
    let color;
    if (o.diverging) {
      const c = o.center || 0, span = Math.max(...vals.map((v) => Math.abs(v - c))) || 1;
      const neg = cssVar("--c1") || "#2a78d6", pos = cssVar("--c2") || "#eb6834", mid = cssVar("--v4") || "#d3d8d6";
      color = (v) => (v < c ? mix(mid, neg, Math.min(1, (c - v) / span)) : mix(mid, pos, Math.min(1, (v - c) / span)));
    } else {
      const lo = o.min ?? Math.min(...vals), hi = o.max ?? Math.max(...vals);
      color = (v) => viridis((v - lo) / (hi - lo || 1));
    }
    o.cols.forEach((c, j) => {
      const xc = labW + cw * (j + 0.5);
      el("text", { x: xc, y: top - 6, transform: `rotate(-50 ${xc} ${top - 6})`, "text-anchor": "start" }, svg).textContent = c;
    });
    o.rows.forEach((r, i) => {
      el("text", { x: labW - 6, y: top + cell * i + cell / 2 + 4, "text-anchor": "end" }, svg).textContent = r;
      o.cols.forEach((c, j) => {
        const v = o.values[i][j];
        const rect = el("rect", { x: labW + cw * j, y: top + cell * i, width: cw - 1, height: cell - 1, fill: v === null || !Number.isFinite(v) ? "var(--line)" : color(v) }, svg);
        tipOn(rect, `<b>${esc(r)}</b> · ${esc(c)}<br>${esc(o.label || "value")}: ${fmt(v)}`);
      });
    });
    const lo = o.diverging ? null : (o.min ?? Math.min(...vals)), hi = o.diverging ? null : (o.max ?? Math.max(...vals));
    const leg = document.createElement("div");
    leg.className = "legend";
    leg.innerHTML = o.diverging
      ? `<span>${esc(o.label || "")}: <i class="sw" style="background:var(--c1)"></i>below ${fmt(o.center || 0)} <i class="sw" style="background:var(--v4)"></i>${fmt(o.center || 0)} <i class="sw" style="background:var(--c2)"></i>above</span>`
      : `<span>${esc(o.label || "")}: ${fmt(lo)} <i class="ramp" style="display:inline-block;width:120px;height:10px;vertical-align:-1px;background:linear-gradient(90deg,${[0, 0.25, 0.5, 0.75, 1].map(viridis).join(",")})"></i> ${fmt(hi)}</span>`;
    host.appendChild(leg);
  });
}

// --- sortable table: columns [{key, label, num, fmt}], rows (objects); filter adds a search box; maxRows + "show all"
function table(host, o) {
  const st = { key: o.sortKey || null, desc: o.sortDesc ?? true, find: "", all: false };
  const draw = () => {
    const words = st.find.toLowerCase().split(/\s+/).filter(Boolean);
    let rows = o.rows.filter((r) => words.every((w) => o.columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(w))));
    if (st.key) {
      const col = o.columns.find((c) => c.key === st.key);
      rows = [...rows].sort((a, b) => {
        const A = a[st.key], B = b[st.key];
        const d = col.num ? (A ?? -Infinity) - (B ?? -Infinity) : String(A ?? "").localeCompare(String(B ?? ""));
        return st.desc ? -d : d;
      });
    }
    const shown = !st.all && o.maxRows ? rows.slice(0, o.maxRows) : rows;
    const head = o.columns.map((c) => `<th class="${c.num ? "r" : ""}"${o.sortable !== false ? ` data-k="${c.key}" style="cursor:pointer" aria-sort="${st.key === c.key ? (st.desc ? "descending" : "ascending") : "none"}"` : ""}>${esc(c.label)}${st.key === c.key ? (st.desc ? " ↓" : " ↑") : ""}</th>`).join("");
    const body = shown.map((r) => `<tr>${o.columns.map((c) => `<td class="${c.num ? "r" : ""}">${esc(c.fmt ? c.fmt(r[c.key], r) : c.num ? fmtNum(r[c.key]) : (r[c.key] ?? ""))}</td>`).join("")}</tr>`).join("");
    const more = o.maxRows && rows.length > o.maxRows ? `<button class="link" data-all="1">${st.all ? "Show fewer" : `Show all ${rows.length} rows`}</button>` : "";
    tbl.innerHTML = `<div class="scroll"><table class="ct"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div><p class="note">${rows.length} of ${o.rows.length} rows ${more}</p>`;
  };
  host.innerHTML = "";
  if (o.filter) {
    const inp = document.createElement("input");
    inp.type = "search"; inp.placeholder = o.filterPlaceholder || "filter rows"; inp.setAttribute("aria-label", "Filter the table"); inp.style.width = "240px";
    inp.addEventListener("input", () => { st.find = inp.value; draw(); });
    host.appendChild(inp);
  }
  const tbl = document.createElement("div");
  host.appendChild(tbl);
  tbl.addEventListener("click", (ev) => {
    const th = ev.target.closest("th[data-k]");
    if (th) { st.desc = st.key === th.dataset.k ? !st.desc : true; st.key = th.dataset.k; draw(); return; }
    if (ev.target.closest("[data-all]")) { st.all = !st.all; draw(); }
  });
  draw();
  return { redraw: draw };
}
