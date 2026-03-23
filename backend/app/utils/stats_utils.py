from __future__ import annotations


def safe_number(value: object) -> float:
    """Convert value to float, return 0 if conversion fails."""
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return 0.0
        cleaned = cleaned.replace(",", "")
        if cleaned.startswith("(") and cleaned.endswith(")"):
            cleaned = f"-{cleaned[1:-1]}"
        if cleaned.endswith("%"):
            cleaned = cleaned[:-1]
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def normalize_label(value: object, default: str = "\ubbf8\uc9c0\uc815") -> str:
    """Normalize value to string label."""
    if value is None:
        return default
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)
