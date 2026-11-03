// Module 8: catalogue of the data a group project can use (DATA from np26 scripts/34_course_data.py).
const LEVELS = [
  ["ready", "Ready"],
  ["compute", "Quick to compute"],
  ["server", "Needs a server job"],
  ["none", "Not measured"],
];
const LEVEL_NAME = Object.fromEntries(LEVELS);
const MODULE_BY_SLUG = Object.fromEntries(MODULES.map((m) => [m.slug, m]));
const st = { topic: "all", level: "all", find: "" };
Object.assign(st, (({ topic, level, find }) => ({ topic: topic || "all", level: level || "all", find: find || "" }))(readHashParams()));

function stats() {
  const c = DATA.counts;
  const fmt = (n) => Number(n).toLocaleString("en-US");
  const items = [
    [fmt(c.samples), "days (samples)"],
    [fmt(c.contigs), "contigs"],
    [fmt(c.mags), "MAGs"],
    [(c.bakta_cds / 1e6).toFixed(2) + " M", "protein-coding genes"],
    [fmt(c.motifs), "methylation motifs"],
  ];
  $("dtStats").innerHTML = items.map(([n, l]) => `<div class="stat"><b>${n}</b><span>${esc(l)}</span></div>`).join("");
}

function chips(host, options, key) {
  host.innerHTML = options.map(([id, name]) => `<button type="button" data-v="${id}" aria-pressed="${st[key] === id}">${esc(name)}</button>`).join("");
  host.onclick = (ev) => {
    const b = ev.target.closest("button[data-v]");
    if (!b) return;
    st[key] = b.dataset.v;
    draw();
  };
}

function card(it) {
  const mod = it.module && MODULE_BY_SLUG[it.module];
  const qs = it.questions.length ? `<ul>${it.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>` : "";
  const link = mod ? `<p class="dtunit">Shown in <a href="${mod.slug}.html">module ${mod.number}: ${esc(mod.nav)}</a></p>` : "";
  const files = it.files.length ? `<details><summary>Files (for the teachers)</summary>${it.files.map((f) => `<code>${esc(f)}</code>`).join("<br>")}</details>` : "";
  return `<article class="panel dtcard"><span class="dtlevel ${it.level}">${esc(LEVEL_NAME[it.level])}</span><h3>${esc(it.title)}</h3><p>${esc(it.what)}</p>${it.unit ? `<p class="dtunit">One row ${esc(it.unit)}</p>` : ""}${qs ? `<p class="dtunit">Can help answer:</p>${qs}` : ""}${link}${files}</article>`;
}

function draw() {
  chips($("dtTopics"), [["all", "All"], ...DATA.topics.map((t) => [t.id, t.name])], "topic");
  chips($("dtLevels"), [["all", "All"], ...LEVELS], "level");
  const words = st.find.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = DATA.items.filter((it) => {
    if (st.topic !== "all" && it.topic !== st.topic) return false;
    if (st.level !== "all" && it.level !== st.level) return false;
    const text = [it.title, it.what, ...it.questions].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  });
  $("dtList").innerHTML = DATA.topics
    .map((t) => {
      const here = shown.filter((it) => it.topic === t.id);
      return here.length ? `<section class="dttopic"><h2>${esc(t.name)}</h2><div class="dtgrid">${here.map(card).join("")}</div></section>` : "";
    })
    .join("") || `<p class="panel note">Nothing matches. Clear the search or choose another topic.</p>`;
  $("dtCount").textContent = `${shown.length} of ${DATA.items.length} items`;
  writeHashParams({ topic: st.topic === "all" ? "" : st.topic, level: st.level === "all" ? "" : st.level, find: st.find });
}

$("dtFind").value = st.find;
$("dtFind").addEventListener("input", (e) => {
  st.find = e.target.value;
  draw();
});
stats();
draw();
