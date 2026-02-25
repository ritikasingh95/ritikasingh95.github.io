#!/usr/bin/env python3
"""Build state-wise cluster vaccine summary JSON from NFHS spatial individual CSV."""

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path


DEFAULT_SRC = "/Users/ritikasingh/Documents/GitHub/CoverageModelling/utils/NFHS4_Spatial_IndividualDF.csv"
DEFAULT_OUT = "/Users/ritikasingh/Documents/GitHub/ritikasingh95.github.io/data/cluster-vax-summary-nfhs4.json"

STATES_KEEP = {
    "Uttar Pradesh",
    "Bihar",
    "Assam",
    "Maharashtra",
    "Rajasthan",
    "Nagaland",
}

VACCINES = {
    "MCV1": ("Vaccinated_MCV1_card", "Vaccinated_MCV1_recall"),
    "BCG": ("Vaccinated_BCG_card", "Vaccinated_BCG_recall"),
    "DPT3": ("Vaccinated_DPT3_card", "Vaccinated_DPT3_recall"),
}


def as_int(value):
    if value is None:
        return 0
    value = str(value).strip().strip('"')
    if value == "" or value.lower() == "na":
        return 0
    try:
        return int(float(value))
    except ValueError:
        return 0


def build_summary(src_csv):
    state_cluster = defaultdict(
        lambda: defaultdict(
            lambda: {
                "cluster_id": None,
                "lon_sum": 0.0,
                "lat_sum": 0.0,
                "coord_n": 0,
                "n": 0,
                "ones": {k: 0 for k in VACCINES},
                "zeros": {k: 0 for k in VACCINES},
            }
        )
    )

    with src_csv.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            state = (row.get("State.x") or row.get("State.y") or "").strip().strip('"')
            if state not in STATES_KEEP:
                continue

            cluster_id = (row.get("ClusterID") or "").strip().strip('"')
            if not cluster_id:
                continue

            cluster = state_cluster[state][cluster_id]
            cluster["cluster_id"] = cluster_id
            cluster["n"] += 1

            lon_raw = (row.get("Longitude") or "").strip().strip('"')
            lat_raw = (row.get("Latitude") or "").strip().strip('"')
            try:
                lon = float(lon_raw)
                lat = float(lat_raw)
                cluster["lon_sum"] += lon
                cluster["lat_sum"] += lat
                cluster["coord_n"] += 1
            except ValueError:
                pass

            for vaccine, (card_col, rec_col) in VACCINES.items():
                status = 1 if (as_int(row.get(card_col)) == 1 or as_int(row.get(rec_col)) == 1) else 0
                if status == 1:
                    cluster["ones"][vaccine] += 1
                else:
                    cluster["zeros"][vaccine] += 1

    summary = {
        "source": str(src_csv),
        "survey": "NFHS4",
        "age_group": "12-23 months",
        "vaccines": list(VACCINES.keys()),
        "states": {},
    }

    for state, clusters in state_cluster.items():
        state_entry = {
            "clusters": [],
            "totals": {v: {"n": 0, "ones": 0, "zeros": 0, "rate": 0.0} for v in VACCINES},
        }

        for cluster_id, cluster in clusters.items():
            if cluster["coord_n"] == 0:
                continue

            lon = cluster["lon_sum"] / cluster["coord_n"]
            lat = cluster["lat_sum"] / cluster["coord_n"]

            rates = {}
            for vaccine in VACCINES:
                n_val = cluster["ones"][vaccine] + cluster["zeros"][vaccine]
                rate_val = cluster["ones"][vaccine] / n_val if n_val else 0.0
                rates[vaccine] = rate_val

                state_entry["totals"][vaccine]["n"] += n_val
                state_entry["totals"][vaccine]["ones"] += cluster["ones"][vaccine]
                state_entry["totals"][vaccine]["zeros"] += cluster["zeros"][vaccine]

            state_entry["clusters"].append(
                {
                    "cluster_id": cluster_id,
                    "lon": round(lon, 6),
                    "lat": round(lat, 6),
                    "n": cluster["n"],
                    "ones": cluster["ones"],
                    "zeros": cluster["zeros"],
                    "rate": {k: round(v, 6) for k, v in rates.items()},
                }
            )

        for vaccine in VACCINES:
            total = state_entry["totals"][vaccine]
            total["rate"] = round((total["ones"] / total["n"]) if total["n"] else 0.0, 6)

        state_entry["clusters"].sort(key=lambda item: int(item["cluster_id"]))
        summary["states"][state] = state_entry

    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", default=DEFAULT_SRC, help="Path to NFHS spatial individual CSV")
    parser.add_argument("--out", default=DEFAULT_OUT, help="Output JSON path")
    args = parser.parse_args()

    src = Path(args.src)
    out = Path(args.out)

    if not src.exists():
        raise SystemExit(f"Source file not found: {src}")

    out.parent.mkdir(parents=True, exist_ok=True)
    summary = build_summary(src)
    with out.open("w", encoding="utf-8") as fh:
        json.dump(summary, fh, separators=(",", ":"))

    print(f"Wrote {out} ({out.stat().st_size} bytes)")
    for state in sorted(summary["states"]):
        print(f"{state}: {len(summary['states'][state]['clusters'])} clusters")


if __name__ == "__main__":
    main()
