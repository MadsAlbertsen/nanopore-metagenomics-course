// Group 4 article, revision 1 (written by Claude after peer review). DATA comes from np26 scripts/44_project_group4.py
// (function revision1); every number in the text is read from DATA.numbers (data-n), none is typed by hand.
const D = DATA, N = D.numbers;
for (const e of document.querySelectorAll("[data-n]")) {
  const v = N[e.dataset.n];
  if (v === undefined) throw new Error(`no number ${e.dataset.n} in data.json`);
  let s;
  if (typeof v !== "number") s = String(v);
  else if (e.dataset.c !== undefined) s = Math.round(v).toLocaleString("en-US");
  else s = e.dataset.d === undefined ? String(v) : v.toFixed(+e.dataset.d);
  e.textContent = e.dataset.sign && typeof v === "number" && v > 0 ? "+" + s : s;
}

// fixed colour meanings across the article
const SPECIES = "var(--c1)", CAZ = "var(--c3)", NULLB = "var(--c7)", NULLA = "var(--faint)";
const PHY = (p) => (p === "Bacteroidota" ? "var(--c7)" : p === "Bacillota" ? "var(--c2)" : "var(--faint)");
const GROUPS = ["Plant fibre", "Starch", "Fructan", "Host glycans", "Mixed", "Other", "Unmapped"];
const GCOL = { "Plant fibre": "var(--c6)", Starch: "var(--c4)", Fructan: "var(--c5)", "Host glycans": "var(--c7)", Mixed: "var(--c1)", Other: "var(--faint)", Unmapped: "var(--line)" };
const SWITCH = [{ x: 5.5, label: "diet switch" }];
const legend = (host, items) => chartLegend(host, items);

// Figure 1a: drift of both profiles; 1b: CAZyme distance / species distance per day
function fig1() {
  lineChart($("r1F1a"), { x: D.days, series: [{ name: "species", values: D.to_first.taxa, color: SPECIES },
    { name: "CAZyme genes", values: D.to_first.functions, color: CAZ }], xLabel: "Day", xName: "Day",
    yLabel: "Bray-Curtis to the days 1-5 mean", marks: SWITCH, zero: true, height: 300 });
  lineChart($("r1F1b"), { x: D.days, series: [{ name: "CAZyme / species", values: D.damp, color: CAZ }], xLabel: "Day", xName: "Day",
    yLabel: "CAZyme distance / species distance", marks: SWITCH, zero: true, height: 300, yFmt: (v) => (+v).toFixed(2) });
}

