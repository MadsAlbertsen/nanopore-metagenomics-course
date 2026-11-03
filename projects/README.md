# Group project reports

One folder per group report: `projects/groupN/`. Copy `projects/example/` (the template, `publish: false`) and keep
its sections and their order.

## Report structure (version 2, 2026-11-03: research reports, not exercises)

A group's own requested structure or outputs (from its draft) take precedence over this default (version 3,
2026-11-03); keep the content standards below. An extra page per report (e.g. a separate methods document) is a
`pages:` list in project.yaml (`slug`, `title`, `body`, optional `js`); it gets the report's data.json, CSS and
chart kit, and is built and zipped but not listed on projects.html.

The reports read like short research reports that the groups build on, not like course pages with questions for the
reader. Sections, in this order (`<section class="panel">` each; figures as before):

1. **Summary**: 6-10 lines: question, approach, the main results with their numbers, the main interpretation.
2. **Background**: why the question matters and what is known, with 3-6 references (verified to exist; each used for
   a stated point). Includes the study design and the diet facts from the data owner.
3. **Question and hypotheses**: the group's question as this report answers it, and the expected results.
4. **Data and methods**: data, definitions (units), every analysis step and check, the tools with versions and
   citations.
5. **Results**: per figure: a short lead-in of what was done, the figure with its caption, then a paragraph of
   **interpretation** (what the result likely means, alternative explanations, how it fits the literature; mark
   interpretation as such: "this suggests", "one explanation is").
6. **Discussion**: the results together against the hypotheses and the literature; what is solid, what is uncertain
   and why (one person, ten days, gene potential vs activity, shares vs cell counts, binned fraction).
7. **Limitations**: a short list.
8. **Open questions and possible next analyses**: concrete angles the group could follow up, each with the data it
   would need (on the Mac, a server job, or not measured).
9. **References**: numbered list, with DOI or PMID.

`takeaways` in project.yaml are shown as "Key findings" (3-5 results with numbers) where body.html has
`<!--KEY-FINDINGS-->` (put it right after the Summary section), else at the end of the page. No `discussion` key, no
guided examples (no examples.yaml) on report pages.

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
- No guided examples on report pages (version 2); interactive controls on the figures stay.
- Public repository: only derived data (no reads, no human sequence, no student names).
