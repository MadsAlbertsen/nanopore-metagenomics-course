"""Every MAG, view, sample and setting an example names must exist in data.json."""

COLORS = {"phylum", "binned", "purity", "comp", "cont"}
LENGTHS = {"purity", "purity_10kb", "purity_50kb", "purity_200kb"}


def check(data: dict, examples: list[dict]) -> None:
    space = data["space"]
    bins = {b["id"] for b in data["bins"]}
    views = {"gcdepth", "pair"} | set(space["maps"])
    samples = set(space["samples"])
    allowed = {
        "a": views,
        "b": views,
        "ax": samples,
        "ay": samples,
        "bx": samples,
        "by": samples,
        "color": COLORS,
        "mark": bins,
        "sel": bins,
        "only": {0, 1},
        "len": LENGTHS,
    }
    for ex in examples:
        for key, value in ex["state"].items():
            if key not in allowed or value not in allowed[key]:
                raise ValueError(f"example '{ex['title']}': {key}={value} is not in the data")
