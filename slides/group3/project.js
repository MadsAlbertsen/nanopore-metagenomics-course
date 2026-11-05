// Group 3 slides: DATA is a subset of articles/group3/data.json (same chart code as the article).
const D = DATA, N = D.numbers;
N.n_days = D.days.length;
document.querySelectorAll("[data-n]").forEach((e) => { e.textContent = String(N[e.dataset.n] ?? "?"); });
const SPLIT = "diet switch";
const FR = ["HQ", "MQ", "unbinned"], FRN = { HQ: "HQ MAGs", MQ: "MQ MAGs", unbinned: "unbinned contigs" };
const CAP = D.capture;
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// Fig 1 and Fig 2
const B = CAP.bases;
lineChart($("g3Cap"), { x: D.days, height: 270, series: [...FR.map((q) => ({ name: FRN[q], values: B[q] })), { name: "no contig", values: B["not assembled"] }],
  xLabel: "Day", xName: "Day", yLabel: "Share of bases (%)", unit: "%", marks: [{ x: 5.5, label: SPLIT }], zero: true });
barChart($("g3CapGenes"), { labels: D.genes, height: 270, groups: FR.map((q) => ({ name: FRN[q], values: D.genes.map((g) => mean(CAP.gene_share[g][q])) })),
  yLabel: "Share of the gene's copies (%)", unit: "%", fmt: (v) => v.toFixed(0) });

// Fig 3
const CS = D.community_shift, P = CS.pcoa;
const pts = D.days.map((d, i) => ({ x: P.x[i], y: P.y[i], label: `day ${d}`, group: i < 5 ? "days 1-5" : "days 6-10", color: i < 5 ? "var(--c1)" : "var(--c2)", size: 6 }));
scatter($("g3DayPcoa"), { points: pts, xLabel: `PCoA axis 1 (${N.q3_pc1}%)`, yLabel: `PCoA axis 2 (${N.q3_pc2}%)`, labelled: true, height: 255 });
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
new MutationObserver(join).observe($("g3DayPcoa"), { childList: true, subtree: true });
join();

// Fig 6 (the genes without the stats columns)
{
  const order = ["bcd", "but", "atoD", "atoA", "ptb", "buk"], step = { bcd: "dehydrogenase", but: "CoA-transf.", atoD: "CoA-transf.", atoA: "CoA-transf.", ptb: "kinase", buk: "kinase" };
  const vals = order.map((g) => {
    const row = CAP.per_bin[g], base = mean(row.slice(0, 5));
    return row.map((v) => (v > 0 && base > 0 ? Math.log2(v / base) : null));
  });
  const span = Math.ceil(Math.max(...vals.flat().filter((v) => v !== null).map(Math.abs)) * 2) / 2; // colour limit: largest |log2|, rounded up to 0.5
  heatmap($("g3GeneHeat"), { rows: order.map((g) => `${g} · ${step[g]}`), cols: D.days.map(String), values: vals, colLabelHeight: 24, cell: 34,
    label: "log2 vs days 1-5", diverging: true, span, format: (v) => (v === null || v === undefined ? "–" : v.toFixed(2)) });
  const lg = $("g3GeneHeat").querySelector(".legend");
  if (lg) lg.innerHTML = `<span>log2 vs days 1-5: −${span.toFixed(1)} <i style="display:inline-block;width:160px;height:10px;vertical-align:-1px;background:linear-gradient(90deg,var(--c1),var(--v4),var(--c2))"></i> +${span.toFixed(1)} (−1 = half)</span>`;
}

