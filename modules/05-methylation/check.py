"""Every MAG, contig and setting an example names must exist in data.json, and the contig must be listed under the
example's own list settings (set, outcome filter, length)."""

SETS = {"circular", "unbinned", "control", "absent"}
SHOW = {"trusted", "depth", "comp", "both", "placed", "all"}
LENGTHS = {"all": (0, float("inf")), "short": (0, 50_000), "mid": (50_000, 200_000), "long": (200_000, float("inf"))}


def listed(c: dict, pset: str, pshow: str, plen: str) -> bool:
    sets = {c["set"]} | ({"circular"} if c["set"] == "unbinned" and c["circ"] else set())
    lo, hi = LENGTHS[plen]
    if pset not in sets or not lo <= c["len"] < hi:
        return False
    if pshow == "all":
        return True
    if c["out"] != "assigned":
        return False
    depth, comp = (c["rankP"] or 1e9) <= 3, (c["rankT"] or 1e9) <= 3
    trusted = c["len"] >= 50_000 and c["groups"] >= 2 and depth
    return {"placed": True, "trusted": trusted, "depth": depth, "comp": comp, "both": depth and comp}[pshow]


def check(data: dict, examples: list[dict]) -> None:
    mags = {b["id"] for b in data["bins"]}
    contigs = {c["id"]: c for c in data["place"]["contigs"]}
    allowed = {"mag": mags, "win": set(data["winMotifs"]), "contig": set(contigs), "pset": SETS, "pshow": SHOW}
    allowed["plen"] = set(LENGTHS)
    for ex in examples:
        st = ex["state"]
        for key, value in st.items():
            if key not in allowed or value not in allowed[key]:
                raise ValueError(f"example '{ex['title']}': {key}={value} is not in the data")
        if "win" in st and not any(
            c["id"] == st["win"] for b in data["bins"] if b["id"] == st.get("mag") for c in b["contigs"]
        ):
            raise ValueError(f"example '{ex['title']}': contig {st['win']} is not in MAG {st.get('mag')}")
        if "contig" in st:
            args = st.get("pset", "circular"), st.get("pshow", "depth"), st.get("plen", "all")
            if not listed(contigs[st["contig"]], *args):
                raise ValueError(f"example '{ex['title']}': contig {st['contig']} is not listed with {args}")
