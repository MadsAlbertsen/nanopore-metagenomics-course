// Module 6: interpretation. DATA = {samples, day, diet, gb, on_assembly, phyla, mags, bc, ...} from the example analysis
// (np26 scripts/22_course_interpretation.py). share = percent of the sample's read bases on the MAG's contigs.
const D = DATA, S = D.samples, N = S.length, M = D.mags;
const MAX_PICK = 3;
const MEASURES = {
  share: { label: "Share of all read bases", unit: "%", axis: "Share of all read bases (%)" },
  binned: { label: "Share of read bases in MAGs", unit: "%", axis: "Share of read bases in MAGs (%)" },
  gb: { label: "Read bases", unit: "Mb", axis: "Read bases on the MAG (Mb)" },
};
const binnedSum = S.map((_, k) => M.reduce((s, m) => s + m.share[k], 0));
const meanGb = D.gb.reduce((a, b) => a + b, 0) / N;
const DIETS = [...new Set(D.diet)];
const DIET_B = D.diet.map((d, k) => (d === DIETS[1] ? k : -1)).filter((k) => k >= 0);
const meanShare = M.map((m) => m.share.reduce((a, b) => a + b, 0) / N);
const considered = meanShare.map((v) => v >= D.min_mean);
const byMean = M.map((_, i) => i).sort((a, b) => meanShare[b] - meanShare[a]);
const st = { measure: "share", by: "phylum", B: new Set(DIET_B), picked: [byMean[0]], log: false };

// --- values in the current measure
function val(i, k, measure = st.measure) {
  const s = M[i].share[k];
  return measure === "binned" ? (100 * s) / binnedSum[k] : measure === "gb" ? (s / 100) * D.gb[k] * 1000 : s;
}
const pseudo = (measure = st.measure) => (measure === "gb" ? (D.pseudo / 100) * meanGb * 1000 : D.pseudo);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const groups = () => { const B = [...st.B].sort((a, b) => a - b); return [S.map((_, k) => k).filter((k) => !st.B.has(k)), B]; };
function change(i, A, B, measure = st.measure) {
  const a = mean(A.map((k) => val(i, k, measure))), b = mean(B.map((k) => val(i, k, measure))), p = pseudo(measure);
  return { a, b, lfc: Math.log2((b + p) / (a + p)) };
}
function fmtV(v, measure = st.measure) {
  if (measure === "gb") return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + " Mb";
  return (v >= 10 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3)) + "%";
}
const fmtTick = (v) => `${+v.toPrecision(3)}${st.measure === "gb" ? " Mb" : "%"}`;
const ratioTxt = (a, b) => (a > 0 && b > 0 ? fold(Math.log2(b / a)) : b > 0 ? "absent in the first group" : "absent in the second group");
const fold = (l) => { const f = 2 ** Math.abs(l); return `${f.toFixed(f >= 10 ? 0 : 1)}× ${l >= 0 ? "higher" : "lower"}`; };
const foldTick = (e) => (e === 0 ? "1×" : e > 0 ? `${2 ** e}×` : `1/${2 ** -e}×`);
function daysText(idx) {
  const d = idx.map((k) => D.day[k]), out = [];
  for (let a = 0; a < d.length; ) { let b = a; while (b + 1 < d.length && d[b + 1] === d[b] + 1) b++; out.push(b - a >= 2 ? `${d[a]}-${d[b]}` : d.slice(a, b + 1).join(", ")); a = b + 1; }
  return (d.length > 1 ? "days " : "day ") + out.join(", ");
}
const dietName = (k) => D.diet_names[D.diet[k]] || D.diet[k];
const magLabel = (i) => `<i>${esc(M[i].name)}</i> <span class="mono">${M[i].id}</span>`;
const cats = () => [1, 2, 3, 4, 5, 6, 7].map((k) => `var(--c${k})`);
const phylumColour = (p) => { const k = D.phyla.indexOf(p); return k >= 0 && k < 7 ? `var(--c${k + 1})` : "var(--faint)"; };
function combos(n, k) { const out = [], c = []; (function rec(s) { if (c.length === k) { out.push(c.slice()); return; } for (let i = s; i < n; i++) { c.push(i); rec(i + 1); c.pop(); } })(0); return out; }
// every way to choose the second group with the same sizes; mirrored splits counted once when the groups are equal
function allSplits() {
  const nb = st.B.size, out = [];
  for (const B of combos(N, nb)) { if (nb * 2 === N && !B.includes(0)) continue; out.push([S.map((_, k) => k).filter((k) => !B.includes(k)), B]); }
  return out;
}

