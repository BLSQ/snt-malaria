from django.db.models import Min, Max

NINE_SHADES_OF_RED = [
    "#FFCCBC",
    "#FFAB91",
    "#FF8A65",
    "#FF7043",
    "#FF5722",
    "#DB3C0B",
    "#B83B14",
    "#8B2B0E",
    "#601B06",
]
SEVEN_SHADES_OF_RED = [
    "#FFCCBC",
    "#FFAB91",
    "#FF8A65",
    "#FF5722",
    "#DB3C0B",
    "#8B2B0E",
    "#601B06",
]


def get_legend_thresholds_for_metric_category(metric_type):
    if metric_type.category == "Incidence":
        return {
            "domain": [5, 50, 100, 200, 300, 500],
            "range": SEVEN_SHADES_OF_RED,
        }
    elif metric_type.category == "Prevalence":
        return {
            "domain": [10, 20, 30, 40, 50, 60, 70, 80],
            "range": NINE_SHADES_OF_RED,
        }
    if metric_type.category == "Mortality":
        values_qs = metric_type.metricvalue_set.all()

        result = values_qs.aggregate(
            min_value=Min("value"),
            max_value=Max("value"),
        )
        min_value = result["min_value"]
        max_value = result["max_value"]

        return {"domain": [0, max_value], "range": ["#FFCCBC", "#601B06"]}
    else:
        return {}
