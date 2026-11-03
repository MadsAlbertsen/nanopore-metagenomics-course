"""Build the course site: one self-contained HTML page per module plus an index, in site/.

Each module is a folder modules/<nn>-<slug>/ with
  module.yaml   number, slug, title, nav (short name), summary, status (ready, draft or planned); optional
                takeaways (list) and discussion (one open question), shown at the end of the page, mag_link
                (address part that opens a MAG on this page, e.g. "#?mag={id}") for links between modules, and
                data_note (the page's data note in the footer, for a module that uses other data than FOOTER's)
  body.html     the page body (markup only)
  module.js     the page's script (uses shared/common.js; DATA and EXAMPLES are set before it runs)
  module.css    optional extra styles
  data.json     optional data, made by the example analysis (see the module's README)
  examples.yaml optional guided examples: [{title, question, answer, state, at}]; at = name of a slot in
                body.html, <div class="exslot" data-at="name"></div>, placed under the figure the example uses
  check.py      optional check(data, examples): raises ValueError if an example names something not in the data
Planned modules only appear in the navigation and on the index. Also built: glossary.html (shared/glossary.yaml),
teachers.html (shared/teachers_intro.html plus each module's teacher block: time, before, flow, discussion_points,
pitfalls), the index with the analysis in numbers (shared/overview.json, made by np26 scripts/23_course_overview.py)
and a zip of all pages for offline use. Run: python build.py [out dir]
"""

import importlib.util
import json
import re
import sys
import urllib.parse
import zipfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent
SHARED = ROOT / "shared"
STATUSES = {"ready", "draft", "planned"}
EXAMPLE_KEYS = {"title", "question", "answer", "state"}
ZIP_NAME = "nanopore-metagenomics-course.zip"
PROJECTS = ROOT / "projects"
PROJECT_KEYS = {"number", "slug", "title", "nav", "question", "status"}


def read_modules() -> list[dict]:
    mods = []
    for d in sorted(p for p in (ROOT / "modules").iterdir() if (p / "module.yaml").exists()):
        m = yaml.safe_load((d / "module.yaml").read_text())
        if m.get("status") not in STATUSES:
            raise ValueError(f"{d.name}: status must be one of {sorted(STATUSES)}")
        m["dir"] = d
        mods.append(m)
    return mods


def read_projects(unpublished: bool = False) -> list[dict]:
    """Group project reports: projects/<id>/project.yaml (+ body.html, project.js, data.json, optional project.css,
    examples.yaml). publish: false (the template) builds only when unpublished=True (tests) and is never listed."""
    out = []
    dirs = sorted(p for p in PROJECTS.iterdir() if (p / "project.yaml").exists()) if PROJECTS.exists() else []
    for d in dirs:
        p = yaml.safe_load((d / "project.yaml").read_text())
        if missing := PROJECT_KEYS - set(p):
            raise ValueError(f"{d.name}: project.yaml needs {sorted(missing)}")
        if p["status"] not in {"ready", "draft"}:
            raise ValueError(f"{d.name}: status must be ready or draft")
        p["dir"] = d
        if p.get("publish", True) or unpublished:
            out.append(p)
    return sorted(out, key=lambda p: (p["number"], p["slug"]))


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
    cur = ' aria-current="page"' if current == "projects" else ""
    items.append(f'<a href="projects.html"{cur}>Projects</a>')
    cur = ' aria-current="page"' if current == "glossary" else ""
    items.append(f'<a class="gloss" href="glossary.html"{cur}>Glossary</a>')
    cur = ' aria-current="page"' if current == "teachers" else ""
    items.append(f'<a href="teachers.html"{cur}>For teachers</a>')
    return "".join(items)


def load_examples(m: dict, data) -> list:
    path = m["dir"] / "examples.yaml"
    examples = yaml.safe_load(path.read_text()) if path.exists() else []
    for ex in examples:
        if set(ex) - {"at"} != EXAMPLE_KEYS:
            raise ValueError(f"{path}: '{ex.get('title')}' needs exactly {sorted(EXAMPLE_KEYS)} (and optionally 'at')")
        if "at" in ex and f'data-at="{ex["at"]}"' not in (m["dir"] / "body.html").read_text():
            raise ValueError(f"{path}: '{ex['title']}' is placed at slot '{ex['at']}', which is not in body.html")
    check = m["dir"] / "check.py"
    if check.exists():
        spec = importlib.util.spec_from_file_location(f"check_{m['slug']}", check)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.check(data, examples)
    return examples


FOOTER = (
    "Data: ten daily stool samples from one person, sequenced on one PromethION flow cell (Oxford Nanopore, "
    "Rapid Barcoding Kit, R10.4.1), analysed with mmlong2. Every number about the data comes from that analysis; "
    "simulations and quoted sources are marked as such."
)


