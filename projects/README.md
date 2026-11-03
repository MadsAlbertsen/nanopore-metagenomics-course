# Group project reports

One folder per group report: `projects/groupN/`. Copy `projects/example/` (the template, `publish: false`) and keep
its sections and their order.

## Files

| File | What | Who writes it |
|---|---|---|
| `project.yaml` | `number` (group), `slug` (`project-groupN`), `title`, `nav`, `question` (one-paragraph summary for the projects page), `status` (`draft` until checked, then `ready`), optional `data_note`, `takeaways`, `discussion` | by hand |
| `body.html` | the report text and one `<div id=...>` per figure | by hand |
| `project.js` | one chart call per figure, guided examples | by hand |
| `project.css` | optional, page-specific styles only | by hand |
| `examples.yaml` | optional guided examples, as in the modules (`title`, `question`, `answer`, `state`, `at`) | by hand |
| `data.json` | every number the page shows | np26 `scripts/4N_project_groupN.py` (writes to `COURSE_DIR/projects/groupN/data.json`); never by hand |

`python build.py` writes `site/project-groupN.html` and lists it on `site/projects.html`. Tests
(`python -m pytest -q`) load every project page and every guided example in headless Chrome.

## Charts (`shared/charts.js`, loaded on project pages only)

Every function draws into a host element, redraws on resize and colour-scheme change, shows a tooltip on every mark,
and replaces its drawing when called again on the same host (redraw after a guided example changes the state).
Categorical colours are `--c1..--c7` in fixed order (`color` on a series or point overrides); continuous scales use
viridis; diverging maps use blue (`--c1`) below, grey at the centre and orange (`--c2`) above.

```js
lineChart(host, { x: [1..10], series: [{ name, values, color? }], xLabel: "Day", xName: "Day", yLabel, unit?,
  logY?, zero?, yRange?, marks?: [{ x: 5.5, label: "diet switch" }], bands?: [{ from, to, label }], highlight?: name,
  height? })      // <= 4 series: direct labels at the line ends; more: a legend below
barChart(host, { labels, values } | { labels, groups: [{ name, values }] }, yLabel, unit?, horizontal?, colors?, fmt?, height? })
scatter(host, { points: [{ x, y, label, group?, size?, color?, extra? }], xLabel, yLabel, logX?, logY?, diagonal?,
  labelled?, xRange?, yRange?, height? })
heatmap(host, { rows, cols, values: [[...]] (null = no value), label, diverging?, center?, min?, max?, format?, cell? })
table(host, { columns: [{ key, label, num?, fmt?(value, row) }], rows: [{...}], filter?, sortKey?, sortDesc?, maxRows?,
  sortable? })
chartLegend(host, [{ name, color }])
```

Example (MAG shares over the days, diet switch marked):

```js
lineChart($("g1Line"), { x: DATA.days, series: DATA.mags.map((m) => ({ name: m.name, values: m.share })),
  xLabel: "Day", xName: "Day", yLabel: "Share of the sample's bases (%)", unit: "%", marks: [{ x: 5.5, label: "diet switch" }] });
```

## Rules (from the course CLAUDE.md)

- Only what the analysis or a cited source shows; every number on the page comes from `data.json` (or is computed from
  it in `project.js`), never typed into the text. Numbers in the text: `<span data-n="key"></span>` filled from
  `DATA.numbers`, or written into the text by the np26 script.
- Plain words; units and spaces stated (reads vs bases, per sample vs pooled, percent of a sample's bases, log vs
  linear). One person, ten days: describe, do not generalise.
- Every figure: a numbered title, an interactive chart, a 3-5 line caption saying what it shows and its unit.
- Guided examples: a question, the page state that answers it, a hidden answer; `state` must name only things in
  `data.json`.
- Public repository: only derived data (no reads, no human sequence, no student names).