// Simplified Figure 4: the butyrate pathway, without (change = false) or with (change = true) the change of each gene
function pathway(host, change) {
  const G = Object.fromEntries(D.pathway.map((g) => [g.gene, g]));
  const X = 70, sym = { up: "▲", down: "▼", level: "●" };
  const col = (g) => (change && g.dir === "down" ? "var(--c1)" : change && g.dir === "up" ? "var(--c2)" : "var(--muted)");
  const fmt = (v) => `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`;
  const t = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 12}" text-anchor="${o.anchor || "start"}" fill="${o.fill || "var(--ink)"}"${o.bold ? ' font-weight="600"' : ""}>${esc(s)}</text>`;
  const arrow = (x1, y1, x2, y2, dash) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--muted)" stroke-width="1.5"${dash ? ' stroke-dasharray="4 3"' : ""} marker-end="url(#pah${change ? 1 : 0})"/>`;
  // a box with lines [text, fill, bold]; returns svg and height
  const box = (x, y, w, lines, ids) => {
    const h = 9 + lines.length * 15;
    const gs = ids.map((i) => G[i]);
    const searched = gs.some((g) => g.dir);
    const ch = change ? gs.find((g) => g.dir && g.dir !== "level") : null;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--surface)" stroke="${ch ? col(ch) : "var(--line)"}" stroke-width="${ch ? 2 : 1.2}"${searched ? "" : ' stroke-dasharray="4 3"'}/>`;
    lines.forEach(([s1, f, b], i) => { s += t(x + 8, y + 18 + i * 15, s1, { size: 11, fill: f, bold: b }); });
    return { s, h };
  };
  const one = (id, name) => {
    const g = G[id], l = [[`${id} · ${name}`, "var(--ink)", true]];
    if (change && g.dir) l.push([`${sym[g.dir]} ${g.dir}, log2 ${fmt(g.log2)}`, col(g), true]);
    return l;
  };
  let svg = `<defs><marker id="pah${change ? 1 : 0}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--muted)"/></marker></defs>`;
  [["acetyl-CoA", 14], ["acetoacetyl-CoA", 50], ["3-hydroxybutyryl-CoA", 86], ["crotonyl-CoA", 122], ["butyryl-CoA", 158]].forEach(([m, y]) => { svg += t(X, y, m, { anchor: "middle", bold: true, size: 12 }); });
  [["thl", "thiolase", 14], ["hbd", "dehydrogenase", 50], ["crt", "crotonase", 86]].forEach(([id, n, y]) => {
    svg += arrow(X, y + 4, X, y + 20) + box(150, y + 4, 175, [[`${id} · ${n}`, "var(--muted)", false]], [id]).s;
  });
  svg += arrow(X, 126, X, 144) + box(150, 122, 175, one("bcd", "dehydrogenase"), ["bcd"]).s;
  svg += `<rect x="338" y="44" width="120" height="58" rx="6" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/>` + [["lysine, glutarate,", 60], ["4-aminobutyrate", 73], ["routes, entering at", 86], ["crotonyl-CoA: not searched", 99]].map(([x, y]) => t(343, y - 4, x, { size: 9.5, fill: "var(--muted)" })).join("");
  const Y = 190;
  svg += arrow(X - 8, 164, 70, Y - 2) + arrow(X + 8, 164, 336, Y - 2);
  const bb = box(4, Y, 200, one("but", "CoA-transferase"), ["but"]);
  const ab = box(4, Y + bb.h + 6, 200, change ? [[`atoD · CoA-transferase`, "var(--ink)", true], [`${sym[G.atoD.dir]} ${G.atoD.dir}, log2 ${fmt(G.atoD.log2)}`, col(G.atoD), true], [`atoA ${sym[G.atoA.dir]} ${G.atoA.dir}, log2 ${fmt(G.atoA.log2)}`, col(G.atoA), true]] : [["atoD, atoA · CoA-transferase", "var(--ink)", true]], ["atoD", "atoA"]);
  svg += bb.s + ab.s + t(104, Y + bb.h + ab.h + 20, "uses acetate", { anchor: "middle", size: 10, fill: "var(--muted)" });
  const pb = box(232, Y, 224, one("ptb", "phosphate butyryltransferase"), ["ptb"]);
  svg += pb.s + t(344, Y + pb.h + 24, "butyryl-phosphate", { anchor: "middle", bold: true, size: 12 }) + arrow(344, Y + pb.h + 2, 344, Y + pb.h + 12) + arrow(344, Y + pb.h + 30, 344, Y + pb.h + 40);
  const kb = box(232, Y + pb.h + 42, 224, one("buk", "butyrate kinase"), ["buk"]);
  svg += kb.s + t(344, Y + pb.h + 42 + kb.h + 15, "makes ATP", { anchor: "middle", size: 10, fill: "var(--muted)" });
  const yB = Math.max(Y + bb.h + ab.h + 38, Y + pb.h + 42 + kb.h + 38);
  svg += arrow(104, Y + bb.h + ab.h + 24, 200, yB - 14) + arrow(344, Y + pb.h + 42 + kb.h + 20, 290, yB - 14);
  svg += t(245, yB, "butyrate", { anchor: "middle", bold: true, size: 13 });
  svg += t(100, 184, "CoA-transferase route", { size: 10, fill: "var(--muted)" }) + t(456, 183, "kinase route", { anchor: "end", size: 10, fill: "var(--muted)" });
  host.innerHTML = `<svg viewBox="0 0 460 ${yB + 8}" width="100%" style="max-height:310px;display:block;margin:0 auto" role="img" aria-label="Butyrate pathway">${svg}</svg>`;
}
pathway($("pathPlain"), false);
pathway($("pathChange"), true);