def closing(m: dict, heading: str = "Take-home points") -> str:
    """Take-home points (project reports: key findings) and an open question for discussion, at the end of a page."""
    parts = []
    if m.get("takeaways"):
        items = "".join(f"<li>{esc(t)}</li>" for t in m["takeaways"])
        parts.append(f"<div><h2>{heading}</h2><ul>{items}</ul></div>")
    if m.get("discussion"):
        parts.append(f"<div><h2>To discuss</h2><p>{esc(m['discussion'])}</p></div>")
    return f'<section class="panel closing">{"".join(parts)}</section>' if parts else ""


def modules_json(mods: list[dict]) -> str:
    """The built modules, for links between pages (shared/common.js magLinks)."""
    keys = ("number", "slug", "nav", "mag_link")
    return script_json([{k: m.get(k) for k in keys} for m in mods if m["status"] != "planned"])


ISSUES = "https://github.com/MadsAlbertsen/nanopore-metagenomics-course/issues/new"


def footer(title: str, note: str = FOOTER) -> str:
    """The data note plus a link that opens a GitHub issue about this page."""
    q = urllib.parse.urlencode({"title": f"[{title}] ", "body": f"Page: {title}\n\nWhat I noticed or suggest:\n"})
    licence = (
        'Text and data: <a href="https://creativecommons.org/licenses/by/4.0/" rel="license">CC BY 4.0</a>; code: MIT.'
    )
    report = f'<a href="{ISSUES}?{esc(q)}" target="_blank" rel="noopener">Report a problem or suggestion</a>'
    return f"{esc(note)} {licence} {report}"


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
            "BODY": (d / "body.html").read_text() + closing(m),
            "MODULE_JS": (d / "module.js").read_text(),
            "DATA": script_json(data),
            "EXAMPLES": script_json(examples),
            "FOOTER": footer(m["nav"], m.get("data_note", FOOTER)),
        },
    )


def build_project(p: dict, mods: list[dict], page: str, base: dict) -> str:
    """One group report: the module page template plus the shared chart kit (shared/charts.js, charts.css)."""
    d = p["dir"]
    data_path = d / "data.json"
    data = json.loads(data_path.read_text()) if data_path.exists() else None
    examples = load_examples(p, data)
    own_css = (d / "project.css").read_text() if (d / "project.css").exists() else ""
    return fill(
        page,
        {
            **base,
            "TITLE": f"Group {p['number']}: {p['title']}",
            "NAV": nav(mods, "projects"),
            "MODULE_CSS": (SHARED / "charts.css").read_text() + own_css,
            "BODY": (d / "body.html").read_text() + closing(p, "Key findings"),
            "MODULE_JS": (SHARED / "charts.js").read_text() + "\n" + (d / "project.js").read_text(),
            "DATA": script_json(data),
            "EXAMPLES": script_json(examples),
            "FOOTER": footer(p["nav"], p.get("data_note", FOOTER)),
        },
    )


PROJECTS_INTRO = (
    '<section class="intro"><span class="kicker">Group projects</span><h1>Projects: the students\' own questions</h1>'
    "<p>Each group of students asked its own question about the same ten stool samples. The reports below answer them "
    "with the data from this course, as listed in module 8, worked out on the course's analysis computer. Like the "
    "modules, every report is interactive: hover over a chart for its numbers, and open the guided examples. A draft "
    "is still being checked; the groups' feedback can lead to changes and new questions.</p></section>"
)


def build_projects_index(projs: list[dict], mods: list[dict], page: str, base: dict) -> str:
    cards = []
    for p in projs:
        status = " · draft" if p["status"] == "draft" else ""
        cards.append(
            f'<li class="panel"><span class="kicker">Group {p["number"]}{status}</span>'
            f'<h3><a href="{p["slug"]}.html">{esc(p["title"])}</a></h3><p>{esc(p["question"])}</p></li>'
        )
    listing = (
        f'<ol class="modules">{"".join(cards)}</ol>'
        if cards
        else '<p class="panel note">The group reports will appear here once they are written.</p>'
    )
    return fill(
        page,
        {
            **base,
            "TITLE": "Projects: nanopore metagenomics course",
            "NAV": nav(mods, "projects"),
            "MODULE_CSS": (ROOT / "shared" / "index.css").read_text(),
            "BODY": PROJECTS_INTRO + listing,
            "MODULE_JS": "",
            "DATA": "null",
            "EXAMPLES": "[]",
            "FOOTER": footer("Projects"),
        },
    )


def build_index(mods: list[dict], page: str, base: dict) -> str:
    overview = {o["module"]: o["facts"] for o in json.loads((SHARED / "overview.json").read_text())}
    cards = []
    for m in mods:
        status = {"ready": "", "draft": " · draft", "planned": " · in preparation"}[m["status"]]
        title = esc(m["title"]) if m["status"] == "planned" else f'<a href="{m["slug"]}.html">{esc(m["title"])}</a>'
        cards.append(
            f'<li class="panel"><span class="kicker">Module {m["number"]}{status}</span><h3>{title}</h3>'
            f"<p>{esc(m['summary'])}</p>"
            + "".join(f'<p class="fact">{esc(f)}</p>' for f in overview.get(m["slug"], []))
            + "</li>"
        )
    body = (SHARED / "index_body.html").read_text().replace("<!--MODULES-->", "".join(cards))
    body = body.replace("<!--ZIP-->", ZIP_NAME)
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
            "FOOTER": footer("Front page"),
        },
    )


