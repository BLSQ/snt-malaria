from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from plugins.snt_malaria.api.account_setup.permissions import SNTAccountSetupPermission
from plugins.snt_malaria.api.account_setup.serializers import SNTAccountSetupSerializer
from plugins.snt_malaria.api.account_setup.utils import create_snt_account, transform_geo_json_to_gpkg
from plugins.snt_malaria.models import SNTAccountSetup


class SNTAccountSetupViewSet(viewsets.ModelViewSet):
    serializer_class = SNTAccountSetupSerializer
    http_method_names = ["post", "head", "options"]
    permission_classes = [SNTAccountSetupPermission]

    def get_queryset(self):
        return SNTAccountSetup.objects.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            try:
                account_setup = create_snt_account(
                    username=data["username"],
                    password=data["password"],
                    country=data["country"],
                    language=data.get("language"),
                    geo_json_file=data["geo_json_file"],
                )
            except ValidationError as e:
                return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

            transform_geo_json_to_gpkg(account_setup)

        return Response(status=status.HTTP_201_CREATED)

        # start gpkg import task
