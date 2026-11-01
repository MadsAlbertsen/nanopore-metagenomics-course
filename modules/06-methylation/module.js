// Module 6: methylation. DATA from the example analysis (np26 scripts/26_course_methylation.py):
// nanomotif (overview), screen (contig screen and cut test), windows (window screen, read check, breakpoints),
// winMotifs (per-window motif counts for binned contigs with a flagged window), place (placing contigs by methylation,
// with depth over the days), bins (per MAG: contigs with verdicts, windows and edges, fingerprint).
const B = DATA.bins, P = DATA.place, PC = P.contigs;
const V = [
  { label: "Consistent", color: "var(--v0)" },
  { label: "Lacks a motif of the rest", color: "var(--v1)" },
  { label: "Extra motif", color: "var(--v2)" },
  { label: "One conflicting motif", color: "var(--v3)" },
  { label: "Too little data", color: "var(--v4)" },
];
const FLAG = new Set([1, 2]);
const motifName = (m) => { const p = m.split("_"); const mod = { a: "6mA", m: "5mC", "21839": "4mC" }[p[2]] || p[2]; return `${p[0]} ${mod}@${p[1]}`; };
const motifList = (s) => s ? s.split(",").map(motifName).join(", ") : "";
const fmtKb = (bp) => `${(bp / 1e3).toFixed(1)} kb`;
const pct = (a, b, d = 1) => b ? `${((100 * a) / b).toFixed(d)}%` : "–";
const num = (n) => Number(n).toLocaleString("en");
const magIdx = new Map(B.map((b, i) => [b.id, i]));
const magName = (id) => { const b = B[magIdx.get(id)]; return b ? b.name : id; };
const SUM = Object.fromEntries(P.summary.map((r) => [r.set, r]));
const CK = {}; for (const r of P.checks) (CK[r.set] = CK[r.set] || {})[r.length] = r;
const CHECKS = [["meth", "Methylation alone"], ["depth", "+ depth"], ["composition", "+ composition"], ["depth and composition", "+ both"]];
const LENS = ["all", "< 50 kb", "50-200 kb", ">= 200 kb"];
// 95% Wilson interval of a share k of n, in percent
const wilson = (k, n) => { if (!n) return [0, 0]; const z = 1.96, p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d; return [100 * (c - h), 100 * (c + h)]; };
// the analysis's advice: >= 50 kb, >= 2 distinct shared methylated motifs, depth support (placed MAG in the top 3)
const trusted = (c) => c.out === "assigned" && c.len >= 5e4 && c.groups >= 2 && c.rankP <= 3;
const LEN = { short: [0, 5e4], mid: [5e4, 2e5], long: [2e5, Infinity], all: [0, Infinity] };
const SETS = { control: "Control (binned, own MAG left out)", absent: "Host absent (single-contig MAG)", unbinned: "Unbinned", circular: "Unbinned, circular" };
const st = { mag: -1, win: "", contig: "" };
const DEFAULTS = { mag: "1.308", pset: "circular", pshow: "depth", plen: "all" };

