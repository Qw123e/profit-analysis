"""
Daily snapshot job entrypoint.

Run this via cron/systemd timer rather than inside the web server workers.
"""


def main() -> None:
    raise SystemExit(
        "Not implemented. Wire SnapshotService + AthenaClient here (daily materialization + snapshot build)."
    )


if __name__ == "__main__":
    main()

