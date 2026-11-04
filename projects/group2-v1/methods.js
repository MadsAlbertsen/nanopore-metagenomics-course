// Group 2 rationale document: numbers from DATA (np26 scripts/42_project_group2.py) and the input inventory.
const N2 = DATA.numbers;
document.querySelectorAll("[data-n]").forEach((s) => {
  const v = N2[s.dataset.n];
  s.textContent = v === undefined ? "?" : s.dataset.d !== undefined ? Number(v).toFixed(+s.dataset.d) : String(v);
});
table($("m2Inv"), { columns: [{ key: "file", label: "File" }, { key: "what", label: "What it holds" }, { key: "rows", label: "Rows", num: true, fmt: String }],
  rows: DATA.inventory, sortable: false });
