// Group 3 article: butyrate gene potential across ten days. DATA is a subset of projects/group3/data.json (the report).
const D = DATA, N = D.numbers;
const SPLIT = "diet switch";
const st = { capP: "hi" };
document.querySelectorAll("[data-n]").forEach((e) => { e.textContent = String(N[e.dataset.n]); });

// Figure 1 and Figure 4: where the DNA and the butyrate genes lie (HQ MAGs, MQ MAGs, unbinned contigs)
const CAP = D.capture, FR = ["HQ", "MQ", "unbinned"], FRN = { HQ: "HQ MAGs", MQ: "MQ MAGs", unbinned: "unbinned contigs" };
const meanOf = (a, p) => { const s = p === "hi" ? a.slice(0, 5) : p === "lo" ? a.slice(5) : [a[p]]; return s.reduce((x, y) => x + y, 0) / s.length; };
function drawCapture() {
  const B = CAP.bases;
  lineChart($("g3Cap"), { x: D.days, series: [...FR.map((q) => ({ name: FRN[q], values: B[q] })), { name: "not on any contig", values: B["not assembled"] }, { name: "route MAGs (summed)", values: CAP.route }],
    xLabel: "Day", xName: "Day", yLabel: "Share of the sample's bases (%)", unit: "%", marks: [{ x: 5.5, label: SPLIT }], zero: true });
  barChart($("g3CapGenes"), { labels: D.genes, groups: FR.map((q) => ({ name: FRN[q], values: D.genes.map((g) => meanOf(CAP.gene_share[g][q], st.capP)) })),
    yLabel: "Share of the gene's depth-weighted copies (%)", unit: "%", fmt: (v) => v.toFixed(0) });
}
$("g3CapP").addEventListener("change", (e) => { st.capP = e.target.value; drawCapture(); });

// Table 1: evidence for each butyrate gene
const REL = D.reliability;
function drawRel() {
  const arrow = (v) => (v[0] === null ? "–" : `${v[0].toFixed(3)} → ${v[1].toFixed(3)}`);
  table($("g3Rel"), {
    columns: [{ key: "gene", label: "Gene" }, { key: "n", label: "Calls", num: true, fmt: String }, { key: "confident", label: "Confident", num: true, fmt: String },
      { key: "borderline", label: "Borderline", num: true, fmt: String }, { key: "doubtful", label: "Doubtful", num: true, fmt: String },
      { key: "score", label: "Score / threshold" }, { key: "near", label: "Within 10% above" },
      { key: "all", label: "Per 1,000 genes, all calls" }, { key: "nod", label: "Without doubtful" }, { key: "conf", label: "Confident only" }],
    rows: REL.summary.map((r) => {
      const g = r.gene, isBut = g === "but";
      return { ...r, n: r.confident + r.borderline + r.doubtful,
        score: isBut ? `identity ${N.q2_strict_min}-${N.q2_strict_max}% (exact name), ${N.q2_broad_min}-${N.q2_broad_max}% (broad name)` : `${N[`q2_${g}_rmin`]}-${N[`q2_${g}_rmax`]}`,
        near: isBut ? "–" : String(N[`q2_${g}_near`]),
        all: arrow(REL.robust.all[g]), nod: arrow(REL.robust.no_doubtful[g]), conf: r.confident ? arrow(REL.robust.confident[g]) : "no confident call" };
    }), sortable: false,
  });
}

// Figure 5: all butyrate genes, log2 relative to the mean of days 1-5 (MAGs; but = exact Bakta name; per 1,000 genes, each MAG weighted by its share)
function drawGeneHeat() {
  const order = ["bcd", "but", "atoD", "atoA", "ptb", "buk"], step = { bcd: "dehydrogenase", but: "CoA-transferase", atoD: "CoA-transferase", atoA: "CoA-transferase", ptb: "kinase", buk: "kinase" };
  const vals = order.map((g) => {
    const row = CAP.per_bin[g], base = row.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    return row.map((v) => (v > 0 && base > 0 ? Math.log2(v / base) : null));
  });
  heatmap($("g3GeneHeat"), { rows: order.map((g) => `${g} · ${step[g]}`), cols: D.days.map((d) => (innerWidth < 600 ? String(d) : `day ${d}`)), values: vals,
    label: "log2 change from days 1-5", diverging: true, format: (v) => (v === null || v === undefined ? "–" : v.toFixed(2)), cell: innerWidth < 600 ? 26 : 44 });
}

