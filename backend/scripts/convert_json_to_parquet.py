#!/usr/bin/env python3
"""Convert existing JSON snapshots to Parquet format for faster loading"""

import json
import os
from pathlib import Path

import pandas as pd


def convert_json_to_parquet(json_path: Path):
    """Convert a single JSON snapshot to Parquet"""
    if not json_path.exists():
        print(f"❌ JSON not found: {json_path}")
        return

    parquet_path = json_path.with_suffix(".parquet")
    if parquet_path.exists():
        print(f"⏭️  Parquet already exists: {parquet_path}")
        return

    print(f"🔄 Converting: {json_path}")

    # Load JSON
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Convert to DataFrame
    df = pd.DataFrame(data["rows"], columns=data["columns"])

    # Convert all columns to string to avoid type issues
    # (Parquet doesn't handle mixed types well)
    for col in df.columns:
        df[col] = df[col].astype(str)

    # Save as Parquet
    df.to_parquet(parquet_path, engine="pyarrow", compression="snappy", index=False)

    json_size = json_path.stat().st_size / 1024 / 1024
    parquet_size = parquet_path.stat().st_size / 1024 / 1024
    reduction = (1 - parquet_size / json_size) * 100

    print(f"✅ Saved: {parquet_path}")
    print(f"   JSON: {json_size:.2f}MB → Parquet: {parquet_size:.2f}MB ({reduction:.1f}% reduction)")


def main():
    # Find GCC snapshot files only
    data_dir = Path("/app/data/snapshots/gcc")

    if not data_dir.exists():
        print(f"❌ GCC directory not found: {data_dir}")
        return

    json_files = list(data_dir.rglob("*.json"))

    if not json_files:
        print("❌ No GCC JSON snapshot files found")
        return

    print(f"📦 Found {len(json_files)} GCC JSON snapshot files")
    print()

    for json_file in json_files:
        convert_json_to_parquet(json_file)
        print()

    print("🎉 Conversion complete!")


if __name__ == "__main__":
    main()
