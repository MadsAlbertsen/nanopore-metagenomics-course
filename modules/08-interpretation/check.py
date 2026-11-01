"""Every MAG, measure and day an example names must exist in data.json."""

MEASURES = {"share", "binned", "gb"}
GROUP_BY = {"phylum", "mag"}
MAX_PICK = 3
MT_VIEWS = {"rate", "count"}


def check(data: dict, examples: list[dict]) -> None:
    mags = {m["id"] for m in data["mags"]}
    days = set(data["day"])
    for ex in examples:
        for key, value in ex["state"].items():
            text = str(value)
            if key == "m":
                ok = value in MEASURES
            elif key == "by":
                ok = value in GROUP_BY
            elif key == "log":
                ok = value in {0, 1}
            elif key == "mv":
                ok = value in MT_VIEWS
            elif key == "b":
                chosen = text.split(",")
                ok = all(d.isdigit() and int(d) in days for d in chosen) and 0 < len(set(chosen)) < len(days)
            elif key == "mag":
                picked = [] if text == "none" else text.split(",")
                ok = len(picked) <= MAX_PICK and all(m in mags for m in picked)
            else:
                ok = False
            if not ok:
                raise ValueError(f"example '{ex['title']}': {key}={value} is not in the data")
