"""Every setting an example names must exist in data.json, and every number placeholder ({key|d}) in a question or
answer must be in data.json's numbers."""

import re

PLACEHOLDER = re.compile(r"\{(\w+)(?:\|\d)?(?:\|\+)?\}")


def check(data: dict, examples: list[dict]) -> None:
    cats = {c["name"] for c in data["categories"]}
    allowed = {
        "cat": lambda v: v in ("abs", "rel"),
        "sort": lambda v: v in data["loo"],
        "stab": lambda v: v in data["stability"],
        "highlight": lambda v: v in cats,
    }
    for ex in examples:
        for key, value in ex["state"].items():
            if key not in allowed or not allowed[key](value):
                raise ValueError(f"example '{ex['title']}': {key}={value} is not in the data")
        for text in (ex["question"], ex["answer"]):
            for key in PLACEHOLDER.findall(text):
                if key not in data["numbers"]:
                    raise ValueError(f"example '{ex['title']}': no number {key} in data.json")
    if len(data["days"]) != 10 or any(len(row) != 10 for row in data["bc"]["taxa"]):
        raise ValueError("expected ten days")