// --- numbers in the text, all from the data
function fillNumbers() {
  const nm = DATA.nanomotif.numbers, sc = DATA.screen, w = DATA.windows, ctrl = SUM["control: own MAG has other contigs"];
  const abs = SUM["host absent: single-contig MAGs"], unb = SUM["unbinned, with methylated motif"], circ = SUM["unbinned circular, with methylated motif"];
  const L = (k) => SUM[`control by length: ${k}`], G = (k) => SUM[`control by motif groups: ${k}`];
  const trustC = PC.filter((c) => c.set === "control" && trusted(c));
  const flagged = (sc.verdicts.missing_motif || 0) + (sc.verdicts.extra_motif || 0);
  const informative = sc.binned - (sc.verdicts.no_information || 0);
  const longR = L("50-200 kb").right_with_depth_top3 + L(">= 200 kb").right_with_depth_top3;
  const longW = L("50-200 kb").wrong_with_depth_top3 + L(">= 200 kb").wrong_with_depth_top3;
  const rate = (k) => L(k).wrong_with_depth_top3 / (L(k).right_with_depth_top3 + L(k).wrong_with_depth_top3);
  const exp = ["< 50 kb", "50-200 kb", ">= 200 kb"].reduce((s, k) => s + L(k).unbinned_placed_with_depth_top3 * rate(k), 0);
  const K = (k) => { const r = CK.control.all, rr = r[k === "meth" ? "right methylation" : `right + ${k}`], ww = r[k === "meth" ? "wrong methylation" : `wrong + ${k}`]; return `${ww} of ${rr + ww} (${pct(ww, rr + ww)})`; };
  const gatc = DATA.nanomotif.top.find((r) => r[0] === "GATC");
  const below5 = B.reduce((s, b) => s + b.contigs.filter((c) => c.cov < 5).length, 0);
  const N = {
    fracMod: `${(nm.frac_mod_median * 100).toFixed(1)}%`, motifs: num(nm.motifs), magsWith: `${nm.mags_with_motifs} of ${nm.mags}`,
    mods: `${num(nm.motifs_6mA)} 6mA, ${nm.motifs_5mC} 5mC, ${nm.motifs_4mC} 4mC`, perMag: `${nm.motifs_per_mag_median} (up to ${nm.motifs_per_mag_max})`,
    cutGenomes: sc.cut.genomes, cutMoved: `${sc.cut.moved[0]} of ${sc.cut.moved[1]}`, cutKept: `${sc.cut.kept[0]} of ${num(sc.cut.kept[1])} (${pct(sc.cut.kept[0], sc.cut.kept[1], 2)})`,
    flagged: `${flagged} (${fmtBp(sc.flagged_bp)})`, informative: num(informative), flaggedMags: sc.flagged_mags, noInfo: num(sc.verdicts.no_information || 0),
    winCut: `${pct(w.cut_genomes[2], w.cut_genomes[1], 2)} (${w.cut_genomes[2]} of ${num(w.cut_genomes[1])})`, winBinned: `${pct(w.binned[2], w.binned[1])} (${w.binned[2]} of ${num(w.binned[1])})`,
    winUnbinned: `${pct(w.unbinned[2], w.unbinned[1])} (${w.unbinned[2]} of ${num(w.unbinned[1])})`,
    spanEdge: w.joins.edge[1].toFixed(2), spanBase: w.joins.baseline[1].toFixed(2), weakEdge: `${w.joins.edge[2]} of ${w.joins.edge[0]}`,
    bpAll: w.joins.edge[0], bpSplit: w.breakpoints.split || 0, bpMags: `${w.n_splits_in_mags} of them in ${w.splits_in_mags.length} MAGs (${w.splits_in_mags.join(", ")})`,
    ctrl: num(ctrl.contigs), ctrlRight: `${ctrl.right_methylation} (${pct(ctrl.right_methylation, ctrl.contigs, 0)})`, ctrlWrong: `${ctrl.wrong_methylation} (${pct(ctrl.wrong_methylation, ctrl.contigs)})`,
    absent: `${abs.wrong_methylation} of ${abs.contigs}`, wrongShort: `${L("< 50 kb").wrong_methylation} of ${L("< 50 kb").assigned} (${pct(L("< 50 kb").wrong_methylation, L("< 50 kb").assigned, 0)})`,
    wrongOne: `${G("1").wrong_methylation} of ${G("1").assigned} (${pct(G("1").wrong_methylation, G("1").assigned, 0)})`,
    noMotif10: `${DATA.nanomotif.byDepth[0][2] + DATA.nanomotif.byDepth[1][2]} of the ${DATA.nanomotif.byDepth.reduce((s, r) => s + r[2], 0)}`,
    trustCtrl: `${trustC.filter((c) => c.bin !== c.own).length} of ${trustC.length} (${pct(trustC.filter((c) => c.bin !== c.own).length, trustC.length)})`,
    trustUnb: num(PC.filter((c) => c.set === "unbinned" && trusted(c)).length),
    trustCirc: PC.filter((c) => c.set === "unbinned" && c.circ && c.out === "assigned" && c.groups >= 2 && c.rankP <= 3).length,
    dRight: `${ctrl.right_with_depth_top3} (${pct(ctrl.right_with_depth_top3, ctrl.contigs, 0)} of the contigs)`, dWrong: `${ctrl.wrong_with_depth_top3} (${pct(ctrl.wrong_with_depth_top3, ctrl.contigs)})`,
    dAbsent: `${abs.wrong_with_depth_top3} of ${abs.contigs} placed`, unb: num(unb.contigs), unbPlaced: num(unb.placed_methylation), unbDepth: unb.placed_with_depth_top3,
    circ: circ.contigs, circPlaced: circ.placed_methylation, circDepth: circ.placed_with_depth_top3,
    longRight: `${pct(longR, longR + longW, 1)} (${longR} of ${longR + longW})`, shortRight: `${pct(L("< 50 kb").right_with_depth_top3, L("< 50 kb").right_with_depth_top3 + L("< 50 kb").wrong_with_depth_top3, 0)} (${L("< 50 kb").right_with_depth_top3} of ${L("< 50 kb").right_with_depth_top3 + L("< 50 kb").wrong_with_depth_top3})`,
    expWrong: `about ${Math.round(exp)} of ${unb.placed_with_depth_top3}, if the control's error rates per length class apply; binning used depth, so this is a lower bound`,
    cMeth: K("meth"), cDepth: K("depth"), cComp: K("composition"), cBoth: K("depth and composition"),
    keepComp: `${CK.control.all["right + composition"]} of ${ctrl.right_methylation}`, keepDepth: `${CK.control.all["right + depth"]}`,
    circComp: `${CK["unbinned, circular"].all["placed + composition"]} of ${circ.placed_methylation}`,
    circDepth: `depth kept ${CK["unbinned, circular"].all["placed + depth"]}, both ${CK["unbinned, circular"].all["placed + depth and composition"]}`,
    shallow: DATA.nanomotif.byDepth[0][2], below5: num(below5), gatc: gatc ? gatc[4] : "?",
  };
  for (const e of document.querySelectorAll("[data-n]")) e.textContent = N[e.dataset.n] ?? "?";
  $("meStats").innerHTML = [[nm.motifs, "motifs found"], [nm.mags_with_motifs, "MAGs with motifs"], [flagged, "contigs flagged"], [w.all[2], "windows flagged"], [unb.placed_with_depth_top3, "unbinned contigs placed with depth support"]]
    .map(([n, t]) => `<div class="stat"><b>${num(n)}</b><span>${t}</span></div>`).join("");
}