// --- state <-> link
function stateHash() {
  const p = { m: st.measure, by: st.by };
  const B = [...st.B].sort((a, b) => a - b);
  if (B.join() !== DIET_B.join()) p.b = B.map((k) => D.day[k]).join(",");
  p.mag = st.picked.length ? st.picked.map((i) => M[i].id).join(",") : "none";
  if (st.log) p.log = 1;
  if (examples.current >= 0) p.ex = examples.current + 1;
  return p;
}
function applyState(s) {
  st.measure = MEASURES[s.m] ? s.m : "share";
  st.by = s.by === "mag" ? "mag" : "phylum";
  const days = s.b ? String(s.b).split(",").map((d) => D.day.indexOf(+d)).filter((k) => k >= 0) : [];
  st.B = new Set(days.length && days.length < N ? days : DIET_B);
  if (s.mag === undefined) st.picked = [byMean[0]];
  else st.picked = [...new Set(String(s.mag).split(",").map((id) => M.findIndex((m) => m.id === id)).filter((i) => i >= 0))].slice(0, MAX_PICK);
  st.log = String(s.log) === "1";
  $("ipMeasure").value = st.measure; $("ipBy").value = st.by; $("ipLog").checked = st.log; $("ipFind").value = "";
}
function pick(i) {
  if (i < 0) return;
  const at = st.picked.indexOf(i);
  if (at >= 0) st.picked.splice(at, 1);
  else { st.picked.push(i); if (st.picked.length > MAX_PICK) st.picked.shift(); }
  draw();
}

// --- setup
function setup() {
  $("ipMagList").innerHTML = byMean.map((i) => `<option value="${M[i].id} ${esc(M[i].name)}">`).join("");
  $("ipDays").innerHTML = S.map((s, k) => `<button type="button" data-day="${k}" title="${s}, ${esc(dietName(k))}">${D.day[k]}</button>`).join("");
  const binned = binnedSum, lo = (a) => Math.min(...a), hi = (a) => Math.max(...a);
  $("ipStats").innerHTML = [
    [M.length, "MAGs"],
    [`${lo(D.gb).toFixed(1)}-${hi(D.gb).toFixed(1)} Gb`, "read bases per day"],
    [`${lo(binned).toFixed(0)}-${hi(binned).toFixed(0)}%`, "of each day's read bases in MAGs"],
    [`${lo(D.on_assembly).toFixed(1)}-${hi(D.on_assembly).toFixed(1)}%`, "on any contig"],
  ].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join("");
  $("ipDays").addEventListener("click", (e) => {
    const t = e.target.closest("[data-day]"); if (!t) return;
    const k = +t.dataset.day, B = new Set(st.B);
    if (B.has(k)) B.delete(k); else B.add(k);
    if (B.size === 0 || B.size === N) return;
    st.B = B; draw();
  });
  for (const b of document.querySelectorAll("[data-split]")) b.addEventListener("click", () => {
    st.B = new Set(b.dataset.split === "odd" ? S.map((_, k) => k).filter((k) => D.day[k] % 2 === 0) : DIET_B); draw();
  });
  $("ipMeasure").addEventListener("input", (e) => { st.measure = e.target.value; draw(); });
  $("ipBy").addEventListener("input", (e) => { st.by = e.target.value; draw(); });
  $("ipLog").addEventListener("input", (e) => { st.log = e.target.checked; draw(); });
  $("ipFind").addEventListener("change", (e) => {
    const i = M.findIndex((m) => m.id === e.target.value.split(" ")[0]);
    if (i >= 0 && !st.picked.includes(i)) pick(i);
    e.target.value = "";
  });
  $("ipCopy").addEventListener("click", async () => {
    writeHashParams(stateHash());
    let ok = true; try { await navigator.clipboard.writeText(location.href); } catch (e) { ok = false; }
    $("ipCopied").textContent = ok ? "Copied." : "Copy the address from the browser bar.";
    setTimeout(() => { $("ipCopied").textContent = ""; }, 2500);
  });
}

