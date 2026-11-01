"""Every MAG, contig and setting an example names must exist in data.json, the contig must belong to the example's
gene-map MAG, and a search (q) must match at least one gene of that MAG."""

KEYS = {"mag", "map", "ctg", "pos", "win", "q", "amr"}
WINDOWS = {"10", "20", "50"}


def matches(maps: dict, gene: list, q: str) -> bool:
    q = q.lower()
    texts = [maps["products"][gene[4]], maps["symbols"][gene[5]] if gene[5] >= 0 else ""]
    texts.append(maps["pfam"][gene[8]] if gene[8] >= 0 else "")
    return any(q in t.lower() for t in texts)


def check(data: dict, examples: list[dict]) -> None:
    mags = {b["id"] for b in data["bins"]}
    maps = data["maps"]
    amr = {r[0] for r in data["amr"]}
    for ex in examples:
        st, title = ex["state"], ex["title"]
        bad = set(st) - KEYS
        if bad:
            raise ValueError(f"example '{title}': unknown state keys {sorted(bad)}")
        if "mag" in st and st["mag"] not in mags:
            raise ValueError(f"example '{title}': MAG {st['mag']} is not in the data")
        mp = st.get("map", st.get("mag"))
        if ("map" in st or "ctg" in st or "q" in st or "pos" in st) and mp not in maps["mags"]:
            raise ValueError(f"example '{title}': no gene map for MAG {mp}")
        if "win" in st and str(st["win"]) not in WINDOWS:
            raise ValueError(f"example '{title}': window {st['win']} is not offered")
        if "amr" in st and st["amr"] not in amr:
            raise ValueError(f"example '{title}': resistance gene {st['amr']} is not in the data")
        m = maps["mags"].get(mp)
        if "ctg" in st:
            ids = [c[0] for c in m["contigs"]]
            if st["ctg"] not in ids:
                raise ValueError(f"example '{title}': contig {st['ctg']} is not in MAG {mp}")
            if "pos" in st and not 0 <= int(st["pos"]) < m["contigs"][ids.index(st["ctg"])][1]:
                raise ValueError(f"example '{title}': position {st['pos']} is outside contig {st['ctg']}")
        if "q" in st and not any(matches(maps, g, st["q"]) for g in m["genes"]):
            raise ValueError(f"example '{title}': no gene of MAG {mp} matches '{st['q']}'")