// --- section 1 charts
function hbars(host, rows, max, cols) {
  const W = Math.max(280, host.clientWidth), lab = 120, rowH = 18, H = rows.length * rowH + 4;
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img" });
  const X = (v) => (v / max) * (W - lab - 90);
  rows.forEach(([label, parts, total], i) => {
    const y = 2 + i * rowH;
    el("text", { x: lab - 8, y: y + 12, "text-anchor": "end", class: "mlbl" }, svg).textContent = label;
    let x = lab;
    parts.forEach((v, k) => { if (v) { el("rect", { x, y: y + 2, width: X(v), height: rowH - 6, fill: cols[k] }, svg); x += X(v); } });
    el("text", { x: x + 4, y: y + 12, class: "lbl" }, svg).textContent = total;
  });
  host.innerHTML = ""; host.appendChild(svg);
}
function drawCharts() {
  const top = DATA.nanomotif.top, max = Math.max(...top.map((r) => r[4]));
  hbars($("meTop"), top.map((r) => [r[0], [r[1], r[2], r[3]], `${r[4]} MAGs`]), max, ["var(--c1)", "var(--c2)", "var(--c3)"]);
  const bd = DATA.nanomotif.byDepth, m2 = Math.max(...bd.map((r) => r[1] + r[2]));
  hbars($("meDepth"), bd.map((r) => [`${r[0]}x`, [r[1], r[2]], `${r[1]} of ${r[1] + r[2]}`]), m2, ["var(--c1)", "var(--faint)"]);
}

