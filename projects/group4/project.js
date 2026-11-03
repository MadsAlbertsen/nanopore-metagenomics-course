// Group 4: diet periods from CAZyme gene potential vs MAG composition, and stability. DATA from data.json
// (np26 scripts/44_project_group4.py); numbers in the text and in the key findings come from DATA.numbers.
const D = DATA;
const N = D.numbers;
const st = { cat: "abs", sort: "taxa", stab: "taxa" };
const PROFILE = { taxa: "species mix", functions: "genes" };

// a number from DATA.numbers: d = decimals, sign = show + for positive values
function num(key, d, sign) {
  const v = N[key];
  if (v === undefined) throw new Error(`no number ${key} in data.json`);
  if (typeof v !== "number") return String(v);
  const s = d === undefined || d === "" ? String(v) : v.toFixed(+d);
  return sign && v > 0 ? "+" + s : s;
}
for (const e of document.querySelectorAll("[data-n]")) e.textContent = num(e.dataset.n, e.dataset.d, e.dataset.sign);
// key findings (project.yaml takeaways): {key} or {key|decimals} or {key|decimals|+}
const fillText = (t) => t.replace(/\{(\w+)(?:\|(\d))?(\|\+)?\}/g, (m, k, d, s) => num(k, d, !!s));
for (const e of document.querySelectorAll(".closing li")) e.textContent = fillText(e.textContent);

function stats() {
  const items = [[N.n_mags, "MAGs, weighted by their share of each day"], [N.n_families, "degrading CAZy families"],
    [`${N.taxa_correct} / 10`, "days sorted right by species mix"], [`${N.func_correct} / 10`, "days sorted right by genes"]];
  $("pjStats").innerHTML = items.map(([n, t]) => `<div class="stat"><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join("");
}

function tabs(id, key) {
  for (const b of $(id).querySelectorAll("button")) b.setAttribute("aria-selected", String(b.dataset.v === st[key]));
}

function drawCat() {
  tabs("catView", "cat");
  const rel = st.cat === "rel";
  const series = D.categories.map((c) => {
    const m = c.values.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    return { name: c.name, values: rel ? c.values.map((v) => (100 * v) / m) : c.values };
  });
  lineChart($("pjCat"), {
    x: D.days, series, xLabel: "Day", xName: "Day", unit: rel ? "%" : "per 1,000 genes",
    yLabel: rel ? "Percent of the days 1-5 mean (%)" : "Genes per 1,000 genes of the MAGs",
    marks: [{ x: 5.5, label: "diet switch" }], zero: !rel,
  });
}

function drawRed() {
  const order = ["Plant fibre", "Starch", "Fructan", "Host glycans", "Mixed", "Other", "Unmapped"];
  const COLORS = { "Plant fibre": "var(--c1)", Starch: "var(--c2)", Fructan: "var(--c3)", "Host glycans": "var(--c4)",
    Mixed: "var(--c5)", Other: "var(--faint)", Unmapped: "var(--c7)" };
  const pts = [...D.redundancy].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
  scatter($("pjRed"), {
    // no group key: the kit's legend would use its own colour order; our own legend below
    points: pts.map((r) => ({ x: r.carriers, y: r.cv, label: r.family, color: COLORS[r.category],
      extra: `${r.category} · ${r.mean} per 1,000 genes` })),
    xLabel: "Common MAGs carrying the family (log scale)", yLabel: "Day-to-day variation (CV, %)", logX: true,
  });
  const host = $("pjRedLegend");
  host.innerHTML = "";
  chartLegend(host, order.filter((c) => pts.some((r) => r.category === c)).map((c) => ({ name: c, color: COLORS[c] })));
}

function drawSort() {
  tabs("sortView", "sort");
  const rows = D.loo[st.sort];
  // grey = sorted right, purple = sorted wrong (not blue / orange: those mean down / up in Figure 5)
  barChart($("pjSort"), {
    labels: rows.map((r) => `Day ${r.day}${r.correct ? "" : " ✗"}`), values: rows.map((r) => r.margin),
    colors: rows.map((r) => (r.correct ? "var(--faint)" : "var(--c7)")),
    yLabel: `Margin (Bray-Curtis, ${PROFILE[st.sort]})`,
    fmt: (v) => v.toFixed(3),
  });
  table($("pjSortTable"), {
    columns: [{ key: "day", label: "Day", num: true, fmt: (v) => String(v) }, { key: "period", label: "Period" },
      { key: "own", label: "To own period", num: true, fmt: (v) => v.toFixed(3) },
      { key: "other", label: "To other period", num: true, fmt: (v) => v.toFixed(3) },
      { key: "assigned", label: "Sorted into" }],
    rows, sortable: false,
  });
}

function drawStab() {
  tabs("stabView", "stab");
  lineChart($("pjDrift"), {
    x: D.days, series: [{ name: "To days 1-5", values: D.to_first[st.stab] }], xLabel: "Day", xName: "Day",
    yLabel: `To days 1-5 (Bray-Curtis, ${PROFILE[st.stab]})`, marks: [{ x: 5.5, label: "diet switch" }], zero: true, height: 240,
  });
  const names = D.days.map((d) => `Day ${d}`);
  heatmap($("pjHeat"), { rows: names, cols: names, values: D.bc[st.stab].map((r, i) => r.map((v, j) => (i === j ? null : v))), label: `Bray-Curtis (${PROFILE[st.stab]})`, format: (v) => (v === null ? "–" : v.toFixed(3)) });
  const s = D.stability[st.stab];
  barChart($("pjStab"), {
    labels: ["All pairs of days", "Neighbouring days"],
    groups: [["Days 1-5", s.first], ["Days 6-10", s.second], ["Days 7-10", s.late]].map(([name, x]) => ({ name, values: [x.all_mean, x.cons_mean] })),
    yLabel: `Mean Bray-Curtis (${PROFILE[st.stab]})`, fmt: (v) => v.toFixed(3), height: 230,
  });
}

function drawFam() {
  const f = D.families;
  const c1 = "var(--c1)", c2 = "var(--c2)";
  barChart($("pjFam"), {
    labels: f.map((r) => `${r.family} (${r.category})`), values: f.map((r) => r.log2), horizontal: true,
    colors: f.map((r) => (r.log2 > 0 ? c2 : c1)), yLabel: "log2 change, days 6-10 over days 1-5", fmt: (v) => v.toFixed(2),
  });
  table($("pjFamTable"), {
    columns: [{ key: "family", label: "Family" }, { key: "category", label: "Substrate group" },
      { key: "first", label: "Days 1-5 (per 1,000 genes)", num: true, fmt: (v) => v.toFixed(2) },
      { key: "second", label: "Days 6-10 (per 1,000 genes)", num: true, fmt: (v) => v.toFixed(2) },
      { key: "log2", label: "log2 change", num: true, fmt: (v) => v.toFixed(2) },
      { key: "apart", label: "Periods apart", fmt: (v) => (v ? "yes" : "no") },
      { key: "top_mag", label: "Main MAG (where higher)" },
      { key: "top_pct", label: "Its part (%)", num: true, fmt: (v) => v.toFixed(0) }],
    rows: f, filter: true, sortKey: "log2", sortDesc: true,
  });
}

function drawAll() { drawCat(); drawRed(); drawSort(); drawStab(); drawFam(); }

for (const [id, key, draw] of [["catView", "cat", drawCat], ["sortView", "sort", drawSort], ["stabView", "stab", drawStab]]) {
  $(id).addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-v]");
    if (!b) return;
    st[key] = b.dataset.v;
    draw();
  });
}

stats();
drawAll();
