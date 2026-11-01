"""Every setting an example names must exist in data.json; and the page's filter must reproduce the analysis's own
filter: with the analysis's cut-offs (mean Q 10, 1,000 bp) the per-read arrays give each sample's kept reads and bases
as chopper reported them (np26 scripts/27_course_reads.py checks those against chopper's logs). Sequence excerpts
publish only bases inside a MAG-contig alignment or a recognised adapter / flank / barcode: every other base is '.'."""

LENS = {0, 200, 500, 1000, 2000, 3000, 5000, 10000}


def check(data: dict, examples: list[dict]) -> None:
    samples = [s["sample"] for s in data["samples"]]
    allowed = {
        "sample": lambda v: v == "all" or v in samples,
        "unit": lambda v: v in ("reads", "bases"),
        "q": lambda v: isinstance(v, int) and 0 <= v <= 20,
        "len": lambda v: v in LENS,
        "start": lambda v: isinstance(v, int) and 1 <= v <= len(data["starts"]),
        "join": lambda v: isinstance(v, int) and 1 <= v <= len(data["joins"]),
    }
    for ex in examples:
        for key, value in ex["state"].items():
            if key not in allowed or not allowed[key](value):
                raise ValueError(f"example '{ex['title']}': {key}={value} is not in the data")
    r = data["reads"]
    q, length = data["settings"]["min_q"], data["settings"]["min_len"]
    for k, s in enumerate(data["samples"]):
        kept = [n for i, n in enumerate(r["len"]) if r["s"][i] == k and r["q"][i] >= q and n >= length]
        if len(kept) != s["kept_reads"] or sum(kept) != s["kept_bases"]:
            raise ValueError(f"{s['sample']}: page keeps {len(kept)} reads, analysis {s['kept_reads']}")

    excerpts = [x for x in data["starts"]] + [j["junction"] for j in data["joins"] if j["junction"]]
    for x in excerpts:
        seq, labels = x["seq"], x["labels"]
        if len(seq) != len(labels) or len(seq) != len(x["qual"]) or set(labels) - set("LFBTGU"):
            raise ValueError("excerpt with malformed labels")
        if any((b == ".") != (c == "U") for b, c in zip(seq, labels, strict=True)) or set(seq) - set("ACGT."):
            raise ValueError("excerpt publishes a base that is neither aligned to a MAG contig nor recognised")