// --- MAG views
function drawMag() {
  const b = B[st.mag];
  $("meMagName").innerHTML = `<i>${esc(b.name)}</i> <span class="mono">${b.id}</span> · ${b.q} · ${b.cov}x · ${b.contigs.length} contig${b.contigs.length === 1 ? "" : "s"} · Nanomotif motifs: ${b.nm.length ? esc(b.nm.join(", ")) : "none"} ${magLinks(b.id, "methylation", true)}`;
  drawFingerprint(b);
  const wins = b.contigs.filter((c) => DATA.winMotifs[c.id]);
  $("meWin").innerHTML = wins.length ? wins.map((c) => `<option value="${c.id}">${c.id} (${fmtBp(c.len)})</option>`).join("") : `<option value="">none in this MAG</option>`;
  if (!wins.some((c) => c.id === st.win)) st.win = wins.length ? wins[0].id : "";
  $("meWin").value = st.win;
  drawTrack(b); drawWinMotifs();
}
function drawFingerprint(b) {
  const host = $("meFp");
  if (!b.fpMotifs.length || !Object.keys(b.fp).length) { host.innerHTML = `<p class="note">No motif is methylated in any contig of this MAG with enough depth (5x or more).</p>`; return; }
  const head = b.fpMotifs.map((m) => `<th scope="col"><div>${esc(m)}</div></th>`).join("");
  const body = b.contigs.filter((c) => b.fp[c.id]).map((c) => {
    const cells = b.fp[c.id].map(([s, k, n], j) => {
      const cls = [s === null ? "na" : "", k ? "c" + k : ""].join(" ").trim();
      const t = `${b.fpMotifs[j]} · ${c.id}: ${s === null ? `${n} sites (too few)` : `${Math.round(s * 100)}% of ${n} sites methylated`}${k === 1 ? " · lacks the rest's motif" : k === 2 ? " · extra motif" : ""}`;
      return `<td class="${cls}" style="${s === null ? "" : `background:${viridis(s)}`}" title="${esc(t)}"></td>`;
    }).join("");
    return `<tr><th scope="row"><i class="sw" style="background:${V[c.v].color}"></i>${c.id.replace(/ctg.*/, "")} <span class="muted">${fmtBp(c.len)}</span></th>${cells}</tr>`;
  }).join("");
  host.innerHTML = `<table class="fp"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
function drawFlagged() {
  const rows = DATA.screen.flagged.map(([c, b, len, v, miss, extra]) => `<tr class="click" data-mag="${b}"><td><span class="mono">${c}</span><div class="tax">${esc(magName(b))} · ${b}</div></td><td class="r">${fmtBp(len)}</td><td class="m">${miss ? "lacks " + esc(motifList(miss)) : ""}${miss && extra ? "; " : ""}${extra ? "extra " + esc(motifList(extra)) : ""}</td></tr>`).join("");
  $("meFlagged").innerHTML = `<table class="ct"><thead><tr><th>Contig and MAG</th><th class="r">Length</th><th>Motifs in conflict</th></tr></thead><tbody>${rows}</tbody></table>`;
  $("meFlagged").addEventListener("click", (e) => { const t = e.target.closest("[data-mag]"); if (t) { st.mag = magIdx.get(t.dataset.mag); st.win = ""; drawMag(); write(); } });
}
function drawTrack(b) {
  const host = $("meTrack"); host.innerHTML = "";
  const W = Math.max(520, host.clientWidth), lab = 150, right = 14, rowH = 36;
  const maxLen = Math.max(...b.contigs.map((c) => c.len)), H = b.contigs.length * rowH + 26;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": "Contigs of the MAG to scale with window verdicts", class: "trk" }, host);
  const X = (bp) => lab + (bp / maxLen) * (W - lab - right);
  const step = [1e4, 5e4, 1e5, 2.5e5, 5e5, 1e6, 2e6].find((s) => maxLen / s <= 8) || 1e6;
  for (let v = 0; v <= maxLen; v += step) { el("line", { x1: X(v), x2: X(v), y1: 14, y2: H, stroke: "var(--line)" }, svg); el("text", { x: X(v), y: 10, "text-anchor": "middle", class: "lbl" }, svg).textContent = fmtBp(v); }
  b.contigs.forEach((c, i) => {
    const y = 20 + i * rowH, g = el("g", {}, svg);
    el("text", { x: 0, y: y + 14, class: "mlbl", style: c.id === st.win ? "fill:var(--ink);font-weight:600" : "" }, g).textContent = c.id.replace(/ctg.*/, "") + (c.circ ? " ○" : "");
    el("text", { x: lab - 8, y: y + 14, "text-anchor": "end", class: "lbl" }, g).textContent = fmtBp(c.len);
    const w = Math.max(2, X(c.len) - lab);
    el("rect", { x: lab, y, width: w, height: 4, rx: 1, fill: V[c.v].color }, g);
    const tipContig = `<b class="mono">${c.id}</b><br>${fmtBp(c.len)}, ${c.cov}x · against the rest of the MAG: ${V[c.v].label}${c.miss ? `<br>lacks: <span class="mono">${esc(motifList(c.miss))}</span>` : ""}${c.extra ? `<br>extra: <span class="mono">${esc(motifList(c.extra))}</span>` : ""}`;
    if (c.win) {
      for (const [s, e, v, miss, extra] of c.win) {
        const r = el("rect", { x: X(s) + 0.5, y: y + 7, width: Math.max(1, X(e) - X(s) - 1), height: 14, fill: V[v].color }, g);
        r.addEventListener("pointermove", (ev) => showTip(ev, `<b class="mono">${c.id}</b> ${Math.round(s / 1e3)}–${Math.round(e / 1e3)} kb<br>window against the rest of the contig: ${V[v].label}${miss ? `<br>lacks: <span class="mono">${esc(motifList(miss))}</span>` : ""}${extra ? `<br>extra: <span class="mono">${esc(motifList(extra))}</span>` : ""}`));
        r.addEventListener("pointerleave", hideTip);
      }
    } else {
      const r = el("rect", { x: lab, y: y + 7, width: w, height: 14, rx: 2, fill: V[c.v].color, "fill-opacity": 0.55 }, g);
      r.addEventListener("pointermove", (ev) => showTip(ev, tipContig)); r.addEventListener("pointerleave", hideTip);
    }
    for (const [pos, over, span, bad, bv, cp, lo, hi, cut, evid, clip, depth] of c.edges || []) {
      let bpTip = "";
      if (bv === 2) bpTip = "<br>too few motif sites to place the change";
      else if (bv !== undefined) {
        bpTip = `<br>methylation changes at ${fmtKb(cp)} (range ${fmtKb(lo)}–${fmtKb(hi)})`;
        if (clip) bpTip += `<br>clipping peak: ${clip} of ${depth} reads clipped`;
        bpTip += bv === 1 ? `<br><b>proposed split at ${fmtKb(cut)}</b> (${esc(evid)})` : "<br>methylation only: flag, don't cut";
        el("line", { x1: X(lo), x2: Math.max(X(hi), X(lo) + 1), y1: y + 29, y2: y + 29, stroke: "var(--ink)", "stroke-width": 2, "stroke-linecap": "round" }, g);
        el("circle", { cx: X(cp), cy: y + 29, r: 2.5, fill: "var(--ink)" }, g);
        if (bv === 1) el("line", { x1: X(cut), x2: X(cut), y1: y + 3, y2: y + 25, stroke: "var(--ink)", "stroke-width": 2 }, g);
      }
      const t = el("path", { d: `M${X(pos)} ${y + 22} l-4 6 h8 z`, fill: bad ? "var(--v1)" : "var(--surface)", stroke: bad ? "var(--v1)" : "var(--muted)", "stroke-width": 1 }, g);
      t.addEventListener("pointermove", (ev) => showTip(ev, `<b class="mono">${c.id}</b> edge at ${Math.round(pos / 1e3)} kb<br>${span} of ${over} reads cross it by ≥ 2 kb on both sides${bad ? "<br><b>weak read support</b>" : ""}${bpTip}`));
      t.addEventListener("pointerleave", hideTip);
    }
    const hit = el("rect", { x: 0, y, width: lab, height: rowH - 4, fill: "transparent" }, g);
    hit.addEventListener("pointermove", (ev) => showTip(ev, tipContig)); hit.addEventListener("pointerleave", hideTip);
  });
}
function drawWinMotifs() {
  const host = $("meWinMotifs"), w = DATA.winMotifs[st.win];
  if (!w) { host.innerHTML = `<p class="note">No contig of this MAG has a flagged window.</p>`; return; }
  const head = w.starts.map((s, k) => `<th class="r">${Math.round(s / 1e3)}${k < w.starts.length - 1 ? "–" + Math.round(w.starts[k + 1] / 1e3) : "+"} kb</th>`).join("");
  const rows = w.motifs.map((m, i) => `<tr><td class="mono">${esc(m)}</td>${w.starts.map((_, k) => { const n = w.sites[i][k], x = w.meth[i][k]; const s = n ? x / n : null; return `<td class="c" style="${n >= 10 ? `background:${viridis(s)};color:${s > 0.6 ? "#000" : "#fff"}` : ""}">${n === null ? "" : `${x}/${n}`}</td>`; }).join("")}</tr>`).join("");
  host.innerHTML = `<div class="scroll"><table class="ct wm"><thead><tr><th>${esc(st.win)}: motif</th>${head}</tr></thead><tbody>${rows}</tbody></table></div><p class="note">Methylated / covered sites per window; coloured when 10 sites or more (viridis, 0 to 1 methylated).</p>`;
}

// --- placement
const setOf = (c) => c.set === "unbinned" && c.circ ? ["unbinned", "circular"] : [c.set];
function shownContigs() {
  const s = $("meSet").value, sh = $("meShow").value, [lo, hi] = LEN[$("meLen").value];
  return PC.filter((c) => setOf(c).includes(s) && c.len >= lo && c.len < hi && passes(c, sh))
    .sort((a, b) => b.len - a.len);
}
function passes(c, sh) {
  if (sh === "all") return true;
  if (c.out !== "assigned") return false;
  return sh === "placed" || (sh === "trusted" && trusted(c)) || (sh === "depth" && c.rankP <= 3) || (sh === "comp" && c.rankT <= 3) || (sh === "both" && c.rankP <= 3 && c.rankT <= 3);
}
function outcomeText(c) {
  if (c.out === "assigned") return c.own ? (c.bin === c.own ? "back in its own MAG" : "in another MAG (wrong)") : "";
  return c.out === "ambiguous" ? `a tie: ${c.ncomp} MAGs fit, the best share ${c.best} motifs each` : "no MAG fits";
}
function drawPList() {
  const list = shownContigs();
  $("mePCount").textContent = `${list.length} contigs`;
  $("mePRows").innerHTML = list.map((c) => `<button class="row" role="listitem" data-c="${c.id}" aria-current="${c.id === st.contig}"><span class="nm mono">${c.id}</span><span class="val">${fmtBp(c.len)}${c.circ ? " ○" : ""}</span><span class="id">${c.bin ? esc(magName(c.bin)) : "–"}</span><span class="sub">${c.out === "assigned" ? `${c.groups} distinct · depth rank ${c.rankP ?? "–"}` : esc(c.out)}</span></button>`).join("") || `<p class="note">No contig matches these settings.</p>`;
}
function drawPCard() {
  const host = $("mePCard"), c = PC.find((x) => x.id === st.contig);
  if (!c) { host.innerHTML = `<h2>Contig</h2><p class="note">Pick a contig from the list.</p>`; return; }
  const sh = new Set(c.shared);
  const chips = c.meth.map((i) => `<code class="${sh.has(i) ? "on" : ""}">${esc(P.motifs[i])}</code>`).join("");
  const right = c.own && c.bin ? c.bin === c.own : null;
  const depthTxt = c.bin ? `Depth: the contig follows ${esc(magName(c.bin))}'s depth with r = ${c.rP ?? "–"}, rank ${c.rankP ?? "–"} of ${B.length} MAGs${c.rankP <= 3 ? " (depth support)" : " (no depth support)"}.` : "";
  const compTxt = c.bin ? ` Composition: rank ${c.rankT ?? "–"} of ${B.length}${c.rankT <= 3 ? " (composition support)" : ""}.` : "";
  const ownTxt = c.own && c.own !== c.bin ? ` Its own MAG ${esc(magName(c.own))} (${c.own}): r = ${c.rOwn ?? "–"}, rank ${c.rankOwn ?? "–"}.` : "";
  host.innerHTML = `<div class="exhead"><h2>Contig</h2><span class="count">${esc(SETS[c.set === "unbinned" && c.circ ? "circular" : c.set])}</span></div>
    <h3 class="mono" style="font-size:16px">${c.id}</h3>
    <div class="facts"><span><b>${fmtBp(c.len)}</b>${c.circ ? ", circular" : ""}</span><span>depth <b>${c.cov}x</b></span>${c.own ? `<span>binned in <i>${esc(magName(c.own))}</i> <span class="mono">${c.own}</span></span>` : ""}</div>
    <p class="verdict">${c.out === "assigned" ? `Placed in <b><i>${esc(magName(c.bin))}</i></b> <span class="mono">${c.bin}</span>${outcomeText(c) ? ": " + outcomeText(c) : ""}.` : `Not placed: ${outcomeText(c)}.`} ${c.out === "assigned" ? `It shares ${c.best} methylated motif${c.best === 1 ? "" : "s"} with that MAG (all forms; ${c.groups} distinct)${c.ncomp > 1 ? `; ${c.ncomp} MAGs fit, the next shares ${c.second}` : "; no other MAG fits"}.${trusted(c) ? " It meets the analysis's advice (≥ 50 kb, ≥ 2 distinct motifs, depth support)." : ""}` : ""}</p>
    <div><span class="count">Methylated motifs of the contig (highlighted: also methylated in the placed MAG)</span><div class="chips">${chips}</div></div>
    <p class="note">${depthTxt}${compTxt}${ownTxt}${right === false ? " A wrong placement in the known-answer test." : ""}</p>
    <div id="meProfile"></div><div class="legend" id="meProfLegend"></div>
    ${c.bin ? magLinks(c.bin, "methylation") : ""}`;
  drawProfile(c);
}
function drawProfile(c) {
  const host = $("meProfile"), S = P.samples, n = S.length;
  const lines = [{ name: "contig", vals: c.prof, colour: "var(--accent)", w: 2.5 }];
  if (c.bin) lines.push({ name: `placed: ${magName(c.bin)}`, vals: c.bin === c.own ? c.ownProf : P.magProf[c.bin], colour: "var(--ink)", w: 2 });
  if (c.own && c.own !== c.bin && c.ownProf) lines.push({ name: `own MAG: ${magName(c.own)}`, vals: c.ownProf, colour: "var(--c2)", w: 2, dash: "5 3" });
  const all = lines.flatMap((l) => l.vals || []).filter((v) => v !== null);
  let lo = Math.floor(Math.min(...all)), hi = Math.ceil(Math.max(...all)); if (hi === lo) hi = lo + 1;
  const W = Math.max(300, host.clientWidth || 300), H = 220, mg = { l: 54, r: 12, t: 20, b: 34 };
  const X = (k) => mg.l + (k / (n - 1)) * (W - mg.l - mg.r), Y = (v) => H - mg.b - ((v - lo) / (hi - lo)) * (H - mg.t - mg.b);
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Depth over the days of the contig and its MAG" });
  let k0 = 0;
  for (let k = 1; k <= n; k++) if (k === n || P.diet[k] !== P.diet[k0]) {
    const xa = k0 === 0 ? mg.l : (X(k0 - 1) + X(k0)) / 2, xb = k === n ? W - mg.r : (X(k - 1) + X(k)) / 2;
    if (k0 > 0) el("rect", { class: "band", x: xa, y: mg.t, width: xb - xa, height: H - mg.t - mg.b }, svg);
    el("text", { x: (xa + xb) / 2, y: mg.t - 6, "text-anchor": "middle", class: "lbl" }, svg).textContent = P.diet[k0].replace(/_/g, "-") + " diet";
    k0 = k;
  }
  for (let e = lo; e <= hi; e++) { el("line", { class: "grid", x1: mg.l, x2: W - mg.r, y1: Y(e), y2: Y(e) }, svg); el("text", { x: mg.l - 6, y: Y(e) + 4, "text-anchor": "end", class: "lbl" }, svg).textContent = `${10 ** e >= 1 ? 10 ** e : (10 ** e).toFixed(-e)}x`; }
  S.forEach((s, k) => { el("text", { x: X(k), y: H - mg.b + 14, "text-anchor": "middle", class: "lbl" }, svg).textContent = P.day[k]; });
  el("text", { x: (mg.l + W - mg.r) / 2, y: H - 4, "text-anchor": "middle", class: "lbl" }, svg).textContent = "Day";
  const yt = el("text", { x: 12, y: (mg.t + H - mg.b) / 2, "text-anchor": "middle", class: "lbl", transform: `rotate(-90 12 ${(mg.t + H - mg.b) / 2})` }, svg); yt.textContent = "Depth per Gb";
  for (const l of lines) {
    if (!l.vals) continue;
    const pts = l.vals.map((v, k) => v === null ? null : `${X(k).toFixed(1)},${Y(v).toFixed(1)}`).filter(Boolean).join(" ");
    el("polyline", { points: pts, fill: "none", stroke: l.colour, "stroke-width": l.w, "stroke-dasharray": l.dash || "", "stroke-linejoin": "round" }, svg);
  }
  host.innerHTML = ""; host.appendChild(svg);
  $("meProfLegend").innerHTML = lines.filter((l) => l.vals).map((l) => `<span><i class="sw" style="background:${l.colour}"></i>${esc(l.name)}</span>`).join("") + `<span>· log scale; MAG line: median of its contigs${c.own ? " (own MAG without this contig)" : ""} · shaded: second diet period</span>`;
}
function drawChecks() {
  const lab = (l) => l === "all" ? "all lengths" : l.replace(">=", "≥");
  const cell = (r, k, kind) => {
    if (kind === "wrong") { const rr = r[k === "meth" ? "right methylation" : `right + ${k}`], ww = r[k === "meth" ? "wrong methylation" : `wrong + ${k}`]; return `<td class="r">${ww} / ${rr + ww}${rr + ww ? ` <span class="muted">(${pct(ww, rr + ww, 1)})</span>` : ""}</td>`; }
    return `<td class="r">${num(r[k === "meth" ? "placed methylation" : `placed + ${k}`])}</td>`;
  };
  const rows = [];
  for (const l of LENS) rows.push(`<tr><td>Control, ${lab(l)} (${num(CK.control[l].contigs)})</td>${CHECKS.map(([k]) => cell(CK.control[l], k, "wrong")).join("")}</tr>`);
  rows.push(`<tr><td>Host absent, ≥ 200 kb only (${CK["host absent"].all.contigs}): any placement is wrong</td>${CHECKS.map(([k]) => `<td class="r">${CK["host absent"].all[k === "meth" ? "wrong methylation" : `wrong + ${k}`]} placed</td>`).join("")}</tr>`);
  for (const set of ["unbinned, not circular", "unbinned, circular"]) for (const l of LENS) rows.push(`<tr><td>${set[0].toUpperCase() + set.slice(1)}, ${lab(l)} (${num(CK[set][l].contigs)})</td>${CHECKS.map(([k]) => cell(CK[set][l], k, "placed")).join("")}</tr>`);
  $("meChecks").innerHTML = `<table class="ct"><thead><tr><th></th>${CHECKS.map(([, t]) => `<th class="r">${t}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
  const s = CK.control["< 50 kb"], [c1, c2] = wilson(s["wrong + composition"], s["right + composition"] + s["wrong + composition"]), [b1, b2] = wilson(s["wrong + depth and composition"], s["right + depth and composition"] + s["wrong + depth and composition"]);
  $("meChecksNote").textContent = `Control rows: wrong / kept placements. Unbinned rows: placements kept. A check passes when the placed MAG is among the 3 whose depth (shape over the days) or tetranucleotide composition fits the contig best. Under 50 kb the control rests on few wrong contigs: ${s["wrong + composition"]} of ${s["right + composition"] + s["wrong + composition"]} with composition (95% interval ${c1.toFixed(0)}-${c2.toFixed(0)}%), ${s["wrong + depth and composition"]} of ${s["right + depth and composition"] + s["wrong + depth and composition"]} with both (${b1.toFixed(0)}-${b2.toFixed(0)}%), so the estimates for unbinned contigs are ranges, not single numbers.`;
}
function drawCtrlTable() {
  const row = (label, r) => { const a = r.assigned, d = r.right_with_depth_top3 + r.wrong_with_depth_top3; return `<tr><td>${esc(label)}</td><td class="r">${num(r.contigs)}</td><td class="r">${a}</td><td class="r">${r.right_methylation}</td><td class="r">${r.wrong_methylation}</td><td class="r">${pct(r.wrong_methylation, a, 0)}</td><td class="r">${r.right_with_depth_top3}</td><td class="r">${r.wrong_with_depth_top3}</td><td class="r">${pct(r.wrong_with_depth_top3, d, 0)}</td></tr>`; };
  const ctrl = SUM["control: own MAG has other contigs"];
  const body = [row("All control contigs", ctrl), ...["1", "2", "3", "4+"].map((k) => row(`${k} distinct shared motif${k === "1" ? "" : "s"}`, SUM[`control by motif groups: ${k}`]))].join("");
  $("meCtrl").innerHTML = `<table class="ct"><thead><tr><th></th><th class="r">Contigs</th><th class="r">Placed</th><th class="r">Right</th><th class="r">Wrong</th><th class="r">Wrong, % of placed</th><th class="r">Right with depth</th><th class="r">Wrong with depth</th><th class="r">Wrong, %</th></tr></thead><tbody>${body}</tbody></table>`;
}

