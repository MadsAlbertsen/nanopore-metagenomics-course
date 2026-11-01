"""Every setting an example names must exist in data.json. And the data must keep its promises: the move table gives
one move per base in every read (the positive control), the published bases are only those of reads aligned to a bin
(trace bases outside the aligned part are '.'), and every stretch is consistent (boundaries, bases, alignment)."""

ZOOMS = {1000, 200, 50}


def check(data: dict, examples: list[dict]) -> None:
    motifs = {m["motif"] for m in data["motifs"]}
    bins = {b["id"] for b in data["bins"]}
    allowed = {
        "zw": lambda v: v in ZOOMS,
        "zs": lambda v: isinstance(v, int) and 0 <= v and v % 5 == 0,
        "stretch": lambda v: isinstance(v, int) and 1 <= v <= len(data["stretches"]),
        "fitb": lambda v: v in ("refined", "move"),
        "bound": lambda v: v in ("refined", "move"),
        "motif": lambda v: v in motifs,
        "split": lambda v: v in (0, 1),
        "kbin": lambda v: str(v) in bins,
        "kmod": lambda v: v in ("6mA", "5mC", "4mC"),
    }
    for ex in examples:
        st = ex["state"]
        for key, value in st.items():
            if key not in allowed or not allowed[key](value):
                raise ValueError(f"example '{ex['title']}': {key}={value} is not in the data")
        if st.get("zs", 0) + st.get("zw", 1000) > 1000:
            raise ValueError(f"example '{ex['title']}': window beyond the first second")
        if "kbin" in st and st.get("kmod", "6mA") not in data["kmers"][str(st["kbin"])]:
            raise ValueError(f"example '{ex['title']}': no {st['kmod']} list for bin {st['kbin']}")

    r = data["reads"]
    if r["moves_ok"] != r["n"] or r["blocks_ok"] != r["n"]:
        raise ValueError("the move table does not give one move per base in every read")
    t = data["trace"]
    lo, hi = t["aligned"]
    for i, b in enumerate(t["bases"]):
        inside = lo <= t["bounds"][i] < hi
        if (b == ".") == inside or b not in "ACGT.":
            raise ValueError("trace publishes a base outside the aligned part of the read")
    for s in data["stretches"]:
        if len(s["move"]) != len(s["read"]) + 1 or len(s["q"]) != len(s["read"]) or len(s["p6ma"]) != len(s["read"]):
            raise ValueError(f"stretch '{s['title']}': read bases and move boundaries do not match")
        if len(s["refined"]) != len(s["ref"]) + 1 or len(s["expected"]) != len(s["ref"]):
            raise ValueError(f"stretch '{s['title']}': reference bases and boundaries do not match")
        reads = [q for q, _ in s["ops"] if q >= 0]
        refs = [x for _, x in s["ops"] if x >= 0]
        if reads != list(range(len(s["read"]))) or refs != list(range(len(s["ref"]))):
            raise ValueError(f"stretch '{s['title']}': alignment does not cover every base once")
        if any(x < 0 or x > len(s["pa"]) for x in s["move"] + s["refined"]):
            raise ValueError(f"stretch '{s['title']}': a boundary lies outside its samples")