// --- shared chart parts: days on the x axis, the second group shaded, the diet switch dashed
function dayAxis(svg, X, mg, W, H, step) {
  for (const k of st.B) el("rect", { class: "band", x: X(k) - step / 2, y: mg.t, width: step, height: H - mg.t - mg.b }, svg);
  const sw = D.diet.findIndex((d) => d !== D.diet[0]);
  if (sw > 0) {
    const x = (X(sw - 1) + X(sw)) / 2;
    el("line", { class: "ref", x1: x, x2: x, y1: mg.t - 14, y2: H - mg.b }, svg);
    for (const [k0, anchor, dx] of [[0, "end", -6], [sw, "start", 6]]) {
      const t = el("text", { x: x + dx, y: mg.t - 6, "text-anchor": anchor, class: "lbl" }, svg); t.textContent = dietName(k0).toLowerCase();
    }
  }
  S.forEach((_, k) => { const t = el("text", { x: X(k), y: H - mg.b + 14, "text-anchor": "middle", class: "lbl" }, svg); t.textContent = D.day[k]; if (st.B.has(k)) t.style.fontWeight = 600; });
  const t = el("text", { x: (mg.l + W - mg.r) / 2, y: H - 4, "text-anchor": "middle", class: "lbl" }, svg); t.textContent = "Day (samples DNA01-DNA10)";
}
function yLabel(svg, text, mg, H) {
  const y = (mg.t + H - mg.b) / 2, t = el("text", { x: 12, y, "text-anchor": "middle", class: "lbl", transform: `rotate(-90 12 ${y})` }, svg); t.textContent = text;
}
function hover(node, html, click) {
  node.addEventListener("pointermove", (ev) => showTip(ev, html()));
  node.addEventListener("pointerleave", hideTip);
  if (click) node.addEventListener("click", click);
}
const niceMax = (v) => { const e = 10 ** Math.floor(Math.log10(v)), f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; };

