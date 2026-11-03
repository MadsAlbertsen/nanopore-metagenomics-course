import json
import re
import sys
import zipfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build  # noqa: E402


def test_every_page_builds(tmp_path):
    pages = build.build(tmp_path)
    mods = build.read_modules()
    built = {f"{m['slug']}.html" for m in mods if m["status"] != "planned"}
    built |= {"projects.html"} | {f"{p['slug']}.html" for p in build.read_projects()}
    built |= {f"{x['slug']}.html" for p in build.read_projects() for x in p.get("pages", [])}
    assert {p.name for p in pages} == {"index.html", "glossary.html", "teachers.html", build.ZIP_NAME} | built
    with zipfile.ZipFile(tmp_path / build.ZIP_NAME) as z:
        assert set(z.namelist()) == {"index.html", "glossary.html", "teachers.html"} | built
    for p in pages:
        if p.suffix != ".html":
            continue
        html = p.read_text()
        assert "{{" not in html, f"{p.name}: placeholder left"
        assert html.count("<script>") == html.count("</script>"), f"{p.name}: </script> inside data"


def test_unpublished_projects_stay_out(tmp_path):
    hidden = {p["slug"] for p in build.read_projects(unpublished=True) if not p.get("publish", True)}
    assert "project-example" in hidden
    names = {p.name for p in build.build(tmp_path)}
    assert not names & {f"{s}.html" for s in hidden}
    assert not any(f'href="{s}.html"' in (tmp_path / "projects.html").read_text() for s in hidden)
    assert {f"{s}.html" for s in hidden} <= {p.name for p in build.build(tmp_path / "all", unpublished=True)} | {
        q.name for q in (tmp_path / "all").glob("*.html")
    }


def test_data_survives_a_script_element(tmp_path):
    value = {"text": "</script><script>alert(1)</script>"}
    js = build.script_json(value)
    assert "</" not in js and json.loads(js) == value


def test_fill_is_one_pass():
    assert build.fill("{{A}} {{B}}", {"A": "{{B}}", "B": "x"}) == "{{B}} x"
    with pytest.raises(ValueError):
        build.fill("{{C}}", {})


def test_modules_are_numbered_once():
    mods = build.read_modules()
    numbers = [m["number"] for m in mods]
    assert numbers == sorted(set(numbers))
    for m in mods:
        assert re.fullmatch(r"[a-z-]+", m["slug"]), m["slug"]
        assert m["dir"].name == f"{m['number']:02d}-{m['slug']}"


def test_overview_glossary_and_closing(tmp_path):
    build.build(tmp_path)
    index = (tmp_path / "index.html").read_text()
    for step in json.loads((build.SHARED / "overview.json").read_text()):
        for fact in step["facts"]:
            assert build.esc(fact) in index
    glossary = (tmp_path / "glossary.html").read_text()
    assert 'id="mag-metagenome-assembled-genome"' in glossary
    for m in build.read_modules():
        if m["status"] != "planned" and m.get("takeaways"):
            assert "Take-home points" in (tmp_path / f"{m['slug']}.html").read_text()
        if m.get("mag_link"):
            assert "{id}" in m["mag_link"]


def test_extra_project_page(tmp_path):
    """A pages entry in project.yaml builds its own page with the report's data and script, and bad entries fail."""
    d = tmp_path / "groupX"
    d.mkdir()
    (d / "data.json").write_text('{"numbers": {"n": 7}}')
    (d / "notes.html").write_text('<section class="panel"><h2>Rationale</h2><p id="x"></p></section>')
    (d / "notes.js").write_text('document.getElementById("x").textContent = DATA.numbers.n;')
    p = {"number": 9, "slug": "project-groupX", "nav": "Group X", "dir": d}
    x = {"slug": "project-groupX-notes", "title": "Rationale", "body": "notes.html", "js": "notes.js"}
    base = {"BASE_CSS": "", "COMMON_JS": "", "MODULES": "[]"}
    html = build.build_project_page(p, x, build.read_modules(), (build.SHARED / "page.html").read_text(), base)
    assert "<h2>Rationale</h2>" in html and "DATA.numbers.n" in html and '{"numbers":{"n":7}}' in html
    assert "<title>Group 9: Rationale</title>" in html and "{{" not in html
    for p in build.read_projects(unpublished=True):
        for x in p.get("pages", []):
            assert (p["dir"] / x["body"]).exists() and (not x.get("js") or (p["dir"] / x["js"]).exists())


def test_extra_pages_are_built_and_zipped(tmp_path):
    names = {q.name for q in build.build(tmp_path)}
    with zipfile.ZipFile(tmp_path / build.ZIP_NAME) as z:
        zipped = set(z.namelist())
    for p in build.read_projects():
        for x in p.get("pages", []):
            assert f"{x['slug']}.html" in names and f"{x['slug']}.html" in zipped
            assert f'href="{x["slug"]}.html"' in (tmp_path / f"{p['slug']}.html").read_text(), "report links its page"
