"""Every MAG and setting a guided example names must exist in data.json and on the page."""

VIEWS = {"heat", "timing", "movers", "core"}
XAXES = {"depth", "share"}


def check(data: dict, examples: list[dict]) -> None:
    allowed = {"view": VIEWS, "xaxis": XAXES, "mag": {m["mag"] for m in data["movers"]}}
    for ex in examples:
        for key, value in ex["state"].items():
            if key not in allowed or value not in allowed[key]:
                raise ValueError(f"example '{ex['title']}': {key}={value} is not in the data")
