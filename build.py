"""Build the course site: one self-contained HTML page per module plus an index, in site/.

Each module is a folder modules/<nn>-<slug>/ with
  module.yaml   number, slug, title, nav (short name), summary, status (ready, draft or planned)
  body.html     the page body (markup only)
  module.js     the page's script (uses shared/common.js; DATA and EXAMPLES are set before it runs)
  module.css    optional extra styles
  data.json     optional data, made by the example analysis (see the module's README)
  examples.yaml optional guided examples: [{title, question, answer, state}]
  check.py      optional check(data, examples): raises ValueError if an example names something not in the data
Planned modules only appear in the navigation and on the index. Run: python build.py [out dir]
"""

import importlib.util
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent
SHARED = ROOT / "shared"
STATUSES = {"ready", "draft", "planned"}
EXAMPLE_KEYS = {"title", "question", "answer", "state"}


def read_modules() -> list[dict]:
    mods = []
    for d in sorted(p for p in (ROOT / "modules").iterdir() if (p / "module.yaml").exists()):
        m = yaml.safe_load((d / "module.yaml").read_text())
        if m.get("status") not in STATUSES:
            raise ValueError(f"{d.name}: status must be one of {sorted(STATUSES)}")
        m["dir"] = d
        mods.append(m)
    return mods


def script_json(value) -> str:
    """JSON safe inside a <script> element."""
    return json.dumps(value, separators=(",", ":"), allow_nan=False).replace("</", "<\\/")


def fill(template: str, values: dict[str, str]) -> str:
    """Replace {{KEY}} placeholders in one pass (values are not searched again)."""
    missing = set(re.findall(r"\{\{([A-Z_]+)\}\}", template)) - set(values)
    if missing:
        raise ValueError(f"no value for {sorted(missing)}")
    return re.sub(r"\{\{([A-Z_]+)\}\}", lambda m: values[m.group(1)], template)


def nav(mods: list[dict], current: str | None) -> str:
    items = ['<a class="home" href="index.html"' + (' aria-current="page"' if current is None else "") + ">Course</a>"]
    for m in mods:
        label = f"{m['number']}. {m['nav']}"
        if m["status"] == "planned":
            items.append(f'<span class="planned" title="In preparation">{label}</span>')
        else:
            cur = ' aria-current="page"' if m["slug"] == current else ""
            items.append(f'<a href="{m["slug"]}.html"{cur}>{label}</a>')
    return "".join(items)


def load_examples(m: dict, data) -> list:
    path = m["dir"] / "examples.yaml"
    examples = yaml.safe_load(path.read_text()) if path.exists() else []
    for ex in examples:
        if set(ex) != EXAMPLE_KEYS:
            raise ValueError(f"{path}: '{ex.get('title')}' needs exactly {sorted(EXAMPLE_KEYS)}")
    check = m["dir"] / "check.py"
    if check.exists():
        spec = importlib.util.spec_from_file_location(f"check_{m['slug']}", check)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.check(data, examples)
    return examples


FOOTER = (
    "Data: ten daily stool samples from one person, sequenced on one PromethION flow cell (Oxford Nanopore, "
    "Rapid Barcoding Kit, R10.4.1), analysed with mmlong2. Every number on these pages comes from that analysis."
)


def build_module(m: dict, mods: list[dict], page: str, base: dict) -> str:
    d = m["dir"]
    data_path = d / "data.json"
    data = json.loads(data_path.read_text()) if data_path.exists() else None
    examples = load_examples(m, data)
    return fill(
        page,
        {
            **base,
            "TITLE": m["title"],
            "NAV": nav(mods, m["slug"]),
            "MODULE_CSS": (d / "module.css").read_text() if (d / "module.css").exists() else "",
            "BODY": (d / "body.html").read_text(),
            "MODULE_JS": (d / "module.js").read_text(),
            "DATA": script_json(data),
            "EXAMPLES": script_json(examples),
            "FOOTER": FOOTER,
        },
    )


def build_index(mods: list[dict], page: str, base: dict) -> str:
    cards = []
    for m in mods:
        status = {"ready": "", "draft": " · draft", "planned": " · in preparation"}[m["status"]]
        title = esc(m["title"]) if m["status"] == "planned" else f'<a href="{m["slug"]}.html">{esc(m["title"])}</a>'
        cards.append(
            f'<li class="panel"><span class="kicker">Module {m["number"]}{status}</span><h3>{title}</h3>'
            f"<p>{esc(m['summary'])}</p></li>"
        )
    body = (ROOT / "shared" / "index_body.html").read_text().replace("<!--MODULES-->", "".join(cards))
    return fill(
        page,
        {
            **base,
            "TITLE": "Nanopore metagenomics: from reads to genomes",
            "NAV": nav(mods, None),
            "MODULE_CSS": (ROOT / "shared" / "index.css").read_text(),
            "BODY": body,
            "MODULE_JS": "",
            "DATA": "null",
            "EXAMPLES": "[]",
            "FOOTER": FOOTER,
        },
    )


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def build(out: Path) -> list[Path]:
    mods = read_modules()
    page = (SHARED / "page.html").read_text()
    base = {"BASE_CSS": (SHARED / "base.css").read_text(), "COMMON_JS": (SHARED / "common.js").read_text()}
    out.mkdir(parents=True, exist_ok=True)
    written = [out / "index.html"]
    written[0].write_text(build_index(mods, page, base))
    for m in mods:
        if m["status"] == "planned":
            continue
        path = out / f"{m['slug']}.html"
        path.write_text(build_module(m, mods, page, base))
        written.append(path)
    return written


if __name__ == "__main__":
    for p in build(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "site"):
        print(f"{p} ({p.stat().st_size / 1e6:.1f} MB)")
