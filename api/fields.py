from rest_framework import serializers


class CommaSeparatedIdsField(serializers.Field):
    default_error_messages = {"invalid": "Expected a comma-separated list of positive integers."}

    def to_internal_value(self, data):
        if not isinstance(data, str):
            self.fail("invalid")
        try:
            ids = [int(part) for part in data.split(",") if part.strip()]
        except ValueError:
            self.fail("invalid")
        if any(id_ <= 0 for id_ in ids):
            self.fail("invalid")
        return sorted(set(ids))

    def to_representation(self, value):
        return ",".join(str(id_) for id_ in value)