// --- state
function params() {
  const p = { mag: B[st.mag].id };
  if (st.win) p.win = st.win;
  if (st.contig) p.contig = st.contig;
  for (const [k, id] of [["pset", "meSet"], ["pshow", "meShow"], ["plen", "meLen"]]) if ($(id).value !== DEFAULTS[k]) p[k] = $(id).value;
  if (examples.current >= 0) p.ex = examples.current + 1;
  return p;
}
const write = () => writeHashParams(params());
function applyState(s) {
  const setSel = (id, v) => { const e = $(id); e.value = [...e.options].some((o) => o.value === String(v)) ? String(v) : e.options[0].value; };
  st.mag = magIdx.has(s.mag) ? magIdx.get(s.mag) : magIdx.get(DEFAULTS.mag);
  st.win = s.win || "";
  setSel("meSet", s.pset ?? DEFAULTS.pset); setSel("meShow", s.pshow ?? DEFAULTS.pshow); setSel("meLen", s.plen ?? DEFAULTS.plen);
  st.contig = PC.some((c) => c.id === s.contig) ? s.contig : "";
  if (!st.contig) { const l = shownContigs(); st.contig = l.length ? l[0].id : ""; }
}
function drawPlace() { drawPList(); drawPCard(); }
function drawAll(push = true) { drawMag(); drawPlace(); if (push) write(); }