// --- community on each day: stacked bars
function compCategories() {
  const ms = st.measure, gbMode = ms === "gb", conv = (pct, k) => (gbMode ? (pct / 100) * D.gb[k] : pct);
  const mag = (i, k) => (ms === "binned" ? (100 * M[i].share[k]) / binnedSum[k] : conv(M[i].share[k], k));
  const out = [];
  if (st.by === "phylum") {
    D.phyla.slice(0, 7).forEach((p, j) => out.push({ name: p, colour: `var(--c${j + 1})`, v: S.map((_, k) => M.reduce((s, m, i) => s + (m.phylum === p ? mag(i, k) : 0), 0)) }));
    out.push({ name: "other phyla", colour: "var(--faint)", v: S.map((_, k) => M.reduce((s, m, i) => s + (D.phyla.slice(0, 7).includes(m.phylum) ? 0 : mag(i, k)), 0)) });
  } else {
    const top = byMean.slice(0, 7);
    top.forEach((i, j) => out.push({ name: M[i].name, id: M[i].id, mag: i, colour: `var(--c${j + 1})`, v: S.map((_, k) => mag(i, k)) }));
    out.push({ name: "other MAGs", colour: "var(--faint)", v: S.map((_, k) => byMean.slice(7).reduce((s, i) => s + mag(i, k), 0)) });
  }
  if (ms !== "binned") {
    out.push({ name: "on contigs not in a MAG", colour: "var(--v0)", v: S.map((_, k) => conv(D.on_assembly[k] - binnedSum[k], k)) });
    out.push({ name: "not counted on any contig", colour: "var(--v4)", v: S.map((_, k) => conv(100 - D.on_assembly[k], k)) });
  }
  return out;
}
function drawComp() {
  const host = $("ipComp"), ms = st.measure, gbMode = ms === "gb";
  const W = Math.max(300, host.clientWidth), H = 300, mg = { l: 50, r: 10, t: 26, b: 34 };
  const cs = compCategories(), tot = S.map((_, k) => cs.reduce((s, c) => s + c.v[k], 0));
  const yMax = gbMode ? niceMax(Math.max(...tot)) : 100, step = (W - mg.l - mg.r) / N;
  const X = (k) => mg.l + step * (k + 0.5), Y = (v) => H - mg.b - (v / yMax) * (H - mg.t - mg.b);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Composition of each day's reads" });
  dayAxis(svg, X, mg, W, H, step);
  const ticks = gbMode ? [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => f * yMax) : [0, 20, 40, 60, 80, 100];
  for (const t of ticks) { el("line", { class: "grid", x1: mg.l, x2: W - mg.r, y1: Y(t), y2: Y(t) }, svg); const tx = el("text", { x: mg.l - 6, y: Y(t) + 4, "text-anchor": "end", class: "lbl" }, svg); tx.textContent = gbMode ? `${+t.toFixed(1)}` : `${t}%`; }
  yLabel(svg, gbMode ? "Read bases (Gb)" : MEASURES[ms].axis, mg, H);
  const bw = Math.min(42, step * 0.7);
  S.forEach((_, k) => {
    let y0 = 0;
    for (const c of cs) {
      const v = c.v[k]; if (v <= 0) continue;
      const r = el("rect", { class: "seg", x: X(k) - bw / 2, y: Y(y0 + v), width: bw, height: Math.max(0.5, Y(y0) - Y(y0 + v)), fill: c.colour }, svg);
      if (c.mag !== undefined && st.picked.includes(c.mag)) { r.setAttribute("stroke", "var(--ink)"); r.setAttribute("stroke-width", 1.5); }
      hover(r, () => `<b>${c.mag !== undefined ? magLabel(c.mag) : esc(c.name)}</b><br>Day ${D.day[k]} (${S[k]}, ${esc(dietName(k).toLowerCase())})<br>${gbMode ? `${v.toFixed(2)} Gb of ${D.gb[k]} Gb sequenced` : `${v.toFixed(1)}% of ${ms === "binned" ? "the read bases in MAGs" : "all read bases"}`}${c.mag !== undefined ? "<br>click to pick this MAG" : ""}`, c.mag !== undefined ? () => pick(c.mag) : null);
      y0 += v;
    }
  });
  host.innerHTML = ""; host.appendChild(svg);
  $("ipCompLegend").innerHTML = cs.map((c) => `<span><i class="sw" style="background:${c.colour}"></i>${c.id ? `<i>${esc(c.name)}</i> <span class="mono">${c.id}</span>` : esc(c.name)}</span>`).join("") + `<span>· shaded: second group of days</span>`;
  const note = {
    share: `Each bar is one day's read bases (100%). The MAG parts are the read bases on each MAG's contigs; "on contigs not in a MAG" are read bases counted on contigs that were assembled but not binned, "not counted on any contig" the rest: reads that did not align, and the parts of reads the depth count leaves out (contig ends, poor alignments). mmlong2's read mapping aligned 97.6-98.0% of reads.`,
    binned: `Each bar is only the read bases that land on MAGs, scaled to 100%. This is how most tables of relative abundance are made. A day with more unbinned reads looks the same here: the MAG shares are larger than in "share of all read bases" by the factor 100 / (share in MAGs that day).`,
    gb: `Bars are read bases, not divided by how much was sequenced (${Math.min(...D.gb)} Gb on day 2 to ${Math.max(...D.gb)} Gb on day 4). Their height follows sequencing effort, not the gut: compare with the share views before reading anything into a tall or short bar.`,
  }[ms];
  $("ipCompNote").textContent = note + (st.by === "mag" ? " MAG view: the 7 MAGs with the highest mean share of all read bases over the ten days; the rest are folded into other MAGs." : " Phylum from GTDB; the 5 phyla with the most read bases are named.");
}

