from decimal import Decimal

from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from plugins.snt_malaria.models.intervention import Intervention


MAX_COVERAGE_PERCENTAGE = Decimal("100")


def compute_conversion_ratio(is_proportional, conversion_factor, invert_conversion_factor):
    """Canonical conversion factor used by the budget calculation (1 / value when inverted).

    Fixed cost lines and degenerate factors (missing or 0) always return 1.
    """
    if not is_proportional or not conversion_factor:
        return Decimal(1)
    if invert_conversion_factor:
        return Decimal(1) / conversion_factor
    return conversion_factor


class InterventionCostBreakdownLine(models.Model):
    class InterventionCostBreakdownLineCategory(models.TextChoices):
        PROCUREMENT = "Procurement", _("Procurement")
        DELIVERY = "Distribution", _("Distribution")
        OPERATIONAL = "Operational", _("Operational")
        SUPPORTIVE = "Supportive", _("Supportive")
        OTHER = "Other", _("Other")

    class Meta:
        app_label = "snt_malaria"

    intervention = models.ForeignKey(Intervention, on_delete=models.CASCADE, related_name="cost_breakdown_lines")
    name = models.TextField(max_length=255, blank=False)
    category = models.CharField(
        max_length=40,
        choices=InterventionCostBreakdownLineCategory.choices,
        default=InterventionCostBreakdownLineCategory.OTHER,
    )
    unit_type = models.ForeignKey(
        "snt_malaria.CostUnitType",
        on_delete=models.PROTECT,
        related_name="cost_breakdown_lines",
    )
    population_layer = models.ForeignKey(
        "iaso.MetricType",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="cost_breakdown_lines",
    )
    unit_cost = models.DecimalField(max_digits=19, decimal_places=2, null=False, blank=False, default=0)
    # When False, the line is an absolute / fixed cost: the conversion factor is ignored and no
    # population layer applies.
    is_proportional = models.BooleanField(default=False)
    # Raw number entered by the user; interpreted via ``invert_conversion_factor`` to produce
    # ``conversion_ratio``.
    conversion_factor = models.DecimalField(max_digits=19, decimal_places=6, default=Decimal("1"))
    # When True, ``conversion_factor`` is inverted (1 / value) to get the canonical ratio.
    invert_conversion_factor = models.BooleanField(default=False)
    # Proportional lines: percentage (0-100) of the population layer reached. Fixed lines: the
    # quantity costed per year. See ``default_coverage``.
    coverage = models.DecimalField(
        max_digits=19,
        decimal_places=2,
        default=Decimal("100"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    # Percentage over-ordering added to the quantity (10 means x1.10). Null falls back to the
    # account's budget settings buffer.
    buffer = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0"))],
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cost_breakdown_line_created_set"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cost_breakdown_line_updated_set"
    )
    updated_at = models.DateTimeField(auto_now=True)

    @staticmethod
    def default_coverage(is_proportional):
        return MAX_COVERAGE_PERCENTAGE if is_proportional else Decimal("1")

    @property
    def conversion_ratio(self):
        return compute_conversion_ratio(self.is_proportional, self.conversion_factor, self.invert_conversion_factor)
