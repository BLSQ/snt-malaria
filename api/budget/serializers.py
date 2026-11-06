from rest_framework import serializers

from plugins.snt_malaria.api.fields import CommaSeparatedIdsField


class BudgetQuerySerializer(serializers.Serializer):
    org_unit_ids = CommaSeparatedIdsField(required=False, default=None)
