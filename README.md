# Nanopore metagenomics: from reads to genomes

Interactive course pages that follow one long-read metagenomics data set from raw reads to interpretation. Each
module explains one step with the real data and ends with guided examples: a question, the page set up to answer it,
and an answer to open when ready. Every page is one self-contained HTML file that runs in the browser.

| Module | Status |
|---|---|
| 1. Raw reads: what they look like, and why we filter and split them | in preparation |
| 2. Assembly: from overlapping reads to contigs | in preparation |
| 3. Binning: sorting contigs into genomes | ready |
| 4. MAG quality: how complete, how clean | in preparation |
| 5. Annotation: what is in a genome, and how sure are we | in preparation |
| 6. Interpretation: what changes over ten days | draft |

## The data

Ten daily stool samples from one person (days 1-5 on a high-carbohydrate, days 6-10 on a low-carbohydrate diet),
sequenced together on one PromethION flow cell (Oxford Nanopore, Rapid Barcoding Kit SQK-RBK114-24, R10.4.1),
assembled with myloasm and binned with mmlong2. The pages hold only derived data (statistics, contig features,
MAG summaries); no read files.

## Build

```
pip install pyyaml
python build.py            # writes site/index.html and one page per module
python -m pytest -q        # build checks
```

Open `site/index.html` in a browser, or a module page directly. A page's state is kept in its address
(`binning.html#?ex=2`), so a link opens the same view.

## Layout

- `modules/<nn>-<slug>/`: one folder per module: `module.yaml` (title, status), `body.html`, `module.js`,
  optional `module.css`, `data.json` (made by the example analysis), `examples.yaml` (guided examples) and
  `check.py` (rejects examples that name something not in the data).
- `shared/`: page skeleton, styles and helpers used by every module.
- `build.py`: puts each page together; `tests/`: build checks.
