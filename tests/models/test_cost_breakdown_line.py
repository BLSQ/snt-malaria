from decimal import Decimal

from plugins.snt_malaria.models import InterventionCostBreakdownLine
from plugins.snt_malaria.models.cost_unit_type import CostUnitType
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


class InterventionCostBreakdownLineModelTestCase(SNTMalariaTestCase):
    def setUp(self):
        super().setUp()
        self.intervention = self.create_snt_intervention()
        self.unit_type = CostUnitType.objects.create(account=self.account, name="Unit")

    def _create(self, **kwargs):
        return InterventionCostBreakdownLine.objects.create(
            intervention=self.intervention,
            name=kwargs.pop("name", "Cost Line"),
            unit_type=self.unit_type,
            **kwargs,
        )

    def test_conversion_ratio_direct_returns_factor(self):
        line = self._create(is_proportional=True, conversion_factor=Decimal("1.8"))
        self.assertEqual(line.conversion_ratio, Decimal("1.8"))

    def test_conversion_ratio_inverted_returns_reciprocal(self):
        line = self._create(is_proportional=True, conversion_factor=Decimal("90"), invert_conversion_factor=True)
        self.assertAlmostEqual(line.conversion_ratio, Decimal(1) / Decimal("90"))

    def test_conversion_ratio_zero_factor_returns_one(self):
        # Avoids a division by zero on inverted factors.
        line = self._create(is_proportional=True, conversion_factor=Decimal("0"), invert_conversion_factor=True)
        self.assertEqual(line.conversion_ratio, Decimal(1))
        line = self._create(name="Direct zero", is_proportional=True, conversion_factor=Decimal("0"))
        self.assertEqual(line.conversion_ratio, Decimal(1))

    def test_conversion_ratio_none_factor_returns_one(self):
        # The column is not nullable, but an unsaved instance can hold None.
        line = InterventionCostBreakdownLine(is_proportional=True, conversion_factor=None)
        self.assertEqual(line.conversion_ratio, Decimal(1))

    def test_conversion_ratio_fixed_line_returns_one(self):
        line = self._create(is_proportional=False, conversion_factor=Decimal("5"), invert_conversion_factor=True)
        self.assertEqual(line.conversion_ratio, Decimal(1))

    def test_defaults_to_fixed_cost(self):
        line = self._create()
        self.assertFalse(line.is_proportional)
        self.assertEqual(line.conversion_factor, Decimal("1"))
        self.assertFalse(line.invert_conversion_factor)
