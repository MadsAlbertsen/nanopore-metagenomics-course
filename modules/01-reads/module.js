// Module 1: raw reads. DATA from the example analysis (np26 scripts/27_course_reads.py): samples (per sample: sampled
// reads, filter and trimming results, full-run numbers), reads (one entry per sampled raw read: sample, length, mean Q
// rounded down to 0.1, where it aligns), mapping, profile (mean Q along read starts and ends),
// starts (reads that kept barcode and adapter), joins (reads Porechop_ABI split), adapters (checks and positions).
const S = DATA.samples, R = DATA.reads, NR = R.len.length, AD = DATA.adapters;
const num = (n) => Number(n).toLocaleString("en");
const pct = (a, b, d = 1) => (b ? `${((100 * a) / b).toFixed(d)}%` : "–");
const gb = (n) => `${(n / 1e9).toFixed(1)} Gb`;
const mb = (n) => `${(n / 1e6).toFixed(1)} Mb`;
const LOGLEN = R.len.map((l) => Math.log10(Math.max(l, 1)));
const LENS = [0, 200, 500, 1000, 2000, 3000, 5000, 10000];
const DEFAULTS = { sample: "all", unit: "reads", q: 10, len: 1000, start: 0, join: 0 };
const st = { ...DEFAULTS };
const SEG = { flank: "var(--c5)", barcode: "var(--c4)", adapter: "var(--c2)", genome: "var(--c1)" };
const width = (id, min = 280) => Math.max(min, $(id).clientWidth || min);

// --- numbers in the text, all from the data
function fillNumbers() {
  const sum = (k, f = (s) => s[k]) => S.reduce((a, s) => a + f(s), 0);
  const reads = sum("reads"), bases = sum("bases"), kept = sum("kept_reads"), keptB = sum("kept_bases");
  const full = (k) => sum(null, (s) => s.full[k]);
  const fa = AD.first_aligned, noad = fa["no adapter"], tot = noad.reduce((a, b) => a + b, 0);
  const m = Object.fromEntries(DATA.mapping.map((r) => [r.group, r]));
  const t = AD.start_trim_with_adapter, mid = AD.middle;
  const fp = S.map((s) => s.full.porechop.pct_reads_start_trimmed), fs = S.map((s) => s.full.porechop.pct_reads_split);
  const kinds = {}; for (const j of DATA.joins) kinds[j.kind] = (kinds[j.kind] || 0) + 1;
  const order = R.len.map((l, i) => i).sort((a, b) => R.len[b] - R.len[a]);
  const low = []; for (const i of order) { if (R.q[i] >= 4) break; low.push(R.len[i]); }
  const rng = (a, d = 2) => `${Math.min(...a).toFixed(d)}-${Math.max(...a).toFixed(d)}%`;
  const N = {
    startNear: pct(noad[0] + noad[1], tot, 0), adStart: `${num(sum("adapter_start"))} (${pct(sum("adapter_start"), reads)})`,
    bcAdStart: num(sum("barcode_adapter_start")),
    keptMag: pct(m.kept.mag_bp, m.kept.bases, 0),
    longest: low.length > 1 ? `${low.length} longest raw reads (${fmtBp(Math.min(...low))} to ${fmtBp(Math.max(...low))})` : "longest raw read",
    adReads: num(t.adapter_reads), adWithin: num(t.within_5bp), otherMed: t.other_trim_median, otherTrim: num(t.other_trimmed),
    trimBases: pct(t.bases_trimmed, t.bases_kept_reads, 2), fullStart: rng(fp, 0) + " of reads per sample",
    fullBases: pct(full("filtered_bases") - full("trimmed_bases"), full("filtered_bases"), 2),
    split: `${mid.porechop_split} (${pct(mid.porechop_split, mid.kept_reads, 2)})`, splitFull: rng(fs),
    midHere: mid.found_here, midBoth: mid.both, kTwo: kinds["two MAGs"] || 0, kBoth: kinds["same stretch, both strands"] || 0, kOne: kinds["one piece kept"] || 0,
  };
  for (const e of document.querySelectorAll("[data-n]")) e.textContent = N[e.dataset.n] ?? "?";
  $("rdStats").innerHTML = [
    [num(reads), "reads sampled (10 samples)"], [pct(kept, reads, 0), "of reads kept by the filter"], [pct(keptB, bases, 0), "of bases kept"],
    [gb(full("est_bases")), "in the full run (estimated from the samples)"], [pct(mid.porechop_split, mid.kept_reads, 1), "of kept reads split"],
  ].map(([n, t2]) => `<div class="stat"><b>${n}</b><span>${t2}</span></div>`).join("");
}

