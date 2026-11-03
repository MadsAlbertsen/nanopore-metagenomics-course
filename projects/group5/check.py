"""Every example's state must name things in data.json, and every {key} in a question or answer must be a key of
data.json's numbers (project.js fills them in)."""

import re

KEYS = {"highlight", "log", "color", "q", "group", "unit"}


def check(data: dict, examples: list[dict]) -> None:
    mags = {m["id"] for m in data["mags"]}
    nums = set(data["numbers"])
    m = data["map"]
    for ex in examples:
        st, title = ex["state"], ex["title"]
        if bad := set(st) - KEYS:
            raise ValueError(f"example '{title}': unknown state keys {sorted(bad)}")
        if "highlight" in st and st["highlight"] not in mags:
            raise ValueError(f"example '{title}': MAG {st['highlight']} is not in the data")
        if "color" in st and st["color"] not in {"evidence", "cazy"}:
            raise ValueError(f"example '{title}': colour {st['color']} is not offered")
        if "unit" in st and st["unit"] not in {"genes", "per1000"}:
            raise ValueError(f"example '{title}': unit {st['unit']} is not offered")
        if "group" in st and st["group"] not in data["members"]:
            raise ValueError(f"example '{title}': gene group {st['group']} is not in the data")
        if "q" in st:
            q = st["q"].lower()
            texts = [m["products"][g[4]] + " " + (m["symbols"][g[3]] if g[3] >= 0 else "") for g in m["genes"]]
            if not any(q in t.lower() for t in texts):
                raise ValueError(f"example '{title}': search {st['q']!r} matches no gene")
        for k in ("question", "answer"):
            if missing := set(re.findall(r"\{(\w+)\}", ex[k])) - nums:
                raise ValueError(f"example '{title}': numbers {sorted(missing)} are not in data.json")
