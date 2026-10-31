"""Every built page loads in a headless browser without script errors, and every guided example opens its own setup
(the address #?ex=N shows example N). Skipped when no Chrome or Chromium is installed."""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build  # noqa: E402

MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME = next(
    (p for p in (shutil.which(n) for n in ("google-chrome", "chromium", "chromium-browser", "chrome")) if p),
    MAC_CHROME if os.path.exists(MAC_CHROME) else None,
)
pytestmark = pytest.mark.skipif(CHROME is None, reason="no Chrome or Chromium")

# Installed first in <head>, so errors while the page's own scripts run are caught; reports after the page settled.
PROBE = """<script>
window.__errors = [];
addEventListener("error", (e) => __errors.push(String(e.message)));
addEventListener("unhandledrejection", (e) => __errors.push(String(e.reason)));
setTimeout(() => {
  const h = document.querySelector(".exbody h3");
  const out = { errors: __errors, example: h ? h.textContent : null };
  const json = JSON.stringify(out).replace(/</g, "\\\\u003c");
  document.body.insertAdjacentHTML("beforeend", "<pre id=probe>" + json + "</pre>");
}, 1500);
</script>"""


@pytest.fixture(scope="module")
def site():
    out = Path(tempfile.mkdtemp(prefix="course-site-"))
    build.build(out)
    for page in out.glob("*.html"):
        html = page.read_text()
        page.write_text(html.replace("<head>", "<head>" + PROBE, 1))
    yield out
    shutil.rmtree(out, ignore_errors=True)


def load(page: Path, fragment: str = "") -> dict:
    profile = tempfile.mkdtemp(prefix="chrome-")
    try:
        cmd = [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", f"--user-data-dir={profile}"]
        cmd += ["--window-size=1440,1800", "--virtual-time-budget=5000", "--dump-dom", page.as_uri() + fragment]
        dom = subprocess.run(cmd, capture_output=True, text=True, timeout=120).stdout
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    m = re.search(r'<pre id="probe">(.*?)</pre>', dom, re.S)
    assert m, f"{page.name}{fragment}: the page did not finish loading"
    return json.loads(m.group(1))


def cases() -> list[tuple[str, str, int | None]]:
    out = [("index", "index.html", None), ("glossary", "glossary.html", None)]
    out.append(("teachers", "teachers.html", None))
    for m in build.read_modules():
        if m["status"] == "planned":
            continue
        out.append((m["slug"], f"{m['slug']}.html", None))
        path = m["dir"] / "examples.yaml"
        n = len(build.yaml.safe_load(path.read_text())) if path.exists() else 0
        out += [(f"{m['slug']} example {k}", f"{m['slug']}.html", k) for k in range(1, n + 1)]
    return out


def test_pages_and_examples(site):
    todo = cases()

    def run(case):
        name, page, k = case
        return name, k, load(site / page, f"#?ex={k}" if k else "")

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(run, todo))
    problems = []
    for name, k, r in results:
        if r["errors"]:
            problems.append(f"{name}: script errors {r['errors']}")
        if k and not (r["example"] or "").startswith(f"{k}."):
            problems.append(f"{name}: shows {r['example']!r}")
    assert not problems, "\n".join(problems)
