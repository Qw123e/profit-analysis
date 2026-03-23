from app.utils.stats_utils import normalize_label
from app.utils.stats_utils import safe_number


def test_safe_number_handles_common_inputs() -> None:
    assert safe_number(None) == 0.0
    assert safe_number("3.5") == 3.5
    assert safe_number(7) == 7.0
    assert safe_number("bad") == 0.0
    assert safe_number("1,234") == 1234.0
    assert safe_number("(2,500.5)") == -2500.5
    assert safe_number("12.3%") == 12.3


def test_normalize_label_handles_none_and_numbers() -> None:
    assert normalize_label(None) == "\ubbf8\uc9c0\uc815"
    assert normalize_label(2.0) == "2"
    assert normalize_label(2.5) == "2.5"
    assert normalize_label(" ABC ") == " ABC "
