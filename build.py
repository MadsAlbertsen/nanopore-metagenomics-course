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
Group reports (projects/<id>/project.yaml) may list extra pages that belong to the report, e.g. a methods document:
  pages: [{slug, title, body, js?}]  slug starts with the report's slug plus "-"; body (and the optional js) are file
  names in the report folder; the page gets the report's data.json, project.css and the chart kit, is linked from the
  report (not listed on projects.html) and is built and zipped with it.
Planned modules only appear in the navigation and on the index. Also built: glossary.html (shared/glossary.yaml),
teachers.html (shared/teachers_intro.html plus each module's teacher block: time, before, flow, discussion_points,
pitfalls), the index with the analysis in numbers (shared/overview.json, made by np26 scripts/23_course_overview.py)
and a zip of all pages for offline use. Slide decks (slides/<id>/: project.yaml as for a report, body.html with one
<section class="slide"> per slide and at most MAX_SLIDES of them, optional project.js, data.json, project.css) are
built with shared/slides.html as full-window presentations and listed on presentations.html.
Run: python build.py [out dir]
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
ARTICLES = ROOT / "articles"
SLIDES = ROOT / "slides"
MAX_SLIDES = 10
# The students' reports, articles and presentations stay in the repository (projects/, articles/, slides/; tags
# articles-submitted-2026-11-04 and presentations-2026-11-05) but are not published on the site after the course.
STUDENT_PAGES = False
_show_student = STUDENT_PAGES
PROJECT_KEYS = {"number", "slug", "title", "nav", "question", "status"}
PAGE_KEYS = {"slug", "title", "body"}


def read_modules() -> list[dict]:
    mods = []
    for d in sorted(p for p in (ROOT / "modules").iterdir() if (p / "module.yaml").exists()):
        m = yaml.safe_load((d / "module.yaml").read_text())
        if m.get("status") not in STATUSES:
            raise ValueError(f"{d.name}: status must be one of {sorted(STATUSES)}")
        m["dir"] = d
        mods.append(m)
    return mods


def read_projects(unpublished: bool = False, root: Path = PROJECTS) -> list[dict]:
    """Group project reports: projects/<id>/project.yaml (+ body.html, project.js, data.json, optional project.css,
    examples.yaml). publish: false (the template) builds only when unpublished=True (tests) and is never listed."""
    out = []
    dirs = sorted(p for p in root.iterdir() if (p / "project.yaml").exists()) if root.exists() else []
    for d in dirs:
        p = yaml.safe_load((d / "project.yaml").read_text())
        if missing := PROJECT_KEYS - set(p):
            raise ValueError(f"{d.name}: project.yaml needs {sorted(missing)}")
        if p["status"] not in {"ready", "draft"}:
            raise ValueError(f"{d.name}: status must be ready or draft")
        p["dir"] = d
        for x in p.get("pages", []):
            if missing := PAGE_KEYS - set(x):
                raise ValueError(f"{d.name}: each entry of pages needs {sorted(PAGE_KEYS)}, missing {sorted(missing)}")
            if not x["slug"].startswith(p["slug"] + "-"):
                raise ValueError(f"{d.name}: page slug {x['slug']!r} must start with {p['slug'] + '-'!r}")
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
    for key, label in (("projects", "Projects"), ("articles", "Articles"), ("presentations", "Presentations")):
        if _show_student:
            cur = ' aria-current="page"' if current == key else ""
            items.append(f'<a href="{key}.html"{cur}>{label}</a>')
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


def place_closing(body: str, block: str) -> str:
    """Key findings where the body has <!--KEY-FINDINGS--> (reports: right after the Summary), else at the end."""
    return body.replace("<!--KEY-FINDINGS-->", block, 1) if "<!--KEY-FINDINGS-->" in body else body + block


def project_page(
    p: dict,
    mods: list[dict],
    page: str,
    base: dict,
    title: str,
    body: str,
    js: str,
    nav_title: str,
    examples: list | None = None,
) -> str:
    """A page of a group report: the module page template with the report's data.json and project.css plus the
    shared chart kit (shared/charts.js, charts.css)."""
    d = p["dir"]
    data_path = d / "data.json"
    own_css = (d / "project.css").read_text() if (d / "project.css").exists() else ""
    return fill(
        page,
        {
            **base,
            "TITLE": f"Group {p['number']}: {title}",
            "NAV": nav(mods, p.get("section", "projects")),
            "MODULE_CSS": (SHARED / "charts.css").read_text() + own_css,
            "BODY": body,
            "MODULE_JS": (SHARED / "charts.js").read_text() + "\n" + js,
            "DATA": script_json(json.loads(data_path.read_text()) if data_path.exists() else None),
            "EXAMPLES": script_json(examples or []),
            "FOOTER": footer(nav_title, p.get("data_note", FOOTER)),
        },
    )


