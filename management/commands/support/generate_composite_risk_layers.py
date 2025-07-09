from dataclasses import dataclass
from typing import Dict, List

from iaso.models.metric import MetricValue


@dataclass
class ComputationValue:
    label: str
    numeric: float


@dataclass
class Computation:
    range: List[int]
    value: ComputationValue


@dataclass
class SourceMetric:
    metric_code: str
    computations: List[Computation]


@dataclass
class ScoringTable:
    metric_code: str
    name: str
    category: str
    legend_type: str
    computations: List[Computation]
    source_metrics: List[SourceMetric]


scoring_table = ScoringTable(
    metric_code="RISK_MNGMNT",
    name="Incidence + Prevalence",
    category="Risk Management",
    legend_type="ordinal",
    computations=[
        Computation(range=[3, 6], value=ComputationValue(label="Low", numeric=1)),
        Computation(range=[7, 8], value=ComputationValue(label="Medium", numeric=2)),
        Computation(range=[9, 10], value=ComputationValue(label="High", numeric=3)),
        Computation(range=[11], value=ComputationValue(label="Very High", numeric=4)),
    ],
    source_metrics=[
        SourceMetric(
            metric_code="INCIDENCE_ADJ_TESTING",
            computations=[
                Computation(range=[0, 50], value=ComputationValue(label="1", numeric=1)),
                Computation(range=[51, 100], value=ComputationValue(label="2", numeric=2)),
                Computation(range=[101, 250], value=ComputationValue(label="3", numeric=3)),
                Computation(range=[251, 500], value=ComputationValue(label="4", numeric=4)),
                Computation(range=[501], value=ComputationValue(label="5", numeric=5)),
            ],
        ),
        SourceMetric(
            metric_code="PF_PR_RATE",
            computations=[
                Computation(range=[0, 5], value=ComputationValue(label="1", numeric=1)),
                Computation(range=[5, 10], value=ComputationValue(label="2", numeric=2)),
                Computation(range=[10, 35], value=ComputationValue(label="3", numeric=3)),
                Computation(range=[35, 50], value=ComputationValue(label="4", numeric=4)),
                Computation(range=[50, 100], value=ComputationValue(label="5", numeric=5)),
            ],
        ),
    ],
)


# scoring_table = {
#     "metric_code": "RISK_MNGMNT",
#     "name": "Incidence + Prevalence",
#     "category": "Risk Management",
#     "legend_type": "threshold",
#     "computations": [
#         {
#             "range": [3, 6],
#             "value": {"label": "Low", "numeric": 1},
#         },
#         {
#             "range": [7, 8],
#             "value": {"label": "Medium", "numeric": 2},
#         },
#         {
#             "range": [9, 10],
#             "value": {"label": "High", "numeric": 3},
#         },
#         {
#             "range": [11],
#             "value": {"label": "Very High", "numeric": 4},
#         },
#     ],
#     "source_metrics": [
#         {
#             "metric_code": "INCIDENCE_ADJ_TESTING",
#             "computations": [
#                 {
#                     "range": [0, 50],
#                     "value": {"label": "1", "numeric": 1},
#                 },
#                 {
#                     "range": [51, 100],
#                     "value": {"label": "1", "numeric": 1},
#                 },
#                 {
#                     "range": [101, 250],
#                     "value": {"label": "1", "numeric": 1},
#                 },
#                 {
#                     "range": [251, 500],
#                     "value": {"label": "1", "numeric": 1},
#                 },
#                 {
#                     "range": [501],
#                 },
#             ],
#         },
#         {
#             "metric_code": "PF_PR_RATE",
#             "computations": [
#                 {
#                     "range": [0, 5],
#                     "value": {"label": "1", "numeric": 1},
#                 },
#                 {
#                     "range": [5, 10],
#                     "value": {"label": "1", "numeric": 1},
#                 },
#                 {
#                     "range": [10, 35],
#                     "value": {"label": "1", "numeric": 1},
#                 },
#                 {
#                     "range": [35, 50],
#                     "value": {"label": "1", "numeric": 1},
#                 },
#                 {
#                     "range": [50, 100],
#                     "value": {"label": "1", "numeric": 1},
#                 },
#             ],
#         },
#     ],
# }


# TODO Write tests


def get_metric_type_from_scoring_table(scoring_table: ScoringTable):
    return {
        "name": scoring_table.name,
        "code": scoring_table.metric_code,
        "description": "",
        "source": "COMPUTED",
        "category": scoring_table.category,
        "unit_symbol": "",
        "legend_type": scoring_table.legend_type,
    }


def generate_metric_values(metric_values: List[MetricValue], scoring_table: ScoringTable):
    # Group metric_values per org unit
    from collections import defaultdict

    org_unit_metrics = defaultdict(dict)
    for mv in metric_values:
        org_unit_metrics[mv.org_unit_id][mv.metric_type.code] = mv.value

    results = []

    # Going through grouped metrics per org_unit from dataset
    for org_unit_id, metrics in org_unit_metrics.items():
        metric_value = _get_metric_value(scoring_table, metrics, org_unit_id)
        results.append(metric_value)

    return results


def _get_metric_value(scoring_table: ScoringTable, metrics: Dict[str, float], org_unit_id: int):
    composite_values: List[ComputationValue] = []
    for source_metric in scoring_table.source_metrics:
        code = source_metric.metric_code
        metric_value = metrics.get(code)
        if metric_value is None:
            continue

        computed_value = _get_computed_value(metric_value, source_metric.computations)
        composite_values.append(computed_value)

    # Now that we have all computed values for one org unit, let's sum them
    score_summed = sum(v.numeric for v in composite_values if v is not None)
    composite_score = _get_computed_value(score_summed, scoring_table.computations)

    print(f"composite socre: {composite_score}")

    if not composite_score:
        lower_computation = scoring_table.computations[0].value
        return {
            "org_unit_id": org_unit_id,
            "composite_score": 0,
            "composite_score_label": lower_computation.label,
        }

    return {
        "org_unit_id": org_unit_id,
        "composite_score": composite_score.numeric,
        "composite_score_label": composite_score.label,
    }


def _get_computed_value(value: float, computations: List[Computation]) -> ComputationValue:
    for rule in computations:
        range = rule.range
        # This is for latest part of computations,
        # TODO make it smarter by accepting excat match if not latest rule in computation
        if len(range) == 1 and value >= range[0]:
            return rule.value

        # TODO Define when to use <= or <
        if (len(range) == 2) and range[0] <= value < range[1]:
            return rule.value

        return None