// histogram of null distributions with the observed value as a vertical line
function histo(host, { series, obs, xLabel, fmt = (v) => v.toFixed(3) }) {
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 280);
    const box = { l: 52, r: W - 14, t: 16, b: H - 44 };
    const all = series.flatMap((s) => s.values).concat([obs]);
    let lo = Math.min(...all), hi = Math.max(...all);
    const pad = (hi - lo) * 0.05; lo -= pad; hi += pad;
    const nb = 40, w = (hi - lo) / nb;
    const counts = series.map((s) => { const c = new Array(nb).fill(0); for (const v of s.values) c[Math.min(nb - 1, Math.floor((v - lo) / w))]++; return c; });
    const cmax = Math.max(...counts.flat());
    const x = scale(lo, hi, box.l, box.r), y = scale(0, cmax * 1.08, box.b, box.t);
    axes(svg, x, y, box, { xLabel, yLabel: "Null replicates", xTicks: x.ticks(5), yTicks: y.ticks(4), xFmt: fmt });
    series.forEach((s, k) => counts[k].forEach((c, i) => {
      if (!c) return;
      const r = el("rect", { x: x(lo + i * w), y: y(c), width: Math.max(1, x(lo + (i + 1) * w) - x(lo + i * w) - 0.5), height: y(0) - y(c), style: `fill:${s.color}`, opacity: 0.7 }, svg);
      tipOn(r, `<b>${esc(s.name)}</b><br>${fmt(lo + i * w)} to ${fmt(lo + (i + 1) * w)}: ${c} replicates`);
    }));
    el("line", { x1: x(obs), x2: x(obs), y1: box.t, y2: box.b, style: "stroke:var(--ink)", "stroke-width": 2 }, svg);
    el("text", { x: x(obs) + 4, y: box.t + 10, class: "note" }, svg).textContent = `observed ${fmt(obs)}`;
    legend(host, [...series.map((s) => ({ name: s.name, color: s.color })), { name: "observed", color: "var(--ink)" }]);
  });
}
function fig2() {
  const Nl = D.null;
  histo($("r1F2a"), { series: [{ name: "carrier-preserving null", values: Nl.carrier.between, color: NULLB }, { name: "gene-token null", values: Nl.token.between, color: NULLA }],
    obs: Nl.obs.between, xLabel: "Between-period Bray-Curtis, CAZyme profile" });
  histo($("r1F2b"), { series: [{ name: "carrier-preserving null", values: Nl.carrier.spearman, color: NULLB }, { name: "gene-token null", values: Nl.token.spearman, color: NULLA }],
    obs: Nl.obs.spearman, xLabel: "Spearman, carrier MAGs vs CV", fmt: (v) => v.toFixed(2) });
  // 2c: observed CV against the null median CV of the same family
  const host = $("r1F2c"), F = D.fams;
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 280);
    const box = { l: 52, r: W - 14, t: 14, b: H - 44 };
    const [a0, a1] = extent(F.flatMap((f) => [f.cv, f.null]), { log: true });
    const x = scale(a0, a1, box.l, box.r, true), y = scale(a0, a1, box.b, box.t, true);
    axes(svg, x, y, box, { xLabel: "Null median CV of the family (%)", yLabel: "Observed CV (%)", xTicks: x.ticks(), yTicks: y.ticks() });
    el("line", { x1: x(a0), y1: y(a0), x2: x(a1), y2: y(a1), class: "mark" }, svg);
    for (const f of [...F].sort((p, q) => GROUPS.indexOf(p.category) - GROUPS.indexOf(q.category))) {
      const c = el("circle", { cx: x(f.null), cy: y(f.cv), r: 3.4, style: `fill:${GCOL[f.category]}`, class: "dot" }, svg);
      tipOn(c, `<b>${esc(f.family)}</b> (${esc(f.category)})<br>carried by ${f.carriers} common MAGs<br>observed CV ${f.cv}%<br>null median ${f.null}% (90%: ${f.lo}-${f.hi}%)`);
    }
  });
  const lg = $("r1F2cLeg"); lg.innerHTML = "";
  legend(lg, GROUPS.filter((g) => F.some((f) => f.category === g)).map((g) => ({ name: g, color: GCOL[g] })));
}
function tbl2() {
  const r = (label, k, d) => ({ stat: label, obs: N[`r1_obs_${k}`], b: N[`r1_B_${k}_med`], rng: `${N[`r1_B_${k}_lo`].toFixed(d)} to ${N[`r1_B_${k}_hi`].toFixed(d)}`, a: N[`r1_A_${k}_med`], pct: N[`r1_B_${k}_pct`], d });
  const rows = [r("Between-period Bray-Curtis", "between", 3), r("Between / within ratio", "ratio", 2), r("Median family CV (%)", "cv_median", 1),
    r("Spearman, carriers vs CV", "spearman", 2), r("Partial Spearman, mean taken out", "partial", 2)];
  const f = (v, row) => v.toFixed(row.d);
  table($("r1T2"), { sortable: false, columns: [{ key: "stat", label: "Statistic" }, { key: "obs", label: "Observed", num: true, fmt: f },
    { key: "b", label: "Carrier null, median", num: true, fmt: f }, { key: "rng", label: "Carrier null, 95% range" },
    { key: "a", label: "Token null, median", num: true, fmt: f }, { key: "pct", label: "Percentile (carrier null)", num: true, fmt: (v) => v.toFixed(1) }], rows });
}
function tbl1() {
  table($("r1T1"), { sortable: false, columns: [{ key: "day", label: "Day", num: true, fmt: String }, { key: "reads", label: "Reads", num: true, fmt: (v) => v.toLocaleString("en-US") },
    { key: "gbp", label: "Gbp", num: true, fmt: (v) => v.toFixed(2) }, { key: "n50", label: "Read N50 (kb)", num: true, fmt: (v) => (v / 1000).toFixed(1) },
    { key: "binned", label: "Bases in MAGs (%)", num: true, fmt: (v) => v.toFixed(1) }], rows: D.seq });
}