function setup() {
  fillNumbers(); drawCharts(); drawFlagged(); drawChecks(); drawCtrlTable();
  $("meRamp").style.background = `linear-gradient(90deg,${VIRIDIS.join(",")})`;
  $("meMags").innerHTML = B.map((b) => `<option value="${b.id} ${esc(b.name)}">`).join("");
  $("meFind").addEventListener("change", (e) => { const i = magIdx.get(e.target.value.split(" ")[0]); if (i !== undefined) { st.mag = i; st.win = ""; drawMag(); write(); } });
  $("meWin").addEventListener("input", (e) => { st.win = e.target.value; drawMag(); write(); });
  for (const id of ["meSet", "meShow", "meLen"]) $(id).addEventListener("input", () => { const l = shownContigs(); if (!l.some((c) => c.id === st.contig)) st.contig = l.length ? l[0].id : ""; drawPlace(); write(); });
  $("mePRows").addEventListener("click", (e) => { const r = e.target.closest("[data-c]"); if (r) { st.contig = r.dataset.c; drawPlace(); write(); } });
  $("meCopy").addEventListener("click", async () => {
    write();
    let ok = true; try { await navigator.clipboard.writeText(location.href); } catch (e) { ok = false; }
    $("meCopied").textContent = ok ? "Copied." : "Copy the address from the browser bar.";
    setTimeout(() => { $("meCopied").textContent = ""; }, 2500);
  });
}
const examples = setupExamples($("meExamples"), (k) => { applyState(EXAMPLES[k].state); drawAll(); });
setup();
(function start() {
  const s = readHashParams(), ex = parseInt(s.ex, 10);
  if (ex >= 1 && ex <= EXAMPLES.length) { examples.current = ex - 1; examples.draw(); applyState({ ...EXAMPLES[ex - 1].state, ...s }); }
  else applyState(s);
  drawAll(false);
})();
let resizeTimer;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { drawCharts(); drawAll(false); }, 150); });