def build_project(p: dict, mods: list[dict], page: str, base: dict) -> str:
    """One group report or article (body.html, optional project.js; key findings placed by place_closing; updates.yaml
    as a change log; a frozen earlier version, version_of: N, gets a banner linking the current report)."""
    d = p["dir"]
    data_path = d / "data.json"
    examples = load_examples(p, json.loads(data_path.read_text()) if data_path.exists() else None)
    body = place_closing((d / "body.html").read_text(), closing(p, "Key findings"))
    body = place_updates(body, updates_block(d))
    if "version_of" in p:
        current = f"project-group{p['version_of']}.html"
        body = place_updates(
            body,
            f'<p class="panel note pjversion"><b>{esc(p["version_label"])}</b>. This copy is frozen; the current '
            f'report, after the group\'s own questions, is <a href="{current}">version 2</a>.</p>',
        )
    if "revision_of" in p:
        n = p["revision_of"]
        body = place_updates(
            body,
            f'<p class="panel note pjversion"><b>{esc(p["revision_label"])}</b>. This is not the group\'s text: it was '
            f"written by Claude (an AI model) from the group's "
            f'<a href="article-group{n}.html">submitted article</a>, their project report and the '
            f'<a href="article-group{n}-review.html">peer review</a>, to show one way the work could be taken further. '
            "How it was made is described in the box below the title.</p>",
        )
    js = (d / "project.js").read_text() if (d / "project.js").exists() else ""
    return project_page(p, mods, page, base, p["title"], body, js, p["nav"], examples)


def updates_block(d: Path) -> str:
    """The report's change log (projects/groupN/updates.yaml: a list of {when, what}, newest first) as a box near the
    top of the page, so readers can see what changed since they last looked; empty if the file is missing."""
    f = d / "updates.yaml"
    items = (yaml.safe_load(f.read_text()) or []) if f.exists() else []
    if not items:
        return ""
    for u in items:
        if not {"when", "what"} <= set(u):
            raise ValueError(f"{f}: every update needs 'when' and 'what'")
    rows = "".join(f"<li><b>{esc(str(u['when']))}</b>: {esc(str(u['what']))}</li>" for u in items)
    latest = f"{esc(str(items[0]['when']))}: {esc(str(items[0]['what']))}"
    return (
        f'<details class="panel pjupdates"><summary><b>Updates</b> (latest {latest})</summary><ul>{rows}</ul></details>'
    )


def place_updates(body: str, block: str) -> str:
    """The change log where the body has <!--UPDATES-->, else before the first panel section (right after the intro)."""
    if not block:
        return body
    if "<!--UPDATES-->" in body:
        return body.replace("<!--UPDATES-->", block, 1)
    i = body.find('<section class="panel')
    return body[:i] + block + body[i:] if i >= 0 else block + body


PROJECTS_INTRO = (
    '<section class="intro"><span class="kicker">Group projects</span><h1>Projects: the students\' own questions</h1>'
    "<p>Each group of students asked its own question about the same ten stool samples. The reports below answer them "
    "with the data from this course, as listed in module 8, worked out on the course's analysis computer. Like the "
    "modules, every report is interactive: hover over a chart for its numbers, and open the guided examples. A draft "
    "is still being checked; the groups' feedback can lead to changes and new questions.</p></section>"
)


def build_project_page(p: dict, x: dict, mods: list[dict], page: str, base: dict) -> str:
    """An extra page of a group report (project.yaml pages entry x): its own body and optional script, with the
    report's data.json, project.css and the chart kit."""
    d = p["dir"]
    js = (d / x["js"]).read_text() if x.get("js") else ""
    return project_page(p, mods, page, base, x["title"], (d / x["body"]).read_text(), js, f"{p['nav']}: {x['title']}")


