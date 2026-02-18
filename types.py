from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class MetricWithCI:
    """A metric value with optional confidence interval bounds."""

    value: Optional[float] = None
    lower: Optional[float] = None
    upper: Optional[float] = None

    def __add__(self, other: MetricWithCI) -> MetricWithCI:
        """Component-wise addition. None means 'no contribution'."""

        def _add(a: Optional[float], b: Optional[float]) -> Optional[float]:
            if a is None and b is None:
                return None
            return (a or 0) + (b or 0)

        return MetricWithCI(
            value=_add(self.value, other.value),
            lower=_add(self.lower, other.lower),
            upper=_add(self.upper, other.upper),
        )

    def __truediv__(self, divisor: int | float) -> MetricWithCI:
        """Component-wise division by a scalar."""
        if divisor == 0:
            return MetricWithCI()
        return MetricWithCI(
            value=self.value / divisor if self.value is not None else None,
            lower=self.lower / divisor if self.lower is not None else None,
            upper=self.upper / divisor if self.upper is not None else None,
        )