// --- 1. read layout drawing
function drawLayout() {
  const w = width("rdLayout", 520), h = 112, svg = el("svg", { width: w, height: h, role: "img", "aria-label": "Layout of a rapid barcoding read" });
  const parts = [["flank", 16, "front flank"], ["barcode", 24, "barcode (24 bp)"], ["adapter", 50, "rapid adapter (50 bp)"], ["genome", 150, "genome →"]];
  const total = parts.reduce((a, p) => a + p[1], 0), x0 = 4, sc = (w - 8) / total;
  const row = (y, list, label) => {
    let x = x0;
    el("text", { x: x0, y: y - 6, class: "lbl" }, svg).textContent = label;
    for (const [k, n, name] of list) {
      const r = el("rect", { x, y, width: n * sc - 2, height: 22, rx: 3, fill: SEG[k], "fill-opacity": k === "genome" ? 0.35 : 0.8 }, svg);
      r.addEventListener("mousemove", (ev) => showTip(ev, `<b>${esc(name)}</b>${k === "adapter" ? `<br><span class="mono">${DATA.rapid_adapter}</span>` : ""}`));
      r.addEventListener("mouseleave", hideTip);
      if (n * sc > 60) { const t = el("text", { x: x + 6, y: y + 15, class: "lbl" }, svg); t.textContent = name; t.style.fill = "var(--ink)"; }
      x += n * sc;
    }
  };
  row(20, parts, "Read as it leaves the pore (start of the molecule on the left)");
  row(76, [["genome", total, "genome → (barcode region cut off when the reads were sorted by barcode)"]], "Most reads after sorting by barcode");
  $("rdLayout").replaceChildren(svg);
}

