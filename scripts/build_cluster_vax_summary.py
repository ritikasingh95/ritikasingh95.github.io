#!/usr/bin/env python3
"""Build NFHS4/NFHS5 cluster-vaccine summaries from DHS birth-recode pipeline outputs.

Inputs are the same artifacts produced by the existing workflow:
- NFHS*_12_to_23/NFHS*_IndividualData.csv
- NFHS*_12_to_23/Cluster_data.csv

The script merges individual vaccine status rows with cluster lat/long and exports
survey/state-wise cluster summaries for interactive visualization.
"""

import argparse
import csv
import json
import re
from collections import defaultdict
from pathlib import Path


DEFAULT_NFHS4_INDIV = (
    "/Users/ritikasingh/Desktop/PhD Projects/Workstation/scratch/9Sep/"
    "NFHS4_12_to_23/NFHS4_IndividualData.csv"
)
DEFAULT_NFHS4_CLUSTER = (
    "/Users/ritikasingh/Desktop/PhD Projects/Workstation/scratch/9Sep/"
    "NFHS4_12_to_23/Cluster_data.csv"
)
DEFAULT_NFHS5_INDIV = (
    "/Users/ritikasingh/Desktop/PhD Projects/Workstation/scratch/9Sep/"
    "NFHS5_12_to_23/NFHS5_IndividualData.csv"
)
DEFAULT_NFHS5_CLUSTER = (
    "/Users/ritikasingh/Desktop/PhD Projects/Workstation/scratch/9Sep/"
    "NFHS5_12_to_23/Cluster_data.csv"
)
DEFAULT_GEO_DIR = (
    "/Users/ritikasingh/Documents/GitHub/ritikasingh95.github.io/data/india-states"
)
DEFAULT_OUT = (
    "/Users/ritikasingh/Documents/GitHub/ritikasingh95.github.io/data/"
    "cluster-vax-summary.json"
)

VACCINES = {
    "MCV1": ("Vaccinated_MCV1_card", "Vaccinated_MCV1_recall"),
    "BCG": ("Vaccinated_BCG_card", "Vaccinated_BCG_recall"),
    "DPT3": ("Vaccinated_DPT3_card", "Vaccinated_DPT3_recall"),
}


def clean_text(value):
    return (value or "").strip().strip('"')


def norm_key(text):
    text = clean_text(text).lower()
    text = text.replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", "", text)
    return text


def as_float(value):
    try:
        return float(clean_text(value))
    except ValueError:
        return None


def as_binary(value):
    num = as_float(value)
    if num is None:
        return 0
    return 1 if num > 0 else 0


def load_geo_slug_lookup(geo_dir):
    slug_lookup = {}
    for path in sorted(geo_dir.glob("*.geojson")):
        stem = path.stem
        slug_lookup[norm_key(stem)] = stem

    # Common NFHS naming variants -> geojson slug key
    alias = {
        "nctofdelhi": "delhi",
        "jammuandkashmir": "jammuandkashmir",
        "dadraandnagarhaveli": "dnhanddd",
        "damananddiu": "dnhanddd",
        "dadraandnagarhavelianddamananddiu": "dnhanddd",
        "orissa": "odisha",
        "pondicherry": "puducherry",
    }

    return slug_lookup, alias


def state_to_slug(state_name, slug_lookup, alias):
    key = norm_key(state_name)
    key = alias.get(key, key)
    return slug_lookup.get(key)


def load_cluster_coords(cluster_csv):
    coords = {}
    with cluster_csv.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            cluster_id = clean_text(row.get("ClusterID"))
            if not cluster_id:
                continue
            lon = as_float(row.get("Longitude"))
            lat = as_float(row.get("Latitude"))
            if lon is None or lat is None:
                continue

            # Keep first valid coordinate for cluster id.
            coords.setdefault(cluster_id, {"lon": lon, "lat": lat})
    return coords


def init_cluster(cluster_id, lon, lat):
    return {
        "cluster_id": cluster_id,
        "lon_sum": lon,
        "lat_sum": lat,
        "coord_n": 1,
        "n": 0,
        "ones_mr0": {k: 0 for k in VACCINES},
        "ones_mr1": {k: 0 for k in VACCINES},
    }


