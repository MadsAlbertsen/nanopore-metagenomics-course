// Shared helpers for every module page (loaded before the module's own script).
const $ = (id) => document.getElementById(id);
const VIRIDIS = ["#440154", "#482878", "#3e4989", "#31688e", "#26828e", "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"];
const viridis = (t) => {
  const x = Math.max(0, Math.min(1, t)) * (VIRIDIS.length - 1), i = Math.min(Math.floor(x), VIRIDIS.length - 2), f = x - i;
  const a = VIRIDIS[i], b = VIRIDIS[i + 1], h = (s, k) => parseInt(s.slice(k, k + 2), 16);
  const c = [1, 3, 5].map((k) => Math.round(h(a, k) + (h(b, k) - h(a, k)) * f));
  return `rgb(${c.join(",")})`;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtBp = (n) => n >= 1e6 ? (n / 1e6).toFixed(2) + " Mb" : n >= 1e3 ? Math.round(n / 1e3) + " kb" : n + " bp";
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const SVGNS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

// tooltip (the page skeleton has <div class="tip" id="tip">)
const tip = $("tip");
function showTip(ev, html) {
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect(), pad = 12;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - pad;
  if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - pad;
  tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, y) + "px";
}
const hideTip = () => { tip.hidden = true; };

// page state in the address: #?key=value&... (a link restores the view)
function readHashParams() {
  const h = location.hash.match(/^#[\w-]*\?(.*)$/);
  return h ? Object.fromEntries(new URLSearchParams(h[1])) : {};
}
function writeHashParams(params) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, v);
  try { history.replaceState(null, "", "#?" + p.toString()); } catch (e) {}
}

// Guided examples: EXAMPLES = [{title, question, answer, state}] from the module's examples.yaml.
// host: element with .exlist and .exbody; open(k) applies example k (the module redraws itself).
function setupExamples(host, open) {
  if (!EXAMPLES.length) { host.hidden = true; return { draw() {} }; }
  host.hidden = false;
  const ui = { current: -1 };
  ui.draw = () => {
    host.querySelector(".exlist").innerHTML = EXAMPLES.map((e, k) => `<button role="listitem" data-ex="${k}" aria-current="${k === ui.current}">${k + 1}. ${esc(e.title)}</button>`).join("");
    const e = EXAMPLES[ui.current], k = ui.current;
    host.querySelector(".exbody").innerHTML = e
      ? `<div class="ex"><h3>${k + 1}. ${esc(e.title)}</h3><p>${esc(e.question)}</p><details><summary>Show answer</summary><p>${esc(e.answer)}</p></details>
        <div style="display:flex;flex-wrap:wrap;gap:6px 16px">${k > 0 ? `<button class="link" data-ex="${k - 1}">← Previous</button>` : ""}${k < EXAMPLES.length - 1 ? `<button class="link" data-ex="${k + 1}">Next example →</button>` : ""}<button class="link" data-ex="${k}">Reset this example</button></div></div>`
      : `<p class="note">Each example sets up the page and asks a question; the answer is hidden until you open it. You can change anything afterwards.</p>`;
  };
  host.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-ex]");
    if (!t) return;
    ui.current = +t.dataset.ex; ui.draw(); open(ui.current);
  });
  ui.draw();
  return ui;
}

// Links to the same MAG on the other module pages (modules with mag_link in module.yaml).
// inline: a short "also in" list for a table row instead of a paragraph.
function magLinks(id, current, inline = false) {
  const links = MODULES.filter((m) => m.mag_link && m.slug !== current)
    .map((m) => `<a href="${m.slug}.html${m.mag_link.replace("{id}", encodeURIComponent(id))}">${m.number}. ${esc(m.nav)}</a>`);
  if (!links.length) return "";
  return inline ? `<span class="maglinks">also in ${links.join(", ")}</span>` : `<p class="maglinks">This MAG in other modules: ${links.join(" · ")}</p>`;
}
