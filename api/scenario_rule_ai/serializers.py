import logging

from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from plugins.snt_malaria.api.ai_chat.serializers import (
    attachments_field,
    conversation_history_field,
    quick_replies_field,
)
from plugins.snt_malaria.models import Scenario
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION

from .rule_set import persist_scenario_rule_set


logger = logging.getLogger(__name__)

RULE_RESTORE_STALE_ERROR = (
    "Couldn't restore this rule set - a data layer or intervention it uses no longer exists. "
    "The rules currently in the scenario were left unchanged."
)


def validate_scenario_writable(scenario, user):
    """Shared guard for both AI entry points: the scenario must be unlocked and the user must own it
    (or hold the full-write permission)."""
    if scenario.is_locked:
        raise serializers.ValidationError("Cannot generate rules for a locked scenario.")

    if scenario.created_by != user and not user.has_perm(SNT_SCENARIO_FULL_WRITE_PERMISSION.full_name()):
        raise PermissionDenied("You don't have permission to edit this scenario")

    return scenario


class _AccountScopedScenarioSerializer(serializers.Serializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none())

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            account = request.user.iaso_profile.account
            self.fields["scenario"].queryset = Scenario.objects.filter(account=account)

    def validate_scenario(self, scenario):
        return validate_scenario_writable(scenario, self.context["request"].user)


class ScenarioRuleAIRequestSerializer(_AccountScopedScenarioSerializer):
    message = serializers.CharField(help_text="User message describing the scenario rules to create or modify")
    conversation_history = conversation_history_field()
    attachments = attachments_field()


class ScenarioRuleAIResponseSerializer(serializers.Serializer):
    assistant_message = serializers.CharField()
    rules = serializers.ListField(child=serializers.DictField(), allow_null=True)
    quick_replies = quick_replies_field()
    conversation_history = serializers.ListField(child=serializers.DictField())


class ScenarioRuleRestoreRequestSerializer(_AccountScopedScenarioSerializer):
    """Re-persists a complete rule set the chat client captured before an earlier AI turn (the
    transcript's "revert" action). Reuses the exact generate pipeline, so it recreates/deletes rules,
    reprioritizes, and refreshes assignments + budget in one transaction."""

    rules = serializers.ListField(child=serializers.DictField())

    def save(self):
        scenario = self.validated_data["scenario"]
        user = self.context["request"].user
        try:
            return persist_scenario_rule_set(scenario, self.validated_data["rules"], user, self.context)
        except serializers.ValidationError as e:
            logger.warning("Scenario rule restore rejected a stale snapshot: %s", e)
            raise serializers.ValidationError({"rules": [RULE_RESTORE_STALE_ERROR]})


class ScenarioRuleRestoreResponseSerializer(serializers.Serializer):
    rules = serializers.ListField(child=serializers.DictField())
