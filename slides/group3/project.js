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
scatter($("g3DayPcoa"), { points: pts, xLabel: `PCoA axis 1 (${N.q3_pc1}%)`, yLabel: `PCoA axis 2 (${N.q3_pc2}%)`, labelled: true, height: 225 });
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

// Simplified Figure 4: the butyrate pathway, gene symbols only, without (change = false) or with (change = true) the change of each gene
function pathway(host, change) {
  const G = Object.fromEntries(D.pathway.map((g) => [g.gene, g]));
  const X = 100, sym = { up: "▲", down: "▼", level: "●" }, mk = change === true ? 1 : change === "mark" ? 2 : 0;
  const col = (g) => (change && g.dir === "down" ? "var(--c1)" : change && g.dir === "up" ? "var(--c2)" : "var(--muted)");
  const fmt = (v) => `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`;
  const t = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 12}" text-anchor="${o.anchor || "start"}" fill="${o.fill || "var(--ink)"}"${o.bold ? ' font-weight="600"' : ""}>${esc(s)}</text>`;
  const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#pah${mk})"/>`;
  // one box per gene symbol (or pair); w = width, change = text after the symbol
  const box = (x, y, w, ids) => {
    const g = G[ids[0]], searched = !!g.dir, ch = change && searched && g.dir !== "level";
    const label = ids.length > 1 ? ids.join(", ") : ids[0];
    const extra = change && searched ? (change === true ? `  ${sym[g.dir]} ${fmt(g.log2)}` : g.dir === "level" ? "" : `  ${sym[g.dir]}`) : "";
    return `<rect x="${x}" y="${y}" width="${w}" height="24" rx="6" fill="var(--surface)" stroke="${ch ? col(g) : "var(--line)"}" stroke-width="${ch ? 2 : 1.2}"${searched ? "" : ' stroke-dasharray="4 3"'}/>`
      + t(x + 8, y + 16, label, { size: 12, bold: searched, fill: searched ? "var(--ink)" : "var(--muted)" }) + (extra ? t(x + w - 8, y + 16, extra.trim(), { anchor: "end", size: 12, bold: true, fill: col(g) }) : "");
  };
  let svg = `<defs><marker id="pah${mk}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--muted)"/></marker></defs>`;
  const ys = [14, 52, 90, 128, 166];
  ["acetyl-CoA", "acetoacetyl-CoA", "3-hydroxybutyryl-CoA", "crotonyl-CoA", "butyryl-CoA"].forEach((m, k) => { svg += t(X, ys[k], m, { anchor: "middle", bold: true, size: 12 }); });
  ["thl", "hbd", "crt", "bcd"].forEach((id, k) => {
    svg += arrow(X, ys[k] + 4, X, ys[k + 1] - 15) + box(X + 80, ys[k] + 7, change && id === "bcd" ? 110 : 56, [id]);
  });
  svg += `<rect x="330" y="52" width="106" height="40" rx="6" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/>` + t(383, 69, "amino-acid routes", { size: 10.5, anchor: "middle", fill: "var(--muted)" }) + t(383, 83, "not searched", { size: 10.5, anchor: "middle", fill: "var(--muted)" });
  const Y = 200;
  svg += arrow(X - 10, 172, 70, Y - 3) + arrow(X + 10, 172, 330, Y - 3);
  svg += box(4, Y, 150, ["but"]) + box(4, Y + 30, 150, ["atoD"]) + box(4, Y + 60, 150, ["atoA"]);
  svg += box(256, Y, 180, ["ptb"]) + t(346, Y + 46, "butyryl-phosphate", { anchor: "middle", bold: true, size: 12 }) + arrow(346, Y + 26, 346, Y + 34) + arrow(346, Y + 52, 346, Y + 60) + box(256, Y + 62, 180, ["buk"]);
  svg += t(79, Y + 102, "CoA-transferase route", { anchor: "middle", size: 10.5, fill: "var(--muted)" }) + t(346, Y + 102, "kinase route", { anchor: "middle", size: 10.5, fill: "var(--muted)" });
  svg += arrow(79, Y + 108, 200, Y + 126) + arrow(346, Y + 108, 260, Y + 126) + t(230, Y + 142, "butyrate", { anchor: "middle", bold: true, size: 13 });
  host.innerHTML = `<svg viewBox="0 0 440 ${Y + 150}" width="100%" style="max-height:310px;display:block;margin:0 auto" role="img" aria-label="Butyrate pathway">${svg}</svg>`;
}
const grp = (cls, from, to, txt) => `<div class="grp"><div class="dots">${D.days.filter((d) => d >= from && d <= to).map((d) => `<i class="${cls}">${d}</i>`).join("")}</div><span class="dl ${cls}">${txt}</span></div>`;
$("dayStrip").innerHTML = grp("hi", 1, 5, "days 1-5: high carbohydrate, high calorie") + grp("lo", 6, 10, "days 6-10: low carbohydrate, low calorie");
pathway($("pathPlain"), "mark");
pathway($("pathChange"), true);
