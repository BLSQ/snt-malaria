from decimal import Decimal

from plugins.snt_malaria.models.cost_unit_type import CostUnitType
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


class CostUnitTypeModelTestCase(SNTMalariaTestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.user = self.create_snt_account(name="account")

    def _create(self, **kwargs):
        return CostUnitType.objects.create(account=self.account, name=kwargs.pop("name", "Unit"), **kwargs)

    def test_ratio_direct_returns_value(self):
        unit = self._create(value=Decimal("1.8"), invert_value=False)
        self.assertEqual(unit.ratio, Decimal("1.8"))

    def test_ratio_inverted_returns_reciprocal(self):
        unit = self._create(value=Decimal("90"), invert_value=True)
        self.assertAlmostEqual(unit.ratio, Decimal(1) / Decimal("90"))

    def test_ratio_none_value_returns_none(self):
        unit = self._create(value=None)
        self.assertIsNone(unit.ratio)

    def test_ratio_inverted_zero_value_returns_none(self):
        # Avoids a division by zero; the budget calculation falls back to a factor of 1.
        unit = self._create(value=Decimal("0"), invert_value=True)
        self.assertIsNone(unit.ratio)

    def test_ratio_direct_zero_value_returns_zero(self):
        unit = self._create(value=Decimal("0"), invert_value=False)
        self.assertEqual(unit.ratio, Decimal("0"))

    def test_non_proportional_unit_returns_ratio_of_one(self):
        # When the unit is not proportional the conversion factor is transparent to the outside:
        # ``ratio`` is always Decimal(1), regardless of the stored ``value`` / ``invert_value``.
        unit = self._create(value=Decimal("5"), invert_value=True, is_proportional=False)
        self.assertEqual(unit.ratio, Decimal(1))

    def test_non_proportional_unit_without_value_returns_one(self):
        unit = self._create(value=None, is_proportional=False)
        self.assertEqual(unit.ratio, Decimal(1))

    def test_default_is_proportional_true(self):
        unit = self._create(value=Decimal("1"))
        self.assertTrue(unit.is_proportional)
