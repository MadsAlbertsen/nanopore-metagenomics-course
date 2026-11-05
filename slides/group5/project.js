// Slide 3 numbers and slide 4 chart (Figure 1 of the group's article: articles/group5/project.js drawCtx, adapted to the slide size)
const D = DATA, N = D.numbers;
document.querySelectorAll("[data-n]").forEach((e) => { e.textContent = N[e.dataset.n] ?? "?"; });
const CTX = [["hq", "HQ MAGs", "var(--c1)"], ["mq", "MQ MAGs", "var(--c3)"], ["unbinned", "Unbinned contigs", "var(--c4)"], ["off", "Not on the assembly", "var(--c2)"]];
function drawCtx() {
  const host = $("g5Ctx"), S = D.context;
  mountChart(host, () => {
    const { svg, W, H } = newSvg(host, 270);
    const box = { l: 52, r: W - 8, t: 22, b: H - 44 };
    const n = S.length, band = (box.r - box.l) / n, bw = band * 0.72;
    const y = scale(0, 100, box.b, box.t);
    axes(svg, () => 0, y, box, { yLabel: "Share of the filtered bases (%)", xTicks: [], yTicks: y.ticks(5) });
    const hi = S.filter((s) => s.diet === "high_carb").length;
    el("text", { x: box.l + (band * hi) / 2, y: box.t - 8, "text-anchor": "middle", class: "note" }, svg).textContent = "high carb";
    el("text", { x: box.l + band * (hi + (n - hi) / 2), y: box.t - 8, "text-anchor": "middle", class: "note" }, svg).textContent = "low carb";
    S.forEach((s, i) => {
      const xc = box.l + band * (i + 0.5);
      let acc = 0;
      for (const [k, name, color] of CTX) {
        const v = s[k];
        const rect = el("rect", { x: xc - bw / 2, y: y(acc + v), width: bw, height: y(acc) - y(acc + v), style: `fill:${color}` }, svg);
        tipOn(rect, `<b>${esc(s.sample)} · day ${s.day}</b> (${s.gbp.toFixed(2)} Gbp)<br>${esc(name)}: ${v.toFixed(1)}%`);
        acc += v;
      }
      el("text", { x: xc, y: box.b + 16, "text-anchor": "middle" }, svg).textContent = String(s.day);
    });
    el("line", { x1: box.l + band * hi, x2: box.l + band * hi, y1: box.t, y2: box.b, class: "mark" }, svg);
    el("text", { x: (box.l + box.r) / 2, y: box.b + 34, "text-anchor": "middle", class: "lab" }, svg).textContent = "Day";
    chartLegend(host, CTX.map(([, name, color]) => ({ name, color })));
  });
}
drawCtx();
