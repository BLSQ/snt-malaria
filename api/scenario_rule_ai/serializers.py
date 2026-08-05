from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from plugins.snt_malaria.models import Scenario
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION


class ScenarioRuleAIRequestSerializer(serializers.Serializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none())
    message = serializers.CharField(help_text="User message describing the scenario rules to create or modify")
    conversation_history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        help_text="Previous conversation messages",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        account = user.iaso_profile.account
        self.fields["scenario"].queryset = Scenario.objects.filter(account=account)

    def validate_scenario(self, scenario):
        user = self.context["request"].user

        if scenario.is_locked:
            raise serializers.ValidationError("Cannot generate rules for a locked scenario.")

        if scenario.created_by != user and not user.has_perm(SNT_SCENARIO_FULL_WRITE_PERMISSION.full_name()):
            raise PermissionDenied("You don't have permission to edit this scenario")

        return scenario


class ScenarioRuleAIResponseSerializer(serializers.Serializer):
    assistant_message = serializers.CharField()
    rules = serializers.ListField(child=serializers.DictField(), allow_null=True)
    conversation_history = serializers.ListField(child=serializers.DictField())
