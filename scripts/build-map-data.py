import argparse
import csv
import json
import math
from collections import defaultdict
from pathlib import Path

GRID_DEGREES = 0.005


def parse_coordinate(value: str | None, minimum: float, maximum: float) -> float | None:
    if not value:
        return None
    try:
        coordinate = float(value)
    except ValueError:
        return None
    if not math.isfinite(coordinate) or not minimum <= coordinate <= maximum:
        return None
    return coordinate


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a coarse GeoJSON density layer from the Toronto KSI CSV."
    )
    parser.add_argument("csv_path", type=Path, help="Path to TOTAL_KSI_*.csv")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1]
        / "static"
        / "data"
        / "toronto-collision-density.json",
        help="Destination for the aggregated map data",
    )
    args = parser.parse_args()

    if not args.csv_path.is_file():
        parser.error(f"CSV file does not exist: {args.csv_path}")

    source_rows = 0
    rows_with_coordinates = 0
    rows_without_collision_id = 0
    collisions: dict[str, tuple[float, float, bool]] = {}
    with args.csv_path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        required_columns = {"ACCNUM", "LATITUDE", "LONGITUDE", "ACCLASS"}
        if not reader.fieldnames or not required_columns.issubset(reader.fieldnames):
            parser.error(f"CSV must contain columns: {', '.join(sorted(required_columns))}")

        for row_number, row in enumerate(reader, start=2):
            source_rows += 1
            latitude = parse_coordinate(row.get("LATITUDE"), -90, 90)
            longitude = parse_coordinate(row.get("LONGITUDE"), -180, 180)
            if latitude is None or longitude is None:
                continue
            rows_with_coordinates += 1

            collision_id = (row.get("ACCNUM") or "").strip()
            if not collision_id:
                rows_without_collision_id += 1
                continue

            is_fatal = row.get("ACCLASS") == "Fatal"
            existing = collisions.get(collision_id)
            if existing:
                collisions[collision_id] = (
                    existing[0],
                    existing[1],
                    existing[2] or is_fatal,
                )
            else:
                collisions[collision_id] = (latitude, longitude, is_fatal)

    cells: dict[tuple[float, float], list[object]] = defaultdict(lambda: [set(), set()])
    for collision_id, (latitude, longitude, is_fatal) in collisions.items():
        cell_latitude = (math.floor(latitude / GRID_DEGREES) + 0.5) * GRID_DEGREES
        cell_longitude = (math.floor(longitude / GRID_DEGREES) + 0.5) * GRID_DEGREES
        cell = cells[(cell_latitude, cell_longitude)]
        cell[0].add(collision_id)
        if is_fatal:
            cell[1].add(collision_id)

    features = []
    for (latitude, longitude), (collision_ids, fatal_ids) in sorted(cells.items()):
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [longitude, latitude]},
                "properties": {
                    "collisionCount": len(collision_ids),
                    "fatalCount": len(fatal_ids),
                },
            }
        )

    output = {
        "sourceFile": args.csv_path.name,
        "aggregation": (
            "Distinct ACCNUM values are assigned to 0.005-degree cell centers; "
            "fatal counts include ACCCLASS=Fatal."
        ),
        "metadata": {
            "sourceRows": source_rows,
            "rowsWithCoordinates": rows_with_coordinates,
            "rowsWithoutCollisionId": rows_without_collision_id,
            "geolocatedCollisionCount": len(collisions),
            "fatalCollisionCount": sum(is_fatal for _, _, is_fatal in collisions.values()),
            "cellCount": len(features),
            "gridDegrees": GRID_DEGREES,
        },
        "collection": {"type": "FeatureCollection", "features": features},
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, separators=(",", ":")), encoding="utf-8")
    print(
        f"Wrote {len(features)} aggregated cells for "
        f"{len(collisions)} geolocated collision IDs to {args.output}"
    )


if __name__ == "__main__":
    main()
