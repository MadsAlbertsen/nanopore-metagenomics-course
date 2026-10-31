# nanopore-metagenomics-course

## What this is
Public, interactive course pages (one self-contained HTML file per module) that follow one nanopore metagenomics data
set from raw reads to interpretation. The analysis behind them lives in the private np26 repository (sibling folder
../np26); its scripts write each module's data.json here (np26 scripts/2x_course_<module>.py, COURSE_DIR).

## Rules for the content
- Pages state only what the example analysis or a cited source shows. Every number in a text or an example answer is
  checked on the data, then by an independent check (an agent that did not write it) before it is merged.
- Plain words instead of internal shorthand; units and spaces stated (reads vs bases, per sample vs pooled, log vs
  linear); viridis for continuous colour scales; categorical colours --c1..--c7 in fixed order.
- Guided examples: question, page state and a hidden answer, in the module's examples.yaml; check.py must reject any
  example that names a MAG, view or setting not in data.json.
- Public repository: only derived data (no read files, no human sequence). The data owner has agreed to publication.

## Code
- data.json files are build inputs made by np26; never edit them by hand.
- Shared look and helpers in shared/ (base.css tokens with light and dark mode, common.js); a module adds only what is
  its own. Pages load nothing at run time except Google Fonts.
- Before a PR: python -m pytest -q, ruff check ., ruff format --check ., python build.py, and look at the changed pages
  in headless Chrome (screenshot, light and dark; simulated clicks for interactions).
- Work on a feature branch, open a PR and merge it yourself once CI passes (gh pr merge <n> --merge), then
  git checkout main && git pull.
