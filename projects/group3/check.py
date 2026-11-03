"""Every example setting and every {placeholder} must exist in data.json (group 3)."""

import re


def check(data: dict, examples: list[dict]) -> None:
    mags = {m["id"]: m for m in data["mags"]}
    mains = {k for k, m in mags.items() if m["main"]}
    sets = {s["set"] for s in data["sets"] if s["main"] > 0}
    allowed = {
        "view": lambda v: v in ("genes", "sets"),
        "hset": lambda v: v == "all" or v in sets,
        "hscale": lambda v: v in ("share", "log2"),
        "series": lambda v: v in ("community", "per1000", "mag"),
        "mag": lambda v: v in mains,
        "hl": lambda v: v in mags,
    }
    for ex in examples:
        for key, value in ex["state"].items():
            if key not in allowed or not allowed[key](value):
                raise ValueError(f"example '{ex['title']}': {key}={value} is not in the data")
        for text in (ex["question"], ex["answer"]):
            for mid, field in re.findall(r"\{mag:([^:}]+):([a-z0-9_]+)\}", text, re.I):
                if mid not in mags or mags[mid].get(field) is None:
                    raise ValueError(f"example '{ex['title']}': {{mag:{mid}:{field}}} is not in the data")
            for key in re.findall(r"\{([a-z0-9_]+)\}", text, re.I):
                if key not in data["numbers"]:
                    raise ValueError(f"example '{ex['title']}': {{{key}}} is not in data.json numbers")
