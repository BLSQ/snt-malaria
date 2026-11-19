from rest_framework import serializers

from iaso.api.common.serializer_fields import CommaSeparatedListField


class BudgetQuerySerializer(serializers.Serializer):
    org_unit_ids = CommaSeparatedListField(child=serializers.IntegerField(min_value=1), required=False, default=None)