// Figure 2: PCoA of the ten days
const CS = D.community_shift;
// Figure 1 (Q4): the pathway as a drawn scheme; gene boxes from D.pathway (np26 scripts/43 pathway())
function drawPathway() {
  const P = Object.fromEntries(D.pathway.map((g) => [g.gene, g]));
  const W = 480, X = 150; // main chain at x = X
  const col = (g) => (g.dir === "down" ? "var(--c1)" : g.dir === "up" ? "var(--c2)" : "var(--muted)");
  const sym = { up: "▲", down: "▼", level: "●" };
  const t = (x, y, txt, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 12}" text-anchor="${o.anchor || "start"}" fill="${o.fill || "var(--ink)"}"${o.bold ? ' font-weight="600"' : ""}>${esc(txt)}</text>`;
  const arrow = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke || "var(--muted)"}" stroke-width="1.6"${o.dash ? ' stroke-dasharray="5 4"' : ""} marker-end="url(#g3ah)"/>`;
  const box = (x, y, w, genes) => {
    // one box per enzyme step; genes: list of gene ids shown in it
    const lines = [];
    genes.forEach((id) => {
      const g = P[id];
      lines.push([`${g.gene} · ${g.enzyme}`, "var(--ink)", true]);
      if (!g.dir) lines.push(["not searched", "var(--muted)", false]);
      else {
        lines.push([`found by ${g.how}`, "var(--muted)", false]);
        const gen = g.genera.filter((x) => Math.abs(x.pp) >= 0.05).map((x) => `${x.genus} ${x.pp > 0 ? "+" : "−"}${Math.abs(x.pp).toFixed(1)}`).join(", ");
        lines.push([`${sym[g.dir]} ${g.dir} (log2 ${g.log2 > 0 ? "+" : "−"}${Math.abs(g.log2).toFixed(2)})`, col(g), true]);
        if (gen) lines.push([`${gen} points`, col(g), false]);
      }
    });
    const h = 10 + lines.length * 15;
    const searched = genes.some((id) => P[id].dir);
    const stroke = genes.map((id) => P[id]).find((g) => g.dir && g.dir !== "level");
    let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--surface)" stroke="${stroke ? col(stroke) : "var(--line)"}" stroke-width="${stroke ? 2 : 1}"${searched ? "" : ' stroke-dasharray="4 3"'}/>`;
    lines.forEach(([txt, fill, bold], i) => { out += t(x + 8, y + 18 + i * 15, txt, { size: 10.5, fill, bold }); });
    return { svg: out, h };
  };
  let svg = `<defs><marker id="g3ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--muted)"/></marker></defs>`;
  const met = [["acetyl-CoA (× 2)", 24], ["acetoacetyl-CoA", 104], ["3-hydroxybutyryl-CoA", 184], ["crotonyl-CoA", 264], ["butyryl-CoA", 360]];
  met.forEach(([m, y]) => { svg += t(X, y, m, { anchor: "middle", bold: true, size: 13 }); });
  [["thl", 30], ["hbd", 110], ["crt", 190]].forEach(([id, y]) => {
    svg += arrow(X, y + 2, X, y + 60);
    svg += box(X + 70, y + 4, 255, [id]).svg;
  });
  svg += arrow(X, 272, X, 344);
  const b = box(X + 70, 280, 255, ["bcd"]);
  svg += b.svg;
  // alternative entries (not searched), joining at crotonyl-CoA
  svg += `<rect x="4" y="212" width="126" height="34" rx="6" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/>`;
  svg += t(10, 226, "lysine, glutarate,", { size: 10, fill: "var(--muted)" }) + t(10, 239, "4-aminobutyrate routes", { size: 10, fill: "var(--muted)" });
  svg += arrow(60, 247, X - 50, 258, { dash: true });
  svg += t(8, 262, "not searched", { size: 10, fill: "var(--muted)" });
  // two final steps
  const L = 90, R = 340;
  svg += arrow(X - 10, 368, L, 398) + arrow(X + 10, 368, R, 398);
  const bb = box(4, 402, 228, ["but"]);
  svg += bb.svg;
  const ba = box(4, 402 + bb.h + 6, 228, ["atoD", "atoA"]);
  svg += ba.svg;
  svg += t(118, 402 + bb.h + ba.h + 22, "acetate in → acetyl-CoA out", { size: 10, anchor: "middle", fill: "var(--muted)" });
  const yL = 402 + bb.h + ba.h + 30;
  const pb = box(248, 402, 228, ["ptb"]);
  svg += pb.svg;
  svg += t(R + 22, 402 + pb.h + 28, "butyryl-phosphate", { anchor: "middle", bold: true, size: 12 });
  svg += arrow(R + 22, 402 + pb.h + 2, R + 22, 402 + pb.h + 14) + arrow(R + 22, 402 + pb.h + 34, R + 22, 402 + pb.h + 46);
  const kb = box(248, 402 + pb.h + 50, 228, ["buk"]);
  svg += kb.svg;
  svg += t(R + 22, 402 + pb.h + 50 + kb.h + 22, "ATP made", { size: 10, anchor: "middle", fill: "var(--muted)" });
  const yB = Math.max(yL, 402 + pb.h + 50 + kb.h + 30) + 24;
  svg += arrow(118, yL, 200, yB - 14) + arrow(R + 22, 402 + pb.h + 50 + kb.h + 30, 300, yB - 14);
  svg += t(250, yB, "butyrate", { anchor: "middle", bold: true, size: 14 });
  svg += t(6, 384, "CoA-transferase route", { size: 10.5, fill: "var(--muted)" });
  svg += t(474, 384, "kinase route", { anchor: "end", size: 10.5, fill: "var(--muted)" });
  const H = yB + 12;
  $("g3Path").innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:640px;display:block;margin:0 auto" role="img" aria-label="Butyrate pathway with the searched genes and their change">${svg}</svg>`;
}