// --- picked MAGs over the days
function drawLine() {
  const host = $("ipLine"), ms = st.measure, [A, B] = groups();
  if (!st.picked.length) { host.innerHTML = `<p class="note">Pick a MAG: find it above, click a dot in the change chart, or click a MAG in the bars (group by MAG).</p>`; $("ipLineLegend").innerHTML = ""; $("ipPicked").innerHTML = ""; return; }
  const W = Math.max(300, host.clientWidth), H = 300, mg = { l: 68, r: 12, t: 26, b: 34 }, step = (W - mg.l - mg.r) / N;
  const X = (k) => mg.l + step * (k + 0.5);
  const rows = st.picked.map((i) => S.map((_, k) => val(i, k)));
  const all = rows.flat(), pos = all.filter((v) => v > 0);
  let Y, ticks;
  if (st.log && pos.length) {
    const lo = Math.floor(Math.log10(Math.min(...pos))), hi = Math.ceil(Math.log10(Math.max(...pos))) + (Math.log10(Math.max(...pos)) % 1 === 0 ? 1 : 0);
    Y = (v) => H - mg.b - ((Math.log10(v) - lo) / Math.max(1, hi - lo)) * (H - mg.t - mg.b);
    ticks = []; for (let e = lo; e <= Math.max(hi, lo + 1); e++) ticks.push(10 ** e);
  } else {
    const yMax = niceMax(Math.max(...all) * 1.05 || 1);
    Y = (v) => H - mg.b - (v / yMax) * (H - mg.t - mg.b);
    ticks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => f * yMax);
  }
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Abundance of the picked MAGs on each day" });
  dayAxis(svg, X, mg, W, H, step);
  for (const t of ticks) { el("line", { class: "grid", x1: mg.l, x2: W - mg.r, y1: Y(t), y2: Y(t) }, svg); const tx = el("text", { x: mg.l - 6, y: Y(t) + 4, "text-anchor": "end", class: "lbl" }, svg); tx.textContent = fmtTick(t); }
  yLabel(svg, MEASURES[ms].axis + (st.log ? ", log scale" : ""), mg, H);
  const contiguous = (g) => g.length && g[g.length - 1] - g[0] === g.length - 1;
  st.picked.forEach((i, j) => {
    const colour = cats()[j], row = rows[j], c = change(i, A, B);
    for (const [g, m] of [[A, c.a], [B, c.b]]) if (contiguous(g) && (!st.log || m > 0)) el("line", { class: "mean", x1: X(g[0]) - step * 0.4, x2: X(g[g.length - 1]) + step * 0.4, y1: Y(m), y2: Y(m), stroke: colour }, svg);
    const pts = row.map((v, k) => (st.log && v <= 0 ? null : `${X(k).toFixed(1)},${Y(v).toFixed(1)}`)).filter(Boolean).join(" ");
    el("polyline", { points: pts, fill: "none", stroke: colour, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
    row.forEach((v, k) => {
      if (st.log && v <= 0) return;
      const dot = el("circle", { class: "dot", cx: X(k), cy: Y(v), r: 4.5, fill: colour, stroke: "var(--surface)", "stroke-width": 1.5 }, svg);
      const mb = (M[i].share[k] / 100) * D.gb[k] * 1000;
      hover(dot, () => `<b>${magLabel(i)}</b><br>Day ${D.day[k]} (${S[k]}): ${fmtV(v)}${ms === "gb" ? "" : ` (${MEASURES[ms].label.toLowerCase()})`}<br>${mb.toFixed(mb >= 10 ? 0 : 2)} Mb of read bases, depth ${((mb * 1e6) / M[i].len).toFixed(1)}x over its ${(M[i].len / 1e6).toFixed(2)} Mb`);
    });
  });
  host.innerHTML = ""; host.appendChild(svg);
  $("ipLineLegend").innerHTML = st.picked.map((i, j) => `<span><i class="sw" style="background:${cats()[j]}"></i>${magLabel(i)}</span>`).join("") + `<span>· dashed: mean of each group of days (when its days are consecutive)</span>`;
  drawPicked(A, B);
}
function splitRank(i, A, B) {
  const own = Math.abs(change(i, A, B).lfc), sp = allSplits();
  return { larger: sp.filter(([a, b]) => Math.abs(change(i, a, b).lfc) > own + 1e-9).length, n: sp.length };
}
function drawPicked(A, B) {
  const rows = st.picked.map((i, j) => {
    const c = change(i, A, B), va = A.map((k) => val(i, k)), vb = B.map((k) => val(i, k));
    const overlap = c.lfc >= 0 ? Math.max(...va) >= Math.min(...vb) : Math.max(...vb) >= Math.min(...va);
    const r = splitRank(i, A, B), depth = S.map((_, k) => ((M[i].share[k] / 100) * D.gb[k] * 1e9) / M[i].len);
    return `<tr><td><i class="sw" style="background:${cats()[j]}"></i>${magLabel(i)}<div class="tax">${esc(M[i].phylum)} · ${M[i].q} · mean ${meanShare[i].toFixed(meanShare[i] >= 0.1 ? 2 : 3)}% of all read bases · <button class="link" data-unpick="${i}">remove</button></div></td>
      <td class="r">${fmtV(c.a)}</td><td class="r">${fmtV(c.b)}</td><td class="r">${ratioTxt(c.a, c.b)}<div class="tax">chart: log2 ${c.lfc.toFixed(2)}</div></td>
      <td>${overlap ? "overlap" : "no overlap"}</td><td class="r">${r.larger} of ${r.n}</td><td class="r">${Math.min(...depth).toFixed(1)}-${Math.max(...depth).toFixed(1)}x</td></tr>`;
  }).join("");
  $("ipPicked").innerHTML = `<div class="scroll"><table class="ct picked"><thead><tr><th>MAG</th><th class="r">First group</th><th class="r">Second group</th><th class="r">Ratio of means</th><th>Days overlap?</th><th class="r">Larger splits</th><th class="r">Depth</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="note">Group means of the measure shown. First group: ${daysText(A)}; second group: ${daysText(B)}. Ratio of means: second group mean divided by the first; the change chart adds ${st.measure === "gb" ? "1.66 Mb" : D.pseudo + "%"} to both means first (log2 value below), which shrinks the changes of rare MAGs. "No overlap": every day of the higher group is above every day of the lower group. Larger splits: the ten days, ignoring their order, divided every possible way into groups of these sizes and ranked by the size of the change (log2, either direction); the number shows how many splits give this MAG a larger change. Days follow each other in time and are not interchangeable, so this is not a p-value: 0 only says the change is consistent across the days, as a step or a steady trend. Depth: read bases on the MAG that day divided by the MAG's length, lowest and highest day.</p>`;
  for (const b of $("ipPicked").querySelectorAll("[data-unpick]")) b.addEventListener("click", () => pick(+b.dataset.unpick));
}

// --- change between the groups, per MAG
function drawChange() {
  const host = $("ipChange"), ms = st.measure, [A, B] = groups();
  const W = Math.max(300, host.clientWidth), H = 340, mg = { l: 64, r: 12, t: 12, b: 38 };
  const pts = M.map((_, i) => { const c = change(i, A, B), m = mean(S.map((_, k) => val(i, k))); return { i, x: Math.log10(Math.max(m, 1e-4)), y: c.lfc, c, m }; });
  const xs = pts.map((p) => p.x), x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs));
  const yl = Math.max(2, Math.ceil(Math.max(...pts.map((p) => Math.abs(p.y)))));
  const X = (v) => mg.l + ((v - x0) / (x1 - x0)) * (W - mg.l - mg.r), Y = (v) => H - mg.b - ((v + yl) / (2 * yl)) * (H - mg.t - mg.b);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Change of each MAG between the two groups of days against its mean abundance" });
  for (let e = x0; e <= x1; e++) { el("line", { class: "grid", x1: X(e), x2: X(e), y1: mg.t, y2: H - mg.b }, svg); const t = el("text", { x: X(e), y: H - mg.b + 14, "text-anchor": "middle", class: "lbl" }, svg); t.textContent = fmtTick(10 ** e); }
  const yStep = yl > 6 ? 2 : 1;
  for (let e = -yl; e <= yl; e += yStep) { el("line", { class: Math.abs(e) === 1 ? "ref" : "grid", x1: mg.l, x2: W - mg.r, y1: Y(e), y2: Y(e) }, svg); const t = el("text", { x: mg.l - 6, y: Y(e) + 4, "text-anchor": "end", class: "lbl" }, svg); t.textContent = foldTick(e); }
  if (yStep === 2) for (const e of [-1, 1]) el("line", { class: "ref", x1: mg.l, x2: W - mg.r, y1: Y(e), y2: Y(e) }, svg);
  if (ms === "share") { const xv = Math.log10(D.min_mean); el("line", { class: "ref", x1: X(xv), x2: X(xv), y1: mg.t, y2: H - mg.b }, svg); }
  const xt = el("text", { x: (mg.l + W - mg.r) / 2, y: H - 4, "text-anchor": "middle", class: "lbl" }, svg); xt.textContent = `Mean over the ten days: ${MEASURES[ms].label.toLowerCase()} (log scale)`;
  yLabel(svg, "Second group against first (log scale)", mg, H);
  const order = pts.slice().sort((a, b) => (considered[a.i] - considered[b.i]) || (st.picked.includes(a.i) - st.picked.includes(b.i)));
  for (const p of order) {
    const on = considered[p.i], pk = st.picked.indexOf(p.i);
    const dot = el("circle", { class: "dot", cx: X(p.x), cy: Y(p.y), r: pk >= 0 ? 5.5 : on ? 3.6 : 2.6, fill: phylumColour(M[p.i].phylum), "fill-opacity": on ? 0.85 : 0.35 }, svg);
    if (pk >= 0) { dot.setAttribute("stroke", "var(--ink)"); dot.setAttribute("stroke-width", 2); dot.setAttribute("fill-opacity", 1); }
    hover(dot, () => `<b>${magLabel(p.i)}</b><br>${esc(M[p.i].phylum)} · mean ${fmtV(p.m)}<br>first group ${fmtV(p.c.a)}, second ${fmtV(p.c.b)}<br>ratio of means: ${ratioTxt(p.c.a, p.c.b)}<br>chart (with ${D.pseudo}% added): ${fold(p.c.lfc)}, log2 ${p.c.lfc.toFixed(2)}${on ? "" : `<br>mean below ${D.min_mean}% of all read bases`}<br>click to pick`, () => pick(p.i));
  }
  host.innerHTML = ""; host.appendChild(svg);
  $("ipChangeLegend").innerHTML = D.phyla.slice(0, 7).map((p, j) => `<span><i class="sw" style="background:var(--c${j + 1})"></i>${esc(p)}</span>`).join("") + `<span><i class="sw" style="background:var(--faint)"></i>other phyla</span><span>· faint dots: mean below ${D.min_mean}% of all read bases · ringed: picked</span>`;
  // counts for this split and for every other split of the same sizes
  const cnt = (a, b) => { let up = 0, down = 0; M.forEach((_, i) => { if (!considered[i]) return; const l = change(i, a, b).lfc; if (l >= 1) up++; else if (l <= -1) down++; }); return [up, down]; };
  const [up, down] = cnt(A, B), nCons = considered.filter(Boolean).length;
  let lowN = 0, lowCh = 0; M.forEach((_, i) => { if (considered[i]) return; lowN++; if (Math.abs(change(i, A, B).lfc) >= 1) lowCh++; });
  const sp = allSplits().map(([a, b]) => cnt(a, b).reduce((x, y) => x + y, 0)).sort((a, b) => a - b), own = up + down;
  const larger = sp.filter((v) => v > own).length, same = sp.filter((v) => v === own).length, med = sp[Math.floor((sp.length - 1) / 2)];
  const p = pseudo(), pTxt = ms === "gb" ? `${p.toFixed(2)} Mb (0.01% of a mean day)` : `${p}%`;
  $("ipChangeNote").textContent = `Second group (${daysText(B)}) against the first (${daysText(A)}). Change = (mean in the second group + ${pTxt}) / (mean in the first + ${pTxt}), on a log scale; the small amount added keeps a MAG absent from one group from an endless change. Dashed lines: two-fold. Of the ${nCons} MAGs with a mean of ${D.min_mean}% or more of all read bases, ${up} ${up === 1 ? "is" : "are"} at least two-fold higher and ${down} at least two-fold lower; of the ${lowN} rarer MAGs, ${lowCh} change two-fold or more (fewer, partly because the added amount shrinks the changes of rare MAGs). Over all ${sp.length} ways to divide the ten days into groups of ${A.length} and ${B.length}, the number of MAGs (of ${nCons}) with a two-fold change runs from ${sp[0]} to ${sp[sp.length - 1]} (median ${med}); ${larger} split${larger === 1 ? "" : "s"} give${larger === 1 ? "s" : ""} more than this one${same > 1 ? ` and ${same - 1} as many` : ""}.`;
}

