"""Every state key and value an example names must be one the page can show (module 2 has no data.json)."""

IDS = {100, 99.99, 99.9, 99.5, 99, 98, 97, 95}
ERRS = {0, 0.5, 1, 2, 3}
ALLOWED = {
    "go": {"repeat", "steps", "strains"},
    "rl": set(range(1, 31)),
    "rep": set(range(1, 11)),
    "step": set(range(1, 7)),
    "id": IDS,
    "cova": set(range(2, 41)),
    "covb": set(range(1, 41)),
    "err": ERRS,
}


def check(data, examples: list[dict]) -> None:
    for ex in examples:
        for key, value in ex["state"].items():
            if key not in ALLOWED or isinstance(value, bool) or value not in ALLOWED[key]:
                raise ValueError(f"example '{ex['title']}': {key}={value} is not a state of the page")
        if "go" not in ex["state"]:
            raise ValueError(f"example '{ex['title']}': needs go (the section it is about)")
