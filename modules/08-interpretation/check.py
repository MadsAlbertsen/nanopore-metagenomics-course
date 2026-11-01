"""Every MAG, measure and day an example names must exist in data.json; MAGs picked in an example about the
metabolism section (state key mv) must be among its MAGs."""

MEASURES = {"share", "binned", "gb"}
GROUP_BY = {"phylum", "mag"}
MAX_PICK = 3
MT_VIEWS = {"rate", "count"}


def check(data: dict, examples: list[dict]) -> None:
    mags = {m["id"] for m in data["mags"]}
    metab = {m["id"] for m in data["metab"]["mags"]}
    days = set(data["day"])
    for ex in examples:
        # an example about the metabolism section (it sets mv) must pick MAGs that the section shows
        if "mv" in ex["state"] and str(ex["state"].get("mag", "none")) != "none":
            outside = set(str(ex["state"]["mag"]).split(",")) - metab
            if outside:
                raise ValueError(f"example '{ex['title']}': {sorted(outside)} not in the metabolism section")
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
