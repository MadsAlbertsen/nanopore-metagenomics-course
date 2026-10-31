import json
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build  # noqa: E402


def test_every_page_builds(tmp_path):
    pages = build.build(tmp_path)
    mods = build.read_modules()
    assert {p.name for p in pages} == {"index.html"} | {f"{m['slug']}.html" for m in mods if m["status"] != "planned"}
    for p in pages:
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
