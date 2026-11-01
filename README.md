# Nanopore metagenomics: from reads to genomes

Interactive course pages that follow one long-read metagenomics data set from raw reads to interpretation. Each
module explains one step with the real data and ends with guided examples: a question, the page set up to answer it,
and an answer to open when ready. Every page is one self-contained HTML file that runs in the browser.

| Module | Status |
|---|---|
| 1. Raw reads: what they look like, and why we filter and split them | draft |
| 2. Assembly: from overlapping reads to contigs | draft |
| 3. Binning: sorting contigs into genomes | ready |
| 4. MAG quality: how complete, how clean | draft |
| 5. Methylation: misassemblies, contamination and placing contigs | draft |
| 6. Annotation: what is in a genome, and how sure are we | draft |
| 7. Interpretation: what changes over ten days | draft |

## The data

Ten daily stool samples from one person (days 1-5 on a high-carbohydrate, high-calorie diet, days 6-10 on a
low-carbohydrate, low-calorie diet),
sequenced together on one PromethION flow cell (Oxford Nanopore, Rapid Barcoding Kit SQK-RBK114-24, R10.4.1),
assembled with myloasm and binned with mmlong2. The pages hold only derived data (statistics, contig features,
MAG summaries); no read files.

## Build

```
pip install pyyaml
python build.py            # writes site/index.html and one page per module
python -m pytest -q        # build checks; with Chrome installed also loads every page and example
```

Open `site/index.html` in a browser, or a module page directly. A page's state is kept in its address
(`binning.html#?ex=2`), so a link opens the same view.

## Offline copy

`python build.py` also writes `site/nanopore-metagenomics-course.zip` (all pages; open `index.html`); the live site
links it from the front page. For a fixed copy for one course, publish a GitHub release: the zip is attached to it.

## Layout

- `modules/<nn>-<slug>/`: one folder per module: `module.yaml` (title, status), `body.html`, `module.js`,
  optional `module.css`, `data.json` (made by the example analysis), `examples.yaml` (guided examples) and
  `check.py` (rejects examples that name something not in the data).
- `shared/`: page skeleton, styles and helpers used by every module; `glossary.yaml` (the glossary page);
  `overview.json` (the numbers on the front page, made by np26 scripts/23_course_overview.py).
- `module.yaml` may also hold `takeaways`, `discussion` and `mag_link` (opens a MAG, so other modules can link to it).
- `build.py`: puts each page together; `tests/`: build checks.

## Licence

- Text, figures, examples and data (`modules/*/body.html`, `*.yaml`, `data.json`, `shared/glossary.yaml`,
  `shared/overview.json`, the built pages): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
  (`LICENSE-CONTENT`). Reuse and adapt freely, including commercially, with credit: "Mads Albertsen,
  Nanopore metagenomics: from reads to genomes, https://github.com/MadsAlbertsen/nanopore-metagenomics-course".
- Code (`build.py`, `shared/*.js`, `modules/*/module.js`, `check.py`, `tests/`): MIT (`LICENSE`).
- Cited papers and tools keep their own licences; quotes are marked and referenced on the pages.
