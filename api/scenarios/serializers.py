import random

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from iaso.api.common import UserSerializer
from plugins.snt_malaria.models import Scenario


class ScenarioSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Scenario
        fields = ["id", "created_by", "name", "description", "created_at", "updated_at", "start_year", "end_year"]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        if not value:
            raise serializers.ValidationError(_("Name cannot be empty."))

        return value


class DuplicateScenarioSerializer(serializers.Serializer):
    id_to_duplicate = serializers.IntegerField()

    def validate_id_to_duplicate(self, value):
        request = self.context.get("request")
        account = request.user.iaso_profile.account

        if not Scenario.objects.filter(id=value, account=account).exists():
            raise serializers.ValidationError(_("Scenario with this ID does not exist."))

        return value


class CalculateBudgetSerializer(serializers.Serializer):
    # TODO: Not sure this is even needed
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.all(), required=True)

    # TODO: Validate field intervention_plan_budget_requests

    # TODO THIS IS DUMMY, CLEAR THIS OUT
    # /////// DUMMY TO CLEAN WHEN WE CONNECT TO BUDGET API
    INTERVENTION_COLORS = {
        "ACTs": "#A2CAEA",
        "RDTs": "#ACDF9B",
        "MDA": "#D1C4E9",
        "PMC": "#F2B16E",
        "SMC": "#C54A53",
        "RTS,S": "#F2D683",
        "IRS": "#E4754F",
        "Routine LLIN": "#80B3DC",
        "Campaign LLIN": "#6BD39D",
        "IPTp": "#80B3DC",
    }

    def get_cost_breakdown_chart_data(intervention_budgets):
        result = []
        for intervention_budget in intervention_budgets:
            cost_breakdown = intervention_budget.get("costBreakdown")
            if cost_breakdown:
                acc = {"interventionName": intervention_budget["name"]}
                for cost_line in cost_breakdown:
                    category = cost_line["category"]
                    acc[category] = acc.get(category, 0) + cost_line["cost"]
                result.append(acc)
        return result

    @staticmethod
    def random_category():
        categories = [
            "Procurement",
            "Distribution",
            "Operational",
            "Supportive",
            "Other",
        ]
        return random.choice(categories)

    def generate_cost_breakdown(self, total_cost):
        breakdown_count = random.randint(2, 4)
        remaining = total_cost
        breakdowns = []
        for i in range(breakdown_count):
            is_last = i == breakdown_count - 1
            if is_last:
                cost = remaining
            else:
                cost = round(random.uniform(remaining * 0.1, remaining * 0.8), 2)
            category = self.random_category()
            breakdowns.append(
                {
                    "cost": cost,
                    "category": category,
                    "name": f"Breakdown {i + 1}",
                }
            )
            remaining -= cost
        # Fix rounding errors
        if breakdowns:
            sum_cost = sum(b["cost"] for b in breakdowns)
            diff = round(total_cost - sum_cost, 2)
            breakdowns[-1]["cost"] += diff
        return breakdowns

    interventions_data = [
        {"name": "ACTs", "cost": 158898812.79},
        {"name": "RDTs", "cost": 120000000.12},
        {"name": "MDA", "cost": 98000000.55},
        {"name": "PMC", "cost": 158898812.79},
        {"name": "SMC", "cost": 158898812.79},
        {"name": "RTS,S", "cost": 158898812.79},
        {"name": "IRS", "cost": 50000000},
        {"name": "Routine LLIN", "cost": 75000000},
        {"name": "Campaign LLIN", "cost": 75000000},
    ]

    def get_dummy_budget(self):
        return [
            {
                "year": 2025,
                "interventions": [
                    {
                        "name": item["name"],
                        "cost": item["cost"],
                        "costBreakdown": self.generate_cost_breakdown(item["cost"]) if item["cost"] > 0 else [],
                    }
                    for item in self.interventions_data
                ],
            },
            {
                "year": 2026,
                "interventions": [
                    {
                        "name": item["name"],
                        "cost": item["cost"],
                        "costBreakdown": self.generate_cost_breakdown(item["cost"]) if item["cost"] > 0 else [],
                    }
                    for item in self.interventions_data
                ],
            },
        ]