function drawCommunity() {
  const P = CS.pcoa;
  const pts = D.days.map((d, i) => ({ x: P.x[i], y: P.y[i], label: `day ${d}`, group: i < 5 ? "days 1-5" : "days 6-10", color: i < 5 ? "var(--c1)" : "var(--c2)", size: 6 }));
  scatter($("g3DayPcoa"), { points: pts, xLabel: `PCoA axis 1 (${N.q3_pc1}%)`, yLabel: `PCoA axis 2 (${N.q3_pc2}%)`, labelled: true, height: 320 });
  // join the days in order: a polyline through the drawn points (re-added whenever the chart redraws)
  const join = () => {
    const svg = $("g3DayPcoa").querySelector("svg");
    if (!svg || svg.querySelector("polyline.g3join")) return;
    const cs = [...svg.querySelectorAll("circle.dot")];
    if (cs.length !== pts.length) return;
    const pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    pl.setAttribute("class", "g3join");
    pl.setAttribute("points", cs.map((c) => `${c.getAttribute("cx")},${c.getAttribute("cy")}`).join(" "));
    pl.setAttribute("style", "fill:none;stroke:var(--muted);stroke-width:1;opacity:0.6");
    svg.insertBefore(pl, cs[0]);
  };
  if (!drawCommunity.obs) { drawCommunity.obs = new MutationObserver(join); drawCommunity.obs.observe($("g3DayPcoa"), { childList: true, subtree: true }); }
  join();
}

drawCapture();
drawRel();
drawPathway();
drawCommunity();
drawGeneHeat();
