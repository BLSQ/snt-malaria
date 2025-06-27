from django.db.models import Max, Min


NINE_SHADES = [
    "#EDE7F6",
    "#D1C4E9",
    "#B39DDB",
    "#9575CD",
    "#7E57C2",
    "#673AB7",
    "#5E35B1",
    "#512DA8",
    "#4527A0",
]
SEVEN_SHADES = [
    "#EDE7F6",
    "#D1C4E9",
    "#B39DDB",
    "#7E57C2",
    "#673AB7",
    "#512DA8",
    "#4527A0",
]
RISK_LOW = "#A5D6A7"
RISK_MEDIUM = "#FFECB3"
RISK_HIGH = "#FECDD2"
RISK_VERY_HIGH = "#FFAB91"


def get_legend_config(metric_type):
    if metric_type.category == "Incidence":
        return {
            "domain": [5, 50, 100, 200, 300, 500],
            "range": SEVEN_SHADES,
        }
    if metric_type.category == "Prevalence":
        return {
            "domain": [10, 20, 30, 40, 50, 60, 70, 80],
            "range": NINE_SHADES,
        }
    if metric_type.category in ["Bednet coverage", "DHS DTP3 Vaccine"]:
        return {
            "domain": [40, 50, 60, 70, 80, 90],
            "range": list(reversed(SEVEN_SHADES)),
        }
    values_qs = metric_type.metricvalue_set.all()

    result = values_qs.aggregate(
        min_value=Min("value"),
        max_value=Max("value"),
    )
    min_value = result["min_value"]
    max_value = result["max_value"]

    if metric_type.category == "Mortality":
        steps = get_steps(0, max_value, len(SEVEN_SHADES))
        return {"domain": steps, "range": SEVEN_SHADES}
    if metric_type.category == "Composite risk":
        return {
            "domain": list(range(int(min_value), int(max_value))),
            "range": [RISK_LOW, RISK_MEDIUM, RISK_HIGH, RISK_VERY_HIGH],
        }
    if metric_type.category == "Seasonality":
        choices = values_qs.values_list("value", flat=True).distinct().order_by("value")
        return {
            "domain": list(choices),
            "range": [RISK_LOW, RISK_MEDIUM, RISK_HIGH, RISK_VERY_HIGH],
        }

    return {"domain": get_steps(min_value, max_value, len(SEVEN_SHADES)), "range": SEVEN_SHADES}


def get_legend_type(metric_type):
    if metric_type.category == "Mortality":
        return "linear"
    if metric_type.category in ["Composite risk", "Seasonality"]:
        return "ordinal"
    return "threshold"


def get_steps(min, max, count):
    if not min or not max:
        return []
    round_digits = 2 if min < 1 else 0
    if count == 1:
        return [round(min, round_digits)]
    step_size = (max - min) / (count - 1)
    steps = [round(min + i * step_size, round_digits) for i in range(count)]
    return steps
