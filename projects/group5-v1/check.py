"""The key findings in project.yaml are typed text: every number in them must be a value in data.json's numbers
(as the page shows it), so a rerun of the np26 script that changes a number makes the build fail."""

import re
from pathlib import Path

import yaml


def shown(v) -> set[str]:
    """The forms a number takes on the page (as written, without a trailing .0, with thousands separators)."""
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return set()
    out = {str(v), f"{v:,}"}
    if float(v).is_integer():
        out |= {str(int(v)), f"{int(v):,}"}
    return out


def check(data: dict, examples: list[dict]) -> None:
    if examples:
        raise ValueError("report pages have no guided examples (version 2)")
    nums = set().union(*(shown(v) for v in data["numbers"].values()))
    nums |= {str(d) for d in data["days"]}
    p = yaml.safe_load((Path(__file__).parent / "project.yaml").read_text())
    for t in p.get("takeaways", []):
        for n in re.findall(r"(?<![\w.])-?\d+(?:,\d{3})*(?:\.\d+)?", t):
            if n not in nums:
                raise ValueError(f"key finding number {n} is not in data.json: {t}")
