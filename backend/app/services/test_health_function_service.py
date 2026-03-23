from app.services.health_function_service import compute_health_function_stats


def test_compute_health_function_stats_filters_and_groups() -> None:
    key_year = "\ud68c\uacc4\uc5f0\ub3c4"
    key_quarter = "\ubd84\uae30"
    key_customer = "\uace0\uac1d\uba85"
    key_form_type = "\uc81c\ud615\ubcc4"
    key_function = "\uae30\ub2a5\ubcc4"
    key_biz_unit = "\uc601\uc5c5\ubd80\ubb38 \ub0b4\uc5ed"
    key_period = "\uae30\uac04"
    key_product = "\uc81c\ud488\uba85"
    key_total_sales = "\ucd1d\ub9e4\ucd9c"
    key_total_op = "\uc601\uc5c5\uc774\uc775"

    rows = [
        {
            key_year: 2024,
            key_quarter: "1Q",
            key_customer: "Alpha",
            key_form_type: "Powder",
            key_function: "Energy",
            key_biz_unit: "BU1",
            key_period: 1,
            key_product: "P1",
            key_total_sales: 100,
            key_total_op: 10
        },
        {
            key_year: 2024,
            key_quarter: "1Q",
            key_customer: None,
            key_form_type: None,
            key_function: "Energy",
            key_biz_unit: "BU1",
            key_period: 2,
            key_product: "P2",
            key_total_sales: 50,
            key_total_op: 5
        },
        {
            key_year: 2023,
            key_quarter: "4Q",
            key_customer: "Beta",
            key_form_type: "Capsule",
            key_function: "Sleep",
            key_biz_unit: "BU2",
            key_period: 4,
            key_product: "P3",
            key_total_sales: 80,
            key_total_op: 8
        }
    ]

    filter_options, metrics = compute_health_function_stats(
        rows,
        year="2024",
        period_end=2
    )

    assert metrics.totalSales == 150
    assert metrics.totalOP == 15
    assert metrics.uniqueCustomers == 1
    assert metrics.byPeriod[0].name == "1"
    assert metrics.byPeriod[0].sales == 100
    assert metrics.topProducts[0].name == "P1"
    assert metrics.byFormType[0].name == "Powder"

    assert filter_options.years == ["2023", "2024"]
    assert filter_options.periods == [1, 2, 4]