// Figure 3a: synchrony relative to independence against carriers; 3b: medians per substrate group
function fig3() {
  const host = $("r1F3a"), S = D.syn.filter((s) => s.carriers > 0);
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 300);
    const box = { l: 56, r: W - 14, t: 14, b: H - 44 };
    const x = scale(...extent(S.map((s) => s.carriers), { log: true }), box.l, box.r, true);
    const y = scale(...extent(S.map((s) => s.rel).concat([1]), { log: true }), box.b, box.t, true);
    axes(svg, x, y, box, { xLabel: "Common MAGs carrying the family (log scale)", yLabel: "φ / φ(independent), log scale", xTicks: x.ticks(), yTicks: y.ticks() });
    el("line", { x1: box.l, x2: box.r, y1: y(1), y2: y(1), class: "mark" }, svg);
    el("line", { x1: box.l, x2: box.r, y1: y(N.r1_syn_null_med), y2: y(N.r1_syn_null_med), class: "mark", style: `stroke:${NULLB}` }, svg);
    el("text", { x: box.r - 4, y: y(N.r1_syn_null_med) + 13, "text-anchor": "end", class: "note" }, svg).textContent = "random carriers (median)";
    for (const s of [...S].sort((p, q) => GROUPS.indexOf(p.category) - GROUPS.indexOf(q.category))) {
      const c = el("circle", { cx: x(s.carriers), cy: y(s.rel), r: 3.4, style: `fill:${GCOL[s.category]}`, class: "dot" }, svg);
      tipOn(c, `<b>${esc(s.family)}</b> (${esc(s.category)})<br>${s.carriers} common carriers (${s.n} in all MAGs)<br>φ ${s.phi} · φ/φ(indep.) ${s.rel}<br>family CV ${s.cv}% · carriers' mean CV ${s.carrier_cv}%`);
    }
  });
  const lg = $("r1F3aLeg"); lg.innerHTML = "";
  legend(lg, GROUPS.filter((g) => S.some((s) => s.category === g)).map((g) => ({ name: g, color: GCOL[g] })));
  const groups = ["Plant fibre", "Starch", "Host glycans"], keys = ["plant", "starch", "host"];
  const host2 = $("r1F3b");
  mountChart(host2, () => {
    const { svg, W, H } = newSvg(host2, 300);
    const labels = [...groups, "All families"], vals = [...keys.map((k) => N[`r1_syn_rel_${k}`]), N.r1_syn_rel_med];
    const box = { l: 104, r: W - 14, t: 14, b: H - 44 };
    const x = scale(0, Math.max(...vals) * 1.1, box.l, box.r), band = (box.b - box.t) / labels.length;
    axes(svg, x, () => 0, box, { xLabel: "Median φ / φ(independent)", xTicks: x.ticks(5), yTicks: [] });
    labels.forEach((l, i) => {
      const yc = box.t + band * (i + 0.5);
      el("text", { x: box.l - 6, y: yc + 4, "text-anchor": "end" }, svg).textContent = l;
      const r = el("rect", { x: x(0), y: yc - band * 0.3, width: x(vals[i]) - x(0), height: band * 0.6, style: `fill:${GCOL[l] || CAZ}`, rx: 2 }, svg);
      tipOn(r, `<b>${esc(l)}</b><br>median φ/φ(indep.) ${vals[i].toFixed(2)}`);
    });
    el("line", { x1: x(N.r1_syn_null_med), x2: x(N.r1_syn_null_med), y1: box.t, y2: box.b, class: "mark", style: `stroke:${NULLB}` }, svg);
    el("text", { x: x(N.r1_syn_null_med) + 4, y: box.t + 2, class: "note" }, svg).textContent = "random carriers";
  });
}

// Figure 4a: substrate groups relative to days 1-5; 4b: |log2| observed vs null 95th percentile
function fig4() {
  const series = D.categories.map((c, i) => {
    const m = c.values.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    return { name: c.name, values: c.values.map((v) => (100 * v) / m), color: GCOL[c.name] };
  });
  lineChart($("r1F4a"), { x: D.days, series, xLabel: "Day", xName: "Day", unit: "%", yLabel: "Percent of the days 1-5 mean", marks: SWITCH, zero: false, height: 300 });
  const host = $("r1F4b"), G = D.groups;
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 300);
    const box = { l: 96, r: W - 14, t: 14, b: H - 44 };
    const q95 = (v) => { const a = v.map(Math.abs).sort((p, q) => p - q); return a[Math.floor(0.95 * (a.length - 1))]; };
    const rows = G.map((g) => ({ name: g.name, obs: Math.abs(g.obs), hi: q95(g.null) }));
    const x = scale(0, Math.max(...rows.flatMap((r) => [r.obs, r.hi])) * 1.1, box.l, box.r), band = (box.b - box.t) / rows.length;
    axes(svg, x, () => 0, box, { xLabel: "|log2 change|, days 6-10 over days 1-5", xTicks: x.ticks(5), yTicks: [], xFmt: (v) => v.toFixed(2) });
    rows.forEach((r, i) => {
      const yc = box.t + band * (i + 0.5);
      el("text", { x: box.l - 6, y: yc + 4, "text-anchor": "end" }, svg).textContent = r.name;
      const a = el("rect", { x: x(0), y: yc - band * 0.32, width: x(r.obs) - x(0), height: band * 0.3, style: `fill:${GCOL[r.name]}`, rx: 2 }, svg);
      const b = el("rect", { x: x(0), y: yc + band * 0.02, width: x(r.hi) - x(0), height: band * 0.3, style: `fill:${GCOL[r.name]}`, opacity: 0.35, rx: 2 }, svg);
      tipOn(a, `<b>${esc(r.name)}</b><br>observed |log2| ${r.obs.toFixed(3)}`);
      tipOn(b, `<b>${esc(r.name)}</b><br>null 95th percentile ${r.hi.toFixed(3)}`);
    });
    legend(host, [{ name: "observed (dark)", color: "var(--muted)" }, { name: "null 95th percentile (light)", color: "var(--line)" }]);
  });
}