def build_glossary(mods: list[dict], page: str, base: dict) -> str:
    terms = sorted(yaml.safe_load((SHARED / "glossary.yaml").read_text()), key=lambda t: t["term"].lower())
    slugs = {m["slug"]: m for m in mods if m["status"] != "planned"}
    rows = []
    for t in terms:
        anchor = re.sub(r"[^a-z0-9]+", "-", t["term"].lower()).strip("-")
        see = [f'<a href="{s}.html">{esc(slugs[s]["nav"])}</a>' for s in t.get("modules", []) if s in slugs]
        more = f' <span class="muted">Module: {", ".join(see)}</span>' if see else ""
        rows.append(f'<dt id="{anchor}">{esc(t["term"])}</dt><dd>{esc(t["text"])}{more}</dd>')
    body = (
        '<section class="intro"><span class="kicker">Course material</span><h1>Glossary</h1>'
        "<p>The words used across the modules, in plain terms.</p></section>"
        f'<dl class="panel glossary">{"".join(rows)}</dl>'
    )
    return fill(
        page,
        {
            **base,
            "TITLE": "Glossary: nanopore metagenomics course",
            "NAV": nav(mods, "glossary"),
            "MODULE_CSS": "",
            "BODY": body,
            "MODULE_JS": "",
            "DATA": "null",
            "EXAMPLES": "[]",
            "FOOTER": footer("Glossary"),
        },
    )


def build_teachers(mods: list[dict], page: str, base: dict) -> str:
    """Teacher notes: shared/teachers_intro.html plus the teacher block of each built module's module.yaml."""
    parts = [(SHARED / "teachers_intro.html").read_text()]
    for m in mods:
        t = m.get("teacher")
        if m["status"] == "planned" or not t:
            continue
        lists = "".join(
            f"<h3>{head}</h3><ul>{''.join(f'<li>{esc(x)}</li>' for x in t[key])}</ul>"
            for key, head in (
                ("flow", "A possible session"),
                ("discussion_points", "Points for the discussion question"),
                ("pitfalls", "Watch for"),
            )
        )
        parts.append(
            f'<section class="panel teach" id="{m["slug"]}"><span class="kicker">Module {m["number"]}</span>'
            f'<h2><a href="{m["slug"]}.html">{esc(m["title"])}</a></h2>'
            f"<p><b>Time:</b> {esc(t['time'])} <b>Before:</b> {esc(t['before'])}</p>"
            f"<p><b>Discussion question:</b> {esc(m.get('discussion', ''))}</p>{lists}</section>"
        )
    return fill(
        page,
        {
            **base,
            "TITLE": "For teachers: nanopore metagenomics course",
            "NAV": nav(mods, "teachers"),
            "MODULE_CSS": "",
            "BODY": "".join(parts),
            "MODULE_JS": "",
            "DATA": "null",
            "EXAMPLES": "[]",
            "FOOTER": footer("For teachers"),
        },
    )


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def build(out: Path, unpublished: bool = False) -> list[Path]:
    """Write the site; unpublished=True also builds projects marked publish: false (for the tests)."""
    mods = read_modules()
    projs = read_projects(unpublished)
    page = (SHARED / "page.html").read_text()
    base = {
        "BASE_CSS": (SHARED / "base.css").read_text(),
        "COMMON_JS": (SHARED / "common.js").read_text(),
        "MODULES": modules_json(mods),
    }
    out.mkdir(parents=True, exist_ok=True)
    written = [out / "index.html", out / "glossary.html", out / "teachers.html"]
    written[0].write_text(build_index(mods, page, base))
    written[1].write_text(build_glossary(mods, page, base))
    written[2].write_text(build_teachers(mods, page, base))
    written.append(out / "projects.html")
    written[-1].write_text(build_projects_index([p for p in projs if p.get("publish", True)], mods, page, base))
    for p in projs:
        path = out / f"{p['slug']}.html"
        path.write_text(build_project(p, mods, page, base))
        if p.get("publish", True):
            written.append(path)
    for m in mods:
        if m["status"] == "planned":
            continue
        path = out / f"{m['slug']}.html"
        path.write_text(build_module(m, mods, page, base))
        written.append(path)
    with zipfile.ZipFile(out / ZIP_NAME, "w", zipfile.ZIP_DEFLATED) as z:
        for p in written:
            z.write(p, p.name)
    return [*written, out / ZIP_NAME]


if __name__ == "__main__":
    for p in build(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "site"):
        print(f"{p} ({p.stat().st_size / 1e6:.1f} MB)")