// --- Bray-Curtis between days
function drawBc() {
  const host = $("ipBc"), [A, B] = groups(), bc = D.bc;
  const W = Math.min(Math.max(300, host.clientWidth), 520), mg = { l: 34, t: 22 }, cell = (W - mg.l - 4) / N, H = mg.t + cell * N + 4;
  let max = 0; for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) if (a !== b) max = Math.max(max, bc[a][b]);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Bray-Curtis dissimilarity between each pair of days" });
  for (let k = 0; k < N; k++) {
    for (const [x, y, anchor] of [[mg.l + cell * (k + 0.5), mg.t - 7, "middle"], [mg.l - 6, mg.t + cell * (k + 0.5) + 4, "end"]]) {
      const t = el("text", { x, y, "text-anchor": anchor, class: "lbl" }, svg); t.textContent = D.day[k]; if (st.B.has(k)) { t.style.fontWeight = 600; t.style.fill = "var(--accent)"; }
    }
  }
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
    const x = mg.l + cell * b, y = mg.t + cell * a, v = bc[a][b];
    if (a === b) { el("rect", { class: "cell", x, y, width: cell, height: cell, fill: "var(--v4)" }, svg); continue; }
    const t = v / max, r = el("rect", { class: "cell seg", x, y, width: cell, height: cell, fill: viridis(t) }, svg);
    if (cell >= 30) { const tx = el("text", { x: x + cell / 2, y: y + cell / 2 + 4, "text-anchor": "middle", style: `fill:${t > 0.6 ? "#15212b" : "#ffffff"};font-size:${cell >= 40 ? 11 : 9.5}px;pointer-events:none` }, svg); tx.textContent = v.toFixed(2); }
    const same = st.B.has(a) === st.B.has(b);
    hover(r, () => `Day ${D.day[a]} and day ${D.day[b]}: <b>${v.toFixed(3)}</b><br>${same ? "same group" : "different groups"}`);
  }
  host.innerHTML = ""; host.appendChild(svg);
  $("ipBcLegend").innerHTML = `<span>Bray-Curtis dissimilarity</span><span class="ramp" style="background:linear-gradient(90deg,${VIRIDIS.join(",")})"></span><span>0 → ${max.toFixed(2)}</span><span>· days of the second group in bold</span>`;
  const pairs = (g, h) => { const v = []; for (const a of g) for (const b of h) if (a < b || g !== h) v.push(bc[a][b]); return v; };
  const wA = pairs(A, A), wB = pairs(B, B), bt = pairs(A, B), cons = S.slice(1).map((_, k) => bc[k][k + 1]);
  const f = (v) => (v.length ? mean(v).toFixed(2) : "–"), big = cons.indexOf(Math.max(...cons));
  const sw = D.diet.findIndex((d) => d !== D.diet[0]);
  $("ipBcNote").textContent = `0 means two days have the same MAG composition, 1 that they share nothing. Computed on the share of read bases in MAGs (each day scaled to 100%), so the measure setting does not change it. Mean within the first group ${f(wA)}, within the second ${f(wB)}, between the groups ${f(bt)}. Consecutive days differ by ${Math.min(...cons).toFixed(2)}-${Math.max(...cons).toFixed(2)} (largest: day ${D.day[big]} to ${D.day[big + 1]}; the diet switch, day ${D.day[sw - 1]} to ${D.day[sw]}: ${cons[sw - 1].toFixed(2)}).`;
}

function draw(push = true) {
  for (const b of $("ipDays").querySelectorAll("[data-day]")) b.setAttribute("aria-pressed", st.B.has(+b.dataset.day));
  $("ipMeasure").value = st.measure; $("ipBy").value = st.by; $("ipLog").checked = st.log;
  hideTip();
  drawComp(); drawLine(); drawChange(); drawBc();
  if (push) writeHashParams(stateHash());
}

// --- start
const examples = setupExamples($("ipExamples"), (k) => { applyState(EXAMPLES[k].state); draw(); });
setup();
(function start() {
  const s = readHashParams(), ex = parseInt(s.ex, 10);
  const valid = ex >= 1 && ex <= EXAMPLES.length;
  if (valid) { examples.current = ex - 1; examples.draw(); }
  applyState(valid ? { ...EXAMPLES[ex - 1].state, ...s } : s);  // a bare #?ex=4 opens the example's own setup
  draw(false);
})();
let resizeTimer;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => draw(false), 150); });
