import json

import django.core.exceptions as django_exceptions

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from plugins.snt_malaria.api.account_setup.utils import REQUIRED_GEO_JSON_LABELS
from plugins.snt_malaria.models import SNTAccountSetup


class SNTAccountSetupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    password_confirmation = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = SNTAccountSetup
        fields = [
            "username",
            "country",
            "language",
            "geo_json_file",
            "password",
            "password_confirmation",
        ]

    def validate_username(self, value):
        existing_username = User.objects.filter(username__iexact=value).exists()
        if existing_username:
            raise serializers.ValidationError("Username already exists")
        return value

    def validate_geo_json_file(self, value):
        file_name = value.name
        if not file_name.endswith(".json") and not file_name.endswith(".geojson"):
            raise serializers.ValidationError("GeoJSON file must end with '.json' or '.geojson'")

        # Checking now if each location has the required fields
        data = json.loads(value.read())
        if "features" not in data:
            raise serializers.ValidationError("GeoJSON file must contain 'features' key")

        first_location = data["features"][0]
        missing_fields = []
        for field in REQUIRED_GEO_JSON_LABELS:
            if field not in first_location["properties"]:
                missing_fields.append(field)

        if missing_fields:
            raise serializers.ValidationError(
                f"Locations in the GeoJSON file lack required properties: {missing_fields}"
            )

        return value

    def validate(self, data):
        password = data["password"]
        password_confirmation = data["password_confirmation"]

        if password != password_confirmation:
            raise serializers.ValidationError("Passwords do not match")

        user = User(username=data["username"])
        try:
            validate_password(password=password, user=user)
        except django_exceptions.ValidationError as e:
            raise serializers.ValidationError({"password": e.messages})

        return data
