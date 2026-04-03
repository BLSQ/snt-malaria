from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from iaso.api.tasks.serializers import TaskSerializer
from iaso.models import ImportGPKG, Profile, Task
from iaso.tasks.import_gpkg_task import import_gpkg_task
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

        try:
            with transaction.atomic():
                account_setup = create_snt_account(
                    username=data["username"],
                    password=data["password"],
                    country=data["country"],
                    language=data.get("language"),
                    geo_json_file=data["geo_json_file"],
                )
                transform_geo_json_to_gpkg(account_setup)
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(str(e), status=status.HTTP_400_BAD_REQUEST)

        # start gpkg import task here
        import_gpkg = ImportGPKG.objects.create(
            file=account_setup.gpkg_file,
            data_source=account_setup.account.default_version.data_source,
            version_number=1,
            description=data["country"],
            default_valid=True,
        )

        user_profile = Profile.objects.get(account=account_setup.account)
        task: Task = import_gpkg_task(
            import_gpkg_id=import_gpkg.id,
            user=user_profile.user,
        )

        # We return a different serializer than created
        return Response(
            {"task": TaskSerializer(instance=task).data},
            status=status.HTTP_201_CREATED,
        )
