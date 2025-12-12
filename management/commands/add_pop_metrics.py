import csv

import os
from time import sleep

from django.core.management.base import BaseCommand, CommandError

from iaso.models.base import Account
from iaso.models.metric import MetricType, MetricValue
from plugins.snt_malaria.management.commands.support.legend import get_legend_config


class Command(BaseCommand):
    help = "Add population metrics to existing scenarios"

    def add_arguments(self, parser):
        parser.add_argument("--account-id", type=int, help="Account ID for importing metrics (required)")

    def handle(self, *args, **options):
        self.metric_type_scales = {}
        self.stdout.write(self.style.SUCCESS("Population metrics added to scenarios."))
        account_id = options.get("account_id")
        # Fetch Account instance
        try:
            account = Account.objects.get(id=account_id)
            self.account = account
            self.stdout.write(f"Using account: {account.name} (ID: {account.id})")
        except Account.DoesNotExist:
            raise CommandError(f"Account with ID {account_id} not found.")
        # sleep(10 * 60 * 60)
        if not account_id:
            self.stderr.write(self.style.ERROR("You must provide an account_id using --account_id"))
            return
        self.stdout.write(self.style.SUCCESS(f"Processing account_id: {account_id}"))

        # Load metric types from CSV
        metric_types = {}

        csv_path = os.path.join(
            os.path.dirname(__file__),
            "fixtures",
            "pop_dummy_metadata.csv",
        )
        csv_path = os.path.abspath(csv_path)

        with open(
            csv_path,
            newline="",
            encoding="utf-8",
        ) as metafile:
            metareader = csv.DictReader(metafile)
            for row in metareader:
                try:
                    metric_type = MetricType.objects.create(
                        account=account,
                        name=row["LABEL"],
                        code=row["VARIABLE"],
                        description=row["DESCRIPTION"],
                        source=row["SOURCE"],
                        units=row["UNITS"],
                        category=row["CATEGORY"],
                        unit_symbol=row["UNIT_SYMBOL"],
                        legend_type=row["TYPE"].lower(),
                    )
                    if metric_type.legend_type not in ["ordinal", "threshold", "linear"]:
                        self.stdout.write(
                            self.style.WARNING(
                                f"WARNING: Metric type for {metric_type.name} is '{metric_type.legend_type}', "
                                "should be one of 'ordinal', 'threshold', or 'linear'. Defaulting to 'threshold'."
                            )
                        )
                    else:
                        self.stdout.write(
                            f"Created metric type: {metric_type.name} with legend type: {metric_type.legend_type}"
                        )

                        self.metric_type_scales[metric_type.code] = row["SCALE"]
                        metric_types[metric_type.code] = metric_type
                except Exception as e:
                    self.stdout.write(f"ERROR: {e}")
                    self.stdout.write(f"ERROR: Error creating MetricType: {row['LABEL']}")

                # Get existing metric values for metric type POPULATION

        population_metric_type = MetricType.objects.filter(account=account, code="POPULATION").first()
        if population_metric_type:
            existing_metrics = MetricValue.objects.filter(
                metric_type=population_metric_type, metric_type__account=account
            )
            self.stdout.write(f"Found {existing_metrics.count()} existing metric values for POPULATION.")
        else:
            self.stdout.write(self.style.WARNING("No metric type with code 'POPULATION' was created or found."))

        if existing_metrics:
            for existing_metric in existing_metrics:
                for code, metric_type in metric_types.items():
                    try:
                        MetricValue.objects.create(
                            metric_type=metric_type,
                            org_unit=existing_metric.org_unit,
                            value=existing_metric.value * 0.05,
                        )
                        self.stdout.write(
                            f"Created MetricValue for org_unit {existing_metric.org_unit.id}, metric {metric_type.code}"
                        )
                    except Exception as e:
                        self.stdout.write(f"ERROR: {e}")
                        self.stdout.write(
                            f"ERROR: Error creating MetricValue for org_unit {existing_metric.org_unit.id}, "
                            f" metric {metric_type.code}"
                        )

        self._configure_legends()

        self.stdout.write(self.style.SUCCESS("Population metric types creation complete."))

    def _configure_legends(self):
        for metric_type in MetricType.objects.filter(account=self.account).filter(
            code__in=self.metric_type_scales.keys()
        ):
            metric_type.legend_config = get_legend_config(metric_type, self.metric_type_scales[metric_type.code])
            metric_type.save()
