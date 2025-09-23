from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from iaso.api.common import UserSerializer
from plugins.snt_malaria.models import Scenario


class ScenarioSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Scenario
        fields = [
            "id",
            "created_by",
            "name",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        if not value:
            raise serializers.ValidationError(_("Name cannot be empty."))

        existingScenarios = Scenario.objects.filter(
            name=value, account=self.context["request"].user.iaso_profile.account
        )

        if existingScenarios.exists():
            raise serializers.ValidationError(_("Scenario with this name already exists."))

        return value


class DuplicateScenarioSerializer(serializers.Serializer):
    id_to_duplicate = serializers.IntegerField()

    def validate_id_to_duplicate(self, value):
        request = self.context.get("request")
        account = request.user.iaso_profile.account

        if not Scenario.objects.filter(id=value, account=account).exists():
            raise serializers.ValidationError(_("Scenario with this ID does not exist."))

        return value
