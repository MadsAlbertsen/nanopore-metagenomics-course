"""Every state key and value an example names must be one the page can show: a simulation setting, or a piece of the
real graph in data.json (g), a colour (col) and a node of that piece (node)."""

IDS = {100, 99.99, 99.9, 99.5, 99, 98, 97, 95}
ERRS = {0, 0.5, 1, 2, 3}
ALLOWED = {
    "go": {"repeat", "steps", "strains", "graphs", "circles"},
    "rl": set(range(1, 31)),
    "rep": set(range(1, 11)),
    "step": set(range(1, 7)),
    "id": IDS,
    "cova": set(range(2, 41)),
    "covb": set(range(1, 41)),
    "err": ERRS,
    "col": {"mag", "depth"},
}


def check(data, examples: list[dict]) -> None:
    pieces = {g["id"]: {n[0] for n in g["nodes"]} for g in data["subgraphs"]}
    for ex in examples:
        state = ex["state"]
        for key, value in state.items():
            if key == "g":
                ok = value in pieces
            elif key == "node":
                ok = value in pieces.get(state.get("g"), set())
            else:
                ok = key in ALLOWED and not isinstance(value, bool) and value in ALLOWED[key]
            if not ok:
                raise ValueError(f"example '{ex['title']}': {key}={value} is not a state of the page")
        if "go" not in state:
            raise ValueError(f"example '{ex['title']}': needs go (the section it is about)")
        if state["go"] == "graphs" and "g" not in state:
            raise ValueError(f"example '{ex['title']}': go=graphs needs g (the piece of the graph)")
