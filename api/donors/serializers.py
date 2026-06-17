from rest_framework import serializers

from plugins.snt_malaria.models import Donor


class DonorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donor
        fields = ["id", "name"]
        read_only_fields = ["id"]
