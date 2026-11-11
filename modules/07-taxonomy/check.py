"""Every MAG, test MAG and setting an example names must exist in data.json."""

KEYS = {"mag", "lo", "tool", "q", "lv"}
QUERIES = {"window", "read"}


def check(data: dict, examples: list[dict]) -> None:
    mags = {b["id"] for b in data["bins"]}
    targets = {t["id"] for t in data["leaveout"]["targets"]}
    tools = set(data["leaveout"]["tools"])
    for ex in examples:
        st, title = ex["state"], ex["title"]
        bad = set(st) - KEYS
        if bad:
            raise ValueError(f"example '{title}': unknown state keys {sorted(bad)}")
        if "mag" in st and st["mag"] not in mags:
            raise ValueError(f"example '{title}': MAG {st['mag']} is not in the data")
        if "lo" in st and st["lo"] not in targets:
            raise ValueError(f"example '{title}': {st['lo']} is not a test MAG")
        if "tool" in st and st["tool"] not in tools:
            raise ValueError(f"example '{title}': tool {st['tool']} is not in the data")
        if "lv" in st and st["lv"] not in data["leaveout"]["levels"]:
            raise ValueError(f"example '{title}': level {st['lv']} is not in the data")
        if "q" in st and st["q"] not in QUERIES:
            raise ValueError(f"example '{title}': query {st['q']} is not offered")