def build_survey(individual_csv, cluster_csv, geo_slug_lookup, slug_alias):
    coords_by_cluster = load_cluster_coords(cluster_csv)
    state_cluster = defaultdict(dict)

    with individual_csv.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            state = clean_text(row.get("State") or row.get("State.x") or row.get("State.y"))
            if not state:
                continue

            cluster_id = clean_text(row.get("ClusterID"))
            if not cluster_id:
                continue

            coords = coords_by_cluster.get(cluster_id)
            if not coords:
                continue

            state_bucket = state_cluster[state]
            cluster = state_bucket.get(cluster_id)
            if cluster is None:
                cluster = init_cluster(cluster_id, coords["lon"], coords["lat"])
                state_bucket[cluster_id] = cluster
            else:
                cluster["lon_sum"] += coords["lon"]
                cluster["lat_sum"] += coords["lat"]
                cluster["coord_n"] += 1

            cluster["n"] += 1

            for vaccine, (card_col, recall_col) in VACCINES.items():
                card = as_binary(row.get(card_col))
                recall = as_binary(row.get(recall_col))
                mr0 = card
                mr1 = 1 if (card or recall) else 0

                cluster["ones_mr0"][vaccine] += mr0
                cluster["ones_mr1"][vaccine] += mr1

    survey = {
        "states": {},
        "vaccines": list(VACCINES.keys()),
    }

    for state, clusters in state_cluster.items():
        state_entry = {
            "geo_slug": state_to_slug(state, geo_slug_lookup, slug_alias),
            "clusters": [],
            "totals": {
                v: {
                    "mr0": {"n": 0, "ones": 0, "zeros": 0, "rate": 0.0},
                    "mr1": {"n": 0, "ones": 0, "zeros": 0, "rate": 0.0},
                }
                for v in VACCINES
            },
        }

        for cluster_id, cluster in clusters.items():
            n_val = cluster["n"]
            lon = cluster["lon_sum"] / max(cluster["coord_n"], 1)
            lat = cluster["lat_sum"] / max(cluster["coord_n"], 1)

            rates_mr0 = {}
            rates_mr1 = {}
            zeros_mr0 = {}
            zeros_mr1 = {}

            for vaccine in VACCINES:
                ones0 = cluster["ones_mr0"][vaccine]
                ones1 = cluster["ones_mr1"][vaccine]
                zero0 = max(n_val - ones0, 0)
                zero1 = max(n_val - ones1, 0)

                rates_mr0[vaccine] = (ones0 / n_val) if n_val else 0.0
                rates_mr1[vaccine] = (ones1 / n_val) if n_val else 0.0
                zeros_mr0[vaccine] = zero0
                zeros_mr1[vaccine] = zero1

                total0 = state_entry["totals"][vaccine]["mr0"]
                total1 = state_entry["totals"][vaccine]["mr1"]

                total0["n"] += n_val
                total0["ones"] += ones0
                total0["zeros"] += zero0

                total1["n"] += n_val
                total1["ones"] += ones1
                total1["zeros"] += zero1

            state_entry["clusters"].append(
                {
                    "cluster_id": cluster_id,
                    "lon": round(lon, 6),
                    "lat": round(lat, 6),
                    "n": n_val,
                    "ones_mr0": cluster["ones_mr0"],
                    "ones_mr1": cluster["ones_mr1"],
                    "zeros_mr0": zeros_mr0,
                    "zeros_mr1": zeros_mr1,
                    "rate_mr0": {k: round(v, 6) for k, v in rates_mr0.items()},
                    "rate_mr1": {k: round(v, 6) for k, v in rates_mr1.items()},
                }
            )

        for vaccine in VACCINES:
            for mode in ("mr0", "mr1"):
                total = state_entry["totals"][vaccine][mode]
                total["rate"] = round((total["ones"] / total["n"]) if total["n"] else 0.0, 6)

        state_entry["clusters"].sort(key=lambda item: int(item["cluster_id"]))
        survey["states"][state] = state_entry

    return survey


def ensure_exists(path_obj):
    if not path_obj.exists():
        raise SystemExit(f"Missing required input: {path_obj}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--nfhs4-individual", default=DEFAULT_NFHS4_INDIV)
    parser.add_argument("--nfhs4-cluster", default=DEFAULT_NFHS4_CLUSTER)
    parser.add_argument("--nfhs5-individual", default=DEFAULT_NFHS5_INDIV)
    parser.add_argument("--nfhs5-cluster", default=DEFAULT_NFHS5_CLUSTER)
    parser.add_argument("--geo-dir", default=DEFAULT_GEO_DIR)
    parser.add_argument("--out", default=DEFAULT_OUT)
    args = parser.parse_args()

    nfhs4_individual = Path(args.nfhs4_individual)
    nfhs4_cluster = Path(args.nfhs4_cluster)
    nfhs5_individual = Path(args.nfhs5_individual)
    nfhs5_cluster = Path(args.nfhs5_cluster)
    geo_dir = Path(args.geo_dir)
    out = Path(args.out)

    for p in [nfhs4_individual, nfhs4_cluster, nfhs5_individual, nfhs5_cluster, geo_dir]:
        ensure_exists(p)

    geo_slug_lookup, slug_alias = load_geo_slug_lookup(geo_dir)

    result = {
        "pipeline": "DHS birth-recode + cluster GPS join",
        "description": (
            "Built from NFHS*_IndividualData.csv and Cluster_data.csv generated by "
            "the NFHS4/NFHS5 vaccine scripts (card and maternal recall indicators)."
        ),
        "vaccines": list(VACCINES.keys()),
        "surveys": {
            "NFHS4": {
                "source_individual": str(nfhs4_individual),
                "source_cluster": str(nfhs4_cluster),
                "age_group": "12-23 months",
                **build_survey(nfhs4_individual, nfhs4_cluster, geo_slug_lookup, slug_alias),
            },
            "NFHS5": {
                "source_individual": str(nfhs5_individual),
                "source_cluster": str(nfhs5_cluster),
                "age_group": "12-23 months",
                **build_survey(nfhs5_individual, nfhs5_cluster, geo_slug_lookup, slug_alias),
            },
        },
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as fh:
        json.dump(result, fh, separators=(",", ":"))

    print(f"Wrote {out} ({out.stat().st_size} bytes)")
    for survey_name in ["NFHS4", "NFHS5"]:
        survey = result["surveys"][survey_name]
        total_clusters = sum(len(v["clusters"]) for v in survey["states"].values())
        missing_geo = [s for s, v in survey["states"].items() if not v.get("geo_slug")]
        print(f"{survey_name}: {len(survey['states'])} states, {total_clusters} clusters")
        print(f"  missing_geo_slugs={len(missing_geo)}")
        if missing_geo:
            print("  ", ", ".join(missing_geo))


if __name__ == "__main__":
    main()
