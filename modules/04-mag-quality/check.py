"""Every MAG and setting an example names must exist in data.json and on the page."""

COLORS = {"q", "circ", "rrna", "trna", "meth", "var", "diff", "gunc", "cov"}
ESTIMATES = {"c2", "c1"}
SHOW = {"all", "HQ", "MQ"}
SORTS = {"cont", "comp", "diff", "var", "flag", "cov"}


def check(data: dict, examples: list[dict]) -> None:
    mags = {b["id"] for b in data["bins"]}
    allowed = {"mag": mags, "color": COLORS, "est": ESTIMATES, "show": SHOW, "sort": SORTS}
    for ex in examples:
        for key, value in ex["state"].items():
            if key not in allowed or value not in allowed[key]:
                raise ValueError(f"example '{ex['title']}': {key}={value} is not in the data")
        mag = ex["state"].get("mag")
        show = ex["state"].get("show", "all")
        if mag and show != "all" and next(b["q"] for b in data["bins"] if b["id"] == mag) != show:
            raise ValueError(f"example '{ex['title']}': MAG {mag} is hidden by show={show}")