// Figure 5a: family parts of the two changes; 5b: MAG mean share against log2 change
function fig5() {
  const F = D.drivers.slice(0, 6), host = $("r1F5a");
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 340);
    const box = { l: 130, r: W - 14, t: 14, b: H - 44 };
    const x = scale(Math.min(0, ...F.map((f) => f.gp)), Math.max(...F.flatMap((f) => [f.sp, f.gp])) * 1.08, box.l, box.r), band = (box.b - box.t) / F.length;
    axes(svg, x, () => 0, box, { xLabel: "Share of the change between the periods (%)", xTicks: x.ticks(5), yTicks: [] });
    F.forEach((f, i) => {
      const yc = box.t + band * (i + 0.5);
      el("text", { x: box.l - 6, y: yc + 4, "text-anchor": "end" }, svg).textContent = f.family;
      [[f.sp, SPECIES, "species change", -0.34], [f.gp, CAZ, "CAZyme change", 0.02]].forEach(([v, c, n, off]) => {
        const r = el("rect", { x: Math.min(x(0), x(v)), y: yc + band * off, width: Math.abs(x(v) - x(0)), height: band * 0.32, style: `fill:${c}`, rx: 2 }, svg);
        tipOn(r, `<b>${esc(f.family)}</b> (${esc(f.phylum)})<br>${n}: ${v.toFixed(1)}%`);
      });
    });
    legend(host, [{ name: "species change", color: SPECIES }, { name: "CAZyme change", color: CAZ }]);
  });
  const M = D.mags, h2 = $("r1F5b");
  mountChart(h2, () => {
    const { svg, W, H } = newSvg(h2, 340);
    const box = { l: 56, r: W - 14, t: 14, b: H - 44 };
    const x = scale(...extent(M.map((m) => m.log2), { pad: 0.06 }), box.l, box.r), y = scale(...extent(M.map((m) => m.mean), { log: true }), box.b, box.t, true);
    axes(svg, x, y, box, { xLabel: "log2 change, days 6-10 over days 1-5", yLabel: "Mean share (% of bases, log scale)", xTicks: x.ticks(6), yTicks: y.ticks() });
    el("line", { x1: x(0), x2: x(0), y1: box.t, y2: box.b, class: "mark" }, svg);
    for (const m of M) {
      const c = el("circle", { cx: x(m.log2), cy: y(m.mean), r: 2.5 + Math.sqrt(m.caz) * 0.45, style: `fill:${PHY(m.phylum)}`, class: "dot", opacity: 0.85 }, svg);
      tipOn(c, `<b>${esc(m.name)}</b><br>${esc(m.family)} (${esc(m.phylum)})<br>mean share ${m.mean}%<br>log2 change ${m.log2}<br>${m.caz} degrading CAZyme genes per 1,000 genes`);
    }
    legend(h2, [{ name: "Bacteroidota", color: PHY("Bacteroidota") }, { name: "Bacillota", color: PHY("Bacillota") }, { name: "other phyla", color: PHY("") }]);
  });
}

// Figure 6: variant share against within-period CV
function fig6() {
  scatter($("r1F6"), { height: 320, logX: true, xLabel: "Variant sites (% of positions, log scale)", yLabel: "Within-period CV (%)",
    points: D.strains.map((s) => ({ x: s.var, y: s.cvw, label: s.name, color: PHY(s.phylum), extra: `${s.phylum}; depth ${s.depth}x; log2 change ${s.log2}` })), xFmt: (v) => String(+v.toPrecision(2)) });
  const lg = $("r1F6Leg"); lg.innerHTML = "";
  legend(lg, [{ name: "Bacteroidota", color: PHY("Bacteroidota") }, { name: "Bacillota", color: PHY("Bacillota") }, { name: "other phyla", color: PHY("") }]);
}

fig1(); fig2(); tbl2(); tbl1(); fig3(); fig4(); fig5(); fig6();