// --- bar chart of where the genome starts
function drawFirst() {
  const fa = AD.first_aligned, w = width("rdFirst"), h = 190, m = { l: 40, r: 8, t: 8, b: 30 };
  const groups = [["no adapter", "var(--c1)"], ["adapter", "var(--c2)"]];
  const n = fa["adapter"].length, shares = groups.map(([k]) => { const t = fa[k].reduce((a, b) => a + b, 0); return fa[k].map((v) => v / t); });
  const ymax = Math.max(...shares.flat()), bw = (w - m.l - m.r) / n;
  const svg = el("svg", { width: w, height: h, role: "img", "aria-label": "Read bases before the first alignment" });
  const y = (v) => h - m.b - (v / ymax) * (h - m.t - m.b);
  for (const t of [0, 0.25, 0.5]) if (t <= ymax) { el("line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), class: "grid" }, svg); el("text", { x: m.l - 4, y: y(t) + 4, "text-anchor": "end", class: "lbl" }, svg).textContent = `${t * 100}%`; }
  shares.forEach((sh, gi) => sh.forEach((v, i) => {
    const r = el("rect", { x: m.l + i * bw + gi * bw / 2, y: y(v), width: Math.max(1, bw / 2 - 1), height: h - m.b - y(v), fill: groups[gi][1] }, svg);
    const lo = i * fa.step, lab = i === n - 1 ? `${fa.top}+` : `${lo}-${lo + fa.step - 1}`;
    r.addEventListener("mousemove", (ev) => showTip(ev, `${groups[gi][0]}: ${lab} bases before the genome<br>${num(fa[groups[gi][0]][i])} reads (${(v * 100).toFixed(1)}%)`));
    r.addEventListener("mouseleave", hideTip);
  }));
  for (let i = 0; i < n; i += 4) el("text", { x: m.l + i * bw, y: h - m.b + 14, class: "lbl" }, svg).textContent = i === n - 1 ? `${fa.top}+` : i * fa.step;
  el("text", { x: (w + m.l) / 2, y: h - 2, "text-anchor": "middle", class: "lbl" }, svg).textContent = "read bases before the first alignment";
  $("rdFirst").replaceChildren(svg);
}

// --- 2. one read start, base by base
function drawStart() {
  const s = DATA.starts[st.start];
  $("rdStartPick").innerHTML = DATA.starts.map((r, k) => `<button role="listitem" data-k="${k}" aria-current="${k === st.start}">${r.sample}</button>`).join("");
  if (!s) { $("rdStart").replaceChildren(); return; }
  const per = Math.max(30, Math.floor((width("rdStart", 360) - 20) / 11)), cw = 11, rowH = 64, rows = Math.ceil(s.seq.length / per);
  const svg = el("svg", { width: per * cw + 20, height: rows * rowH + 6, role: "img", "aria-label": "Bases and qualities of a read start" });
  const [bs, be] = s.barcode, [as, ae] = s.adapter;
  const region = (i) => (i >= s.genome ? "genome" : i >= as && i < ae ? "adapter" : i >= bs && i < be ? "barcode" : i < bs ? "flank" : "");
  for (let i = 0; i < s.seq.length; i++) {
    const r = Math.floor(i / per), x = 10 + (i % per) * cw, y0 = r * rowH + 4, reg = region(i), q = s.qual[i];
    if (reg) el("rect", { x, y: y0, width: cw, height: 18, fill: SEG[reg], "fill-opacity": reg === "genome" ? 0.18 : 0.3 }, svg);
    const t = el("text", { x: x + cw / 2, y: y0 + 13, "text-anchor": "middle", class: "mlbl" }, svg); t.textContent = s.seq[i]; t.style.fill = "var(--ink)";
    const bh = Math.min(q, 40) / 40 * 30;
    const b = el("rect", { x: x + 1, y: y0 + 52 - bh, width: cw - 2, height: Math.max(bh, 1), fill: viridis(Math.min(q, 40) / 40) }, svg);
    b.addEventListener("mousemove", (ev) => showTip(ev, `base ${i + 1}: ${s.seq[i]}, Q ${q} (${reg || "between barcode and adapter"})`));
    b.addEventListener("mouseleave", hideTip);
    if (i === s.genome) el("path", { d: `M${x},${y0 - 1} l5,-5 h-10 z`, fill: "var(--ink)" }, svg);
    if (i === s.trim) el("line", { x1: x, x2: x, y1: y0, y2: y0 + 54, stroke: "var(--ink)", "stroke-dasharray": "3 2" }, svg);
  }
  $("rdStart").replaceChildren(svg);
  $("rdStartNote").innerHTML = `Sample ${s.sample} (barcode ${s.barcode[3]}), read of ${num(s.length)} bp, mean Q ${s.q}. ` +
    `Barcode at bases ${bs + 1}-${be} (${s.barcode[2]} differences), rapid adapter at ${as + 1}-${ae} (${s.adapter[2]} differences); ` +
    `the read aligns to contig ${esc(s.contig)} of MAG ${esc(s.mag)} (<i>${esc(s.mag_name)}</i>) from base ${s.genome + 1}; Porechop_ABI cut after base ${s.trim}. ` +
    `<span class="sw" style="background:${SEG.flank}"></span>flank remnant <span class="sw" style="background:${SEG.barcode}"></span>barcode <span class="sw" style="background:${SEG.adapter}"></span>adapter <span class="sw" style="background:${SEG.genome};opacity:.5"></span>genome. Bars: quality per base (height and colour, Q 0-40).`;
}

// --- mean Q along the read
function drawProfile() {
  const P = DATA.profile, w = width("rdProfile"), h = 220, m = { l: 34, r: 8, t: 10, b: 34 }, gap = 16;
  const pw = (w - m.l - m.r - gap) / 2, n = P["adapter"].start.length, ymax = 25;
  const svg = el("svg", { width: w, height: h, role: "img", "aria-label": "Mean quality along read start and end" });
  const y = (v) => h - m.b - (Math.min(v, ymax) / ymax) * (h - m.t - m.b);
  for (const t of [0, 10, 20]) { el("line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), class: "grid" }, svg); el("text", { x: m.l - 4, y: y(t) + 4, "text-anchor": "end", class: "lbl" }, svg).textContent = t; }
  const panels = [["start", m.l, "first 300 bases (base number)", (i) => i + 1], ["end", m.l + pw + gap, "last 300 bases (bases from the end)", (i) => n - i]];
  for (const [key, x0, title, lab] of panels) {
    const x = (i) => x0 + (i / (n - 1)) * pw;
    for (const [g, c] of [["no adapter", "var(--c1)"], ["adapter", "var(--c2)"]]) {
      el("path", { d: P[g][key].map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(""), class: "prm", stroke: c, style: "stroke-width:2" }, svg);
    }
    for (const i of [0, 99, 199, 299]) el("text", { x: x(i), y: h - m.b + 14, "text-anchor": i === 0 ? "start" : i === n - 1 ? "end" : "middle", class: "lbl" }, svg).textContent = key === "start" ? lab(i) : n - i;
    el("text", { x: x0 + pw / 2, y: h - 4, "text-anchor": "middle", class: "lbl" }, svg).textContent = title;
    const hit = el("rect", { x: x0, y: m.t, width: pw, height: h - m.t - m.b, fill: "transparent" }, svg);
    hit.addEventListener("mousemove", (ev) => {
      const r = hit.getBoundingClientRect(), i = Math.max(0, Math.min(n - 1, Math.round(((ev.clientX - r.left) / r.width) * (n - 1))));
      showTip(ev, `${key === "start" ? `base ${i + 1}` : `${n - i} from the end`}<br>no adapter: Q ${P["no adapter"][key][i].toFixed(1)}<br>adapter: Q ${P["adapter"][key][i].toFixed(1)}`);
    });
    hit.addEventListener("mouseleave", hideTip);
  }
  $("rdProfile").replaceChildren(svg);
}

// --- 3. filter: histograms, heat map, summary, table
const keep = (i) => R.q[i] >= st.q && R.len[i] >= st.len;
const inSample = (i) => st.sample === "all" || S[R.s[i]].sample === st.sample;
const weight = (i) => (st.unit === "bases" ? R.len[i] : 1);
function hist(svgId, value, lo, hi, step, cut, xlab, ticks) {
  const n = Math.round((hi - lo) / step), kept = new Float64Array(n), gone = new Float64Array(n);
  for (let i = 0; i < NR; i++) {
    if (!inSample(i)) continue;
    const b = Math.max(0, Math.min(n - 1, Math.floor((value(i) - lo) / step)));
    (keep(i) ? kept : gone)[b] += weight(i);
  }
  const w = width(svgId), h = 200, m = { l: 46, r: 8, t: 8, b: 32 }, bw = (w - m.l - m.r) / n;
  const ymax = Math.max(1, ...kept.map((v, i) => v + gone[i]));
  const svg = el("svg", { width: w, height: h, role: "img", "aria-label": xlab });
  const y = (v) => h - m.b - (v / ymax) * (h - m.t - m.b);
  el("line", { x1: m.l, x2: w - m.r, y1: y(0), y2: y(0), class: "grid" }, svg);
  el("text", { x: m.l - 4, y: y(ymax) + 8, "text-anchor": "end", class: "lbl" }, svg).textContent = st.unit === "bases" ? mb(ymax) : num(ymax);
  for (let b = 0; b < n; b++) {
    const x = m.l + b * bw, t = kept[b] + gone[b];
    if (!t) continue;
    el("rect", { x, y: y(t), width: Math.max(1, bw - 0.5), height: y(kept[b]) - y(t), fill: "var(--v4)" }, svg);
    el("rect", { x, y: y(kept[b]), width: Math.max(1, bw - 0.5), height: y(0) - y(kept[b]), fill: "var(--c1)" }, svg);
    const hit = el("rect", { x, y: m.t, width: bw, height: h - m.t - m.b, fill: "transparent" }, svg);
    const v0 = lo + b * step, f = (v) => (svgId === "rdLenH" ? fmtBp(Math.round(10 ** v)) : v.toFixed(0));
    hit.addEventListener("mousemove", (ev) => showTip(ev, `${f(v0)} to ${f(v0 + step)}<br>kept ${st.unit === "bases" ? mb(kept[b]) : num(kept[b])}, removed ${st.unit === "bases" ? mb(gone[b]) : num(gone[b])}`));
    hit.addEventListener("mouseleave", hideTip);
  }
  const xc = m.l + ((cut - lo) / (hi - lo)) * (w - m.l - m.r);
  if (cut > lo) el("line", { x1: xc, x2: xc, y1: m.t, y2: h - m.b, stroke: "var(--ink)", "stroke-width": 1.5, "stroke-dasharray": "4 3" }, svg);
  for (const [v, t] of ticks) el("text", { x: m.l + ((v - lo) / (hi - lo)) * (w - m.l - m.r), y: h - m.b + 14, "text-anchor": "middle", class: "lbl" }, svg).textContent = t;
  el("text", { x: (w + m.l) / 2, y: h - 2, "text-anchor": "middle", class: "lbl" }, svg).textContent = xlab;
  $(svgId).replaceChildren(svg);
}
function drawHeat() {
  const x0 = 2, x1 = 5.7, xs = 0.1, y0 = 0, y1 = 36, ys = 1, nx = Math.round((x1 - x0) / xs), ny = (y1 - y0) / ys;
  const grid = new Float64Array(nx * ny);
  for (let i = 0; i < NR; i++) {
    if (!inSample(i)) continue;
    const bx = Math.max(0, Math.min(nx - 1, Math.floor((LOGLEN[i] - x0) / xs))), by = Math.max(0, Math.min(ny - 1, Math.floor((R.q[i] - y0) / ys)));
    grid[by * nx + bx] += weight(i);
  }
  const w = width("rdHeat"), h = 200, m = { l: 30, r: 8, t: 8, b: 32 }, cw = (w - m.l - m.r) / nx, ch = (h - m.t - m.b) / ny;
  const mx = Math.log10(Math.max(...grid) + 1), svg = el("svg", { width: w, height: h, role: "img", "aria-label": "Reads by length and mean quality" });
  for (let by = 0; by < ny; by++) for (let bx = 0; bx < nx; bx++) {
    const v = grid[by * nx + bx];
    if (!v) continue;
    const r = el("rect", { x: m.l + bx * cw, y: h - m.b - (by + 1) * ch, width: cw + 0.3, height: ch + 0.3, fill: viridis(Math.log10(v + 1) / mx) }, svg);
    r.addEventListener("mousemove", (ev) => showTip(ev, `${fmtBp(Math.round(10 ** (x0 + bx * xs)))} to ${fmtBp(Math.round(10 ** (x0 + (bx + 1) * xs)))}, Q ${by}-${by + 1}<br>${st.unit === "bases" ? mb(v) : num(v) + " reads"}`));
    r.addEventListener("mouseleave", hideTip);
  }
  const xl = m.l + ((Math.log10(Math.max(st.len, 100)) - x0) / (x1 - x0)) * (w - m.l - m.r), yq = h - m.b - ((st.q - y0) / (y1 - y0)) * (h - m.t - m.b);
  if (st.len > 100) el("line", { x1: xl, x2: xl, y1: m.t, y2: h - m.b, stroke: "var(--ink)", "stroke-width": 1.5, "stroke-dasharray": "4 3" }, svg);
  if (st.q > 0) el("line", { x1: m.l, x2: w - m.r, y1: yq, y2: yq, stroke: "var(--ink)", "stroke-width": 1.5, "stroke-dasharray": "4 3" }, svg);
  for (const [v, t] of [[2, "100 bp"], [3, "1 kb"], [4, "10 kb"], [5, "100 kb"]]) el("text", { x: m.l + ((v - x0) / (x1 - x0)) * (w - m.l - m.r), y: h - m.b + 14, "text-anchor": "middle", class: "lbl" }, svg).textContent = t;
  for (const v of [0, 10, 20, 30]) el("text", { x: m.l - 4, y: h - m.b - ((v - y0) / (y1 - y0)) * (h - m.t - m.b) + 4, "text-anchor": "end", class: "lbl" }, svg).textContent = v;
  el("text", { x: (w + m.l) / 2, y: h - 2, "text-anchor": "middle", class: "lbl" }, svg).textContent = "read length (log scale) × mean Q";
  $("rdHeat").replaceChildren(svg);
  $("rdHeatUnit").textContent = st.unit === "bases" ? "Bases per cell" : "Reads per cell";
}
function drawFilter() {
  $("rdQv").textContent = st.q;
  hist("rdLenH", (i) => LOGLEN[i], 1.5, 6, 0.1, Math.log10(Math.max(st.len, 32)), "read length (log scale)", [[2, "100 bp"], [3, "1 kb"], [4, "10 kb"], [5, "100 kb"], [6, "1 Mb"]]);
  hist("rdQH", (i) => R.q[i], 0, 40, 1, st.q, "mean Q of the read", [[0, "0"], [10, "10"], [20, "20"], [30, "30"], [40, "40"]]);
  drawHeat();
  let r = 0, rk = 0, b = 0, bk = 0;
  for (let i = 0; i < NR; i++) { if (!inSample(i)) continue; r++; b += R.len[i]; if (keep(i)) { rk++; bk += R.len[i]; } }
  const who = st.sample === "all" ? "all ten samples" : st.sample;
  $("rdSum").innerHTML = `Mean Q ${st.q} or more and ${num(st.len)} bp or more, ${who}: removes <b>${num(r - rk)} of ${num(r)} reads (${pct(r - rk, r)})</b> but only <b>${mb(b - bk)} of ${mb(b)} (${pct(b - bk, b)}) of the bases</b>.`;
  drawTable();
}
function n50(lens) {
  const s = lens.slice().sort((a, b) => b - a), half = s.reduce((a, v) => a + v, 0) / 2;
  let c = 0; for (const v of s) { c += v; if (c >= half) return v; } return 0;
}
function drawTable() {
  const rows = S.map((s, k) => {
    const all = [], kept = [];
    for (let i = 0; i < NR; i++) if (R.s[i] === k) { all.push(R.len[i]); if (keep(i)) kept.push(R.len[i]); }
    const b = all.reduce((a, v) => a + v, 0), bk = kept.reduce((a, v) => a + v, 0), f = s.full;
    return `<tr${st.sample === s.sample ? ' class="hl"' : ""}><td>${s.sample}</td><td class="r">${s.day}</td><td>${s.diet.replace("_", " ")}</td><td class="r">${num(all.length)}</td><td class="r">${pct(kept.length, all.length, 0)}</td><td class="r">${pct(bk, b, 0)}</td>` +
      `<td class="r">${fmtBp(n50(all))}</td><td class="r">${kept.length ? fmtBp(n50(kept)) : "–"}</td><td class="r">${s.median_q}</td>` +
      `<td class="r">${(f.reads_in_bam / 1e6).toFixed(2)} M</td><td class="r">${gb(f.est_bases)}</td><td class="r">${(f.filtered_reads / 1e6).toFixed(2)} M</td><td class="r">${gb(f.filtered_bases)}</td><td class="r">${fmtBp(f.filtered_n50)}</td><td class="r">${gb(f.trimmed_bases)}</td></tr>`;
  }).join("");
  $("rdTable").innerHTML = `<table class="ct"><thead><tr><th colspan="3"></th><th colspan="6">Sampled reads (current cut-offs)</th><th colspan="6">Full run</th></tr>
    <tr><th>Sample</th><th class="r">Day</th><th>Diet</th><th class="r">Reads</th><th class="r">Reads kept</th><th class="r">Bases kept</th><th class="r">N50 all</th><th class="r">N50 kept</th><th class="r">Median Q</th>
    <th class="r">Reads</th><th class="r">Bases (est.)</th><th class="r">Reads Q10, 1 kb</th><th class="r">Bases Q10, 1 kb</th><th class="r">N50 Q10, 1 kb</th><th class="r">Bases trimmed</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// --- 4. alignment of kept and removed reads; 5. trimming per sample
function drawMap() {
  const label = { kept: "Kept (Q 10, 1,000 bp)", "low quality": "Removed: mean Q below 10", short: "Removed: Q 10 or more, shorter than 1,000 bp", all: "All sampled reads" };
  $("rdMap").innerHTML = `<table class="ct"><thead><tr><th>Reads</th><th class="r">Reads</th><th class="r">Bases</th><th class="r">Median length</th><th class="r">Median Q</th><th class="r">Reads aligned</th><th class="r">Reads on MAG contigs</th><th class="r">Bases on MAG contigs</th></tr></thead><tbody>` +
    DATA.mapping.map((r) => `<tr><td>${label[r.group]}</td><td class="r">${num(r.reads)}</td><td class="r">${mb(r.bases)}</td><td class="r">${fmtBp(r.median_length)}</td><td class="r">${r.median_q}</td><td class="r">${pct(r.mapped, r.reads)}</td><td class="r">${pct(r.on_mag, r.reads)}</td><td class="r">${pct(r.mag_bp, r.bases)}</td></tr>`).join("") +
    `</tbody></table><p class="note">Reads on MAG contigs: at least one alignment to a contig in a MAG. Bases on MAG contigs: read bases inside such alignments, as a share of all bases of the group.</p>`;
}
function drawTrim() {
  $("rdTrim").innerHTML = `<table class="ct"><thead><tr><th></th><th colspan="4">Sampled reads after the filter</th><th colspan="3">Full run</th></tr><tr><th>Sample</th><th class="r">Adapter at start</th><th class="r">Start trimmed</th><th class="r">End trimmed</th><th class="r">Split</th><th class="r">Start trimmed</th><th class="r">End trimmed</th><th class="r">Split</th></tr></thead><tbody>` +
    S.map((s) => { const p = s.full.porechop; return `<tr><td>${s.sample}</td><td class="r">${pct(s.adapter_start_kept, s.kept_reads)}</td><td class="r">${pct(s.start_trimmed, s.kept_reads)}</td><td class="r">${pct(s.end_trimmed, s.kept_reads)}</td><td class="r">${s.split}</td><td class="r">${p.pct_reads_start_trimmed.toFixed(1)}%</td><td class="r">${p.pct_reads_end_trimmed.toFixed(1)}%</td><td class="r">${p.pct_reads_split.toFixed(2)}%</td></tr>`; }).join("") +
    `</tbody></table><p class="note">Shares of kept reads. Adapter at start: the 50-base rapid adapter found in the first 150 bases (at most 10 differences). Split: reads Porechop_ABI cut at a middle adapter (sampled: number of reads; full run: share).</p>`;
}

// --- 6. joined reads
const KIND = { "two MAGs": "two MAGs", "same stretch, both strands": "same DNA, both strands", "same contig": "same contig", "same MAG": "same MAG", "different contigs": "different contigs", "one piece kept": "one piece kept", "a piece unmapped": "a piece unaligned" };
function drawJoinList() {
  $("rdJoinList").innerHTML = `<table class="ct"><thead><tr><th>#</th><th>Sample</th><th class="r">Length</th><th class="r">Q</th><th>Pieces</th></tr></thead><tbody>` +
    DATA.joins.map((j, k) => `<tr class="click${k === st.join ? " hl" : ""}" data-j="${k}"><td class="r">${k + 1}</td><td>${j.sample}</td><td class="r">${fmtBp(j.length)}</td><td class="r">${j.q}</td><td>${KIND[j.kind]}${j.junction ? " ·&nbsp;junction" : ""}</td></tr>`).join("") + "</tbody></table>";
}
function drawJoin() {
  const j = DATA.joins[st.join];
  if (!j) return;
  const w = width("rdJoin", 360), m = { l: 8, r: 8 }, sc = (w - m.l - m.r) / j.length, x = (p) => m.l + p * sc;
  const mags = [...new Set(j.alignments.map((a) => a[4]).filter((b) => b))], colour = (b) => (b ? `var(--c${(mags.indexOf(b) % 7) + 1})` : "var(--faint)");
  const lanes = []; const lane = j.alignments.map((a) => { let k = lanes.findIndex((e) => e <= a[0]); if (k < 0) { k = lanes.length; lanes.push(0); } lanes[k] = a[1] + 2 / sc; return k; });
  const h = 74 + lanes.length * 22, svg = el("svg", { width: w, height: h, role: "img", "aria-label": "Pieces and alignments of a split read" });
  el("text", { x: m.l, y: 12, class: "lbl" }, svg).textContent = `Raw read, ${num(j.length)} bp (start on the left)`;
  el("rect", { x: x(0), y: 18, width: j.length * sc, height: 16, rx: 2, fill: "var(--v4)" }, svg);
  j.pieces.forEach(([a, b], k) => {
    const r = el("rect", { x: x(a), y: 18, width: Math.max(1, (b - a) * sc), height: 16, rx: 2, fill: "var(--accent)" }, svg);
    r.addEventListener("mousemove", (ev) => showTip(ev, `kept piece ${k + 1}: bases ${num(a + 1)}-${num(b)} (${fmtBp(b - a)})`)); r.addEventListener("mouseleave", hideTip);
  });
  el("text", { x: m.l, y: 52, class: "lbl" }, svg).textContent = "Alignments to the co-assembly (colour: MAG; grey: contig not in a MAG)";
  j.alignments.forEach((a, k) => {
    const y = 60 + lane[k] * 22, short = a[1] - a[0] < 100;
    const r = el("rect", { x: x(a[0]), y, width: Math.max(2, (a[1] - a[0]) * sc), height: 14, rx: 2, fill: colour(a[4]), "fill-opacity": short ? 0.35 : 0.85 }, svg);
    r.addEventListener("mousemove", (ev) => showTip(ev, `read bases ${num(a[0] + 1)}-${num(a[1])}, strand ${a[2]}<br>contig ${esc(a[3])}${a[4] ? `, MAG ${esc(a[4])} <i>${esc(j.names[a[4]] || "")}</i>` : " (not in a MAG)"}<br>mapping quality ${a[5]}${short ? "<br>under 100 bases: adapter-like stretch" : ""}`));
    r.addEventListener("mouseleave", hideTip);
    if ((a[1] - a[0]) * sc > 120) { const t = el("text", { x: x(a[0]) + 4, y: y + 11, class: "lbl" }, svg); t.textContent = `${a[4] ? "MAG " + a[4] : a[3]} ${a[2]}`; t.style.fill = "var(--surface)"; }
  });
  $("rdJoin").replaceChildren(svg);
  const jn = j.junction;
  if (jn) {
    const cw = 10, per = Math.max(30, Math.floor((width("rdJunction", 360) - 10) / cw)), rows = Math.ceil(jn.seq.length / per);
    const s2 = el("svg", { width: per * cw + 10, height: rows * 56 + 20, role: "img", "aria-label": "Bases at the junction" });
    el("text", { x: 4, y: 12, class: "lbl" }, s2).textContent = `Junction: read bases ${num(jn.start + 1)}-${num(jn.start + jn.seq.length)}`;
    const cut0 = j.pieces[0][1] - jn.start, cut1 = j.pieces[1][0] - jn.start;
    for (let i = 0; i < jn.seq.length; i++) {
      const r = Math.floor(i / per), x0 = 4 + (i % per) * cw, y0 = 18 + r * 56, inAd = i >= jn.adapter[0] && i < jn.adapter[1], inBc = jn.barcode && i >= jn.barcode[0] && i < jn.barcode[1], removed = i >= cut0 && i < cut1;
      el("rect", { x: x0, y: y0, width: cw, height: 16, fill: inAd ? SEG.adapter : inBc ? SEG.barcode : removed ? "var(--v4)" : "var(--accent)", "fill-opacity": inAd || inBc ? 0.35 : 0.22 }, s2);
      const t = el("text", { x: x0 + cw / 2, y: y0 + 12, "text-anchor": "middle", class: "mlbl" }, s2); t.textContent = jn.seq[i]; t.style.fill = "var(--ink)";
      const q = jn.qual[i], bh = Math.min(q, 40) / 40 * 24;
      const b = el("rect", { x: x0 + 1, y: y0 + 44 - bh, width: cw - 2, height: Math.max(1, bh), fill: viridis(Math.min(q, 40) / 40) }, s2);
      b.addEventListener("mousemove", (ev) => showTip(ev, `read base ${num(jn.start + i + 1)}: ${jn.seq[i]}, Q ${q}${inAd ? " (adapter)" : inBc ? ` (barcode ${jn.barcode[3]})` : removed ? " (removed)" : " (kept piece)"}`)); b.addEventListener("mouseleave", hideTip);
    }
    $("rdJunction").replaceChildren(s2);
  } else $("rdJunction").replaceChildren();
  const pieces = j.pieces.map(([a, b]) => fmtBp(b - a)).join(" + ");
  $("rdJoinNote").innerHTML = `Read ${st.join + 1}: sample ${j.sample}, ${num(j.length)} bp, mean Q ${j.q}. Kept after splitting and the length filter: ${pieces}. ` +
    `Rapid adapter found in the middle by the independent search: ${j.middle_adapter ? "yes" : "no"}. ` +
    (jn ? `Junction: ${jn.barcode ? `barcode ${jn.barcode[3]} (yellow, ${jn.barcode[2]} differences; sample ${j.sample} has barcode ${S.find((x) => x.sample === j.sample).barcode}) and ` : ""}adapter (orange, ${jn.adapter[3] === "-" ? "reverse strand" : "forward strand"}, ${jn.adapter[2]} differences) between the two kept pieces (green); grey: other removed bases. ` : "") +
    `Faint boxes: alignments under 100 bases; several of them fall on contig ends that themselves carry adapter sequence.`;
}

// --- state
function params() {
  const p = {};
  for (const k of ["sample", "unit", "q", "len", "start", "join"]) if (st[k] !== DEFAULTS[k]) p[k] = k === "start" || k === "join" ? st[k] + 1 : st[k];
  if (examples.current >= 0) p.ex = examples.current + 1;
  return p;
}
const write = () => writeHashParams(params());
function applyState(s) {
  const int = (v, d, lo, hi) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= lo && n <= hi ? n : d; };
  st.sample = S.some((x) => x.sample === s.sample) ? s.sample : DEFAULTS.sample;
  st.unit = s.unit === "bases" ? "bases" : "reads";
  st.q = int(s.q, DEFAULTS.q, 0, 20);
  st.len = LENS.includes(+s.len) ? +s.len : DEFAULTS.len;
  st.start = int(s.start, 1, 1, DATA.starts.length) - 1;
  st.join = int(s.join, 1, 1, DATA.joins.length) - 1;
  $("rdSample").value = st.sample; $("rdUnit").value = st.unit; $("rdQ").value = st.q; $("rdLen").value = st.len;
}
function drawAll(push = true) { drawFilter(); drawStart(); drawJoinList(); drawJoin(); if (push) write(); }

function setup() {
  fillNumbers(); drawLayout(); drawFirst(); drawProfile(); drawMap(); drawTrim();
  $("rdRamp").style.background = `linear-gradient(90deg,${VIRIDIS.join(",")})`;
  $("rdSample").innerHTML = `<option value="all">All ten</option>` + S.map((s) => `<option value="${s.sample}">${s.sample} (day ${s.day})</option>`).join("");
  $("rdLen").innerHTML = LENS.map((l) => `<option value="${l}">${l ? num(l) + " bp" : "any"}</option>`).join("");
  for (const [id, key, f] of [["rdSample", "sample", String], ["rdUnit", "unit", String], ["rdQ", "q", Number], ["rdLen", "len", Number]]) {
    $(id).addEventListener("input", (e) => { st[key] = f(e.target.value); drawFilter(); write(); });
  }
  $("rdStartPick").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (b) { st.start = +b.dataset.k; drawStart(); write(); } });
  $("rdJoinList").addEventListener("click", (e) => { const r = e.target.closest("[data-j]"); if (r) { st.join = +r.dataset.j; drawJoinList(); drawJoin(); write(); } });
  $("rdCopy").addEventListener("click", async () => {
    write();
    let ok = true; try { await navigator.clipboard.writeText(location.href); } catch (e) { ok = false; }
    $("rdCopied").textContent = ok ? "Copied." : "Copy the address from the browser bar.";
    setTimeout(() => { $("rdCopied").textContent = ""; }, 2500);
  });
}
const examples = setupExamples($("rdExamples"), (k) => { applyState(EXAMPLES[k].state); drawAll(); });
setup();
(function start() {
  const s = readHashParams(), ex = parseInt(s.ex, 10);
  if (ex >= 1 && ex <= EXAMPLES.length) { examples.current = ex - 1; examples.draw(); applyState({ ...EXAMPLES[ex - 1].state, ...s }); }
  else applyState(s);
  drawAll(false);
})();
let resizeTimer;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { drawLayout(); drawFirst(); drawProfile(); drawAll(false); }, 150); });
