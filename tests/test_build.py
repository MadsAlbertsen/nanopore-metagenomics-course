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
    assert {p.name for p in pages} == {"index.html", "glossary.html", build.ZIP_NAME} | built
    with zipfile.ZipFile(tmp_path / build.ZIP_NAME) as z:
        assert set(z.namelist()) == {"index.html", "glossary.html"} | built
    for p in pages:
        if p.suffix != ".html":
            continue
        html = p.read_text()
        assert "{{" not in html, f"{p.name}: placeholder left"
        assert html.count("<script>") == html.count("</script>"), f"{p.name}: </script> inside data"


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
