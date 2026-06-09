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
