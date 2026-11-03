"""Every MAG, view and category an example names, and every number placeholder in its text, must exist in data.json."""

import re


def check(data: dict, examples: list[dict]) -> None:
    mags = {m["mag"] for m in data["mags"]}
    allowed = {"fig1": {"phyla", "diversity"}, "mag": mags, "cat": set(data["cazy"]["cats"]), "big": {True, False}}
    for ex in examples:
        for key, value in ex["state"].items():
            if key not in allowed or value not in allowed[key]:
                raise ValueError(f"example '{ex['title']}': {key}={value} is not in the data")
        text = ex["question"] + " " + ex["answer"]
        for mag, field in re.findall(r"\{m:([^:}]+):([a-z0-9_]+)\}", text):
            if mag not in mags or field not in data["mags"][0]:
                raise ValueError(f"example '{ex['title']}': {{m:{mag}:{field}}} is not in the data")
        for cat, rank, field in re.findall(r"\{c:([a-z_]+):(\d+):([a-z_]+)\}", text):
            if cat not in data["cazy"]["top"] or field not in data["cazy"]["top"][cat][int(rank)]:
                raise ValueError(f"example '{ex['title']}': {{c:{cat}:{rank}:{field}}} is not in the data")
        for key in re.findall(r"\{([a-z0-9_]+)(?::\d)?\}", text):
            if key not in data["numbers"]:
                raise ValueError(f"example '{ex['title']}': number '{key}' is not in data.json")