def build_projects_index(projs: list[dict], mods: list[dict], page: str, base: dict) -> str:
    """One card per group report; frozen earlier versions (version_of: N) are linked from their group's card."""
    old = {}
    for p in projs:
        if "version_of" in p:
            old.setdefault(p["version_of"], []).append(p)
    cards = []
    for p in projs:
        if "version_of" in p:
            continue
        status = " · draft" if p["status"] == "draft" else ""
        versions = ""
        if p["number"] in old:
            links = " · ".join(f'<a href="{v["slug"]}.html">{esc(v["version_label"])}</a>' for v in old[p["number"]])
            versions = f'<p class="note">Version 2 (current): the title above. Earlier: {links}</p>'
        cards.append(
            f'<li class="panel"><span class="kicker">Group {p["number"]}{status}</span>'
            f'<h3><a href="{p["slug"]}.html">{esc(p["title"])}</a></h3><p>{esc(p["question"])}</p>{versions}</li>'
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


ARTICLES_INTRO = (
    '<section class="intro"><span class="kicker">Articles</span><h1>Articles: the group reports as ISME Journal '
    "articles</h1><p>Each group turns its project report into a short research article in the format of The ISME "
    "Journal. The group chooses the angle from its own analysis; the reports under Projects hold the analyses and "
    "figures the articles draw on. Each submitted article has a peer review page. Revision 1 under each group is a "
    "rewrite by Claude (an AI model) after the review, clearly marked as such, to show one way the work could be "
    "taken further.</p></section>"
)


def article_title(a: dict) -> str:
    """The title the group sees on the article page: its <h1> (italics kept), else the title in project.yaml."""
    m = re.search(r"<h1>(.*?)</h1>", (a["dir"] / "body.html").read_text(), re.S)
    if not m:
        return esc(a["title"])
    parts = re.split(r"(</?i>)", m.group(1))
    return "".join(x if x in ("<i>", "</i>") else esc(re.sub(r"<[^>]+>", "", x)) for x in parts).strip()


def build_articles_index(arts: list[dict], mods: list[dict], page: str, base: dict) -> str:
    revs: dict[int, list[dict]] = {}
    for a in arts:
        if "revision_of" in a:
            revs.setdefault(a["revision_of"], []).append(a)
    cards = []
    for a in arts:
        if "revision_of" in a:
            continue
        extra = "".join(
            f'<p class="fact">{esc(r["revision_label"])}: <a href="{r["slug"]}.html">{article_title(r)}</a></p>'
            for r in revs.get(a["number"], [])
        )
        review = a["dir"] / "review.html"
        if review.exists():
            extra = (
                f'<p class="fact"><a href="{a["slug"]}-review.html">Peer review and editorial decision</a></p>' + extra
            )
        cards.append(
            f'<li class="panel"><span class="kicker">Group {a["number"]}</span>'
            f'<h3><a href="{a["slug"]}.html">{article_title(a)}</a></h3><p>{esc(a["question"])}</p>{extra}</li>'
        )
    return fill(
        page,
        {
            **base,
            "TITLE": "Articles: nanopore metagenomics course",
            "NAV": nav(mods, "articles"),
            "MODULE_CSS": (ROOT / "shared" / "index.css").read_text(),
            "BODY": ARTICLES_INTRO + f'<ol class="modules">{"".join(cards)}</ol>',
            "MODULE_JS": "",
            "DATA": "null",
            "EXAMPLES": "[]",
            "FOOTER": footer("Articles"),
        },
    )


def build_deck(p: dict, base: dict) -> str:
    """A group's slide deck: body.html holds one <section class="slide"> per slide (at most MAX_SLIDES), drawn on a
    960 x 540 stage scaled to the window, with the chart kit, the deck's data.json and the navigation of slides.js."""
    d = p["dir"]
    body = (d / "body.html").read_text()
    n = len(re.findall(r'<section class="slide[ "]', body))
    if not 1 <= n <= MAX_SLIDES:
        raise ValueError(f"{d.name}: a deck has 1 to {MAX_SLIDES} slides, found {n}")
    data_path = d / "data.json"
    own_css = (d / "project.css").read_text() if (d / "project.css").exists() else ""
    js = (d / "project.js").read_text() if (d / "project.js").exists() else ""
    return fill(
        (SHARED / "slides.html").read_text(),
        {
            **base,
            "TITLE": f"Group {p['number']}: {p['title']}",
            "DECK_TITLE": f"Group {p['number']} · {esc(p['title'])}",
            "MODULE_CSS": (SHARED / "charts.css").read_text() + (SHARED / "slides.css").read_text() + own_css,
            "BODY": body,
            "MODULE_JS": (SHARED / "charts.js").read_text() + "\n" + js,
            "SLIDES_JS": (SHARED / "slides.js").read_text(),
            "DATA": script_json(json.loads(data_path.read_text()) if data_path.exists() else None),
            "DECK": script_json({"label": f"Group {p['number']}", "slides": n}),
            "FOOTER": footer(p["nav"], p.get("data_note", FOOTER)),
        },
    )


PRESENTATIONS_INTRO = (
    '<section class="intro"><span class="kicker">Presentations</span><h1>Presentations: each group\'s story in at '
    f"most {MAX_SLIDES} slides</h1><p>Each group presents its project as a short slide deck, built from its own "
    "analysis and the figures in its report and article. Open a deck to present it: the arrow keys or the buttons move "
    "between slides, O shows all slides at once, N the speaker notes and F full screen. The charts keep their "
    "tooltips on the slides.</p></section>"
)


def build_presentations_index(decks: list[dict], mods: list[dict], page: str, base: dict) -> str:
    """One card per deck with a live thumbnail of its first slide."""
    cards = [
        f'<li class="panel deckcard"><a class="thumb" href="{p["slug"]}.html" aria-label="Open the presentation">'
        f'<iframe src="{p["slug"]}.html?thumb" loading="lazy" tabindex="-1" title="First slide"></iframe></a>'
        f'<span class="kicker">Group {p["number"]}{" · draft" if p["status"] == "draft" else ""}</span>'
        f'<h3><a href="{p["slug"]}.html">{esc(p["title"])}</a></h3><p>{esc(p["question"])}</p></li>'
        for p in decks
    ]
    listing = (
        f'<ol class="modules">{"".join(cards)}</ol>'
        if cards
        else '<p class="panel note">The presentations will appear here once the groups have made them.</p>'
    )
    css = (
        ".deckcard .thumb { display: block; aspect-ratio: 16 / 9; border: 1px solid var(--line); border-radius: 6px; "
        "overflow: hidden; position: relative }\n.deckcard iframe { position: absolute; inset: 0; width: 100%; "
        "height: 100%; border: 0; pointer-events: none }\n"
    )
    return fill(
        page,
        {
            **base,
            "TITLE": "Presentations: nanopore metagenomics course",
            "NAV": nav(mods, "presentations"),
            "MODULE_CSS": (ROOT / "shared" / "index.css").read_text() + css,
            "BODY": PRESENTATIONS_INTRO + listing,
            "MODULE_JS": "",
            "DATA": "null",
            "EXAMPLES": "[]",
            "FOOTER": footer("Presentations"),
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


def build(out: Path, unpublished: bool = False, student_pages: bool | None = None) -> list[Path]:
    """Write the site; unpublished=True also builds projects marked publish: false (for the tests). The student pages
    (projects, articles, presentations) are built only with student_pages=True (default STUDENT_PAGES)."""
    global _show_student
    _show_student = STUDENT_PAGES if student_pages is None else student_pages
    mods = read_modules()
    projs = read_projects(unpublished) if _show_student else []
    arts = read_projects(unpublished, ARTICLES) if _show_student else []
    for a in arts:
        a["section"] = "articles"
    decks = read_projects(unpublished, SLIDES) if _show_student else []
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
    if _show_student:
        written.append(out / "projects.html")
        written[-1].write_text(build_projects_index([p for p in projs if p.get("publish", True)], mods, page, base))
        written.append(out / "articles.html")
        written[-1].write_text(build_articles_index([a for a in arts if a.get("publish", True)], mods, page, base))
        written.append(out / "presentations.html")
        shown = [p for p in decks if p.get("publish", True)]
        written[-1].write_text(build_presentations_index(shown, mods, page, base))
    for p in decks:
        path = out / f"{p['slug']}.html"
        path.write_text(build_deck(p, base))
        if p.get("publish", True):
            written.append(path)
    for p in projs + arts:
        path = out / f"{p['slug']}.html"
        path.write_text(build_project(p, mods, page, base))
        if p.get("publish", True):
            written.append(path)
        for x in p.get("pages", []):
            extra = out / f"{x['slug']}.html"
            extra.write_text(build_project_page(p, x, mods, page, base))
            if p.get("publish", True):
                written.append(extra)
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
