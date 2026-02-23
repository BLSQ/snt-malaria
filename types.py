from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ImpactMetricWithConfidenceInterval:
    """A metric value with optional confidence interval bounds."""

    value: float | None = None
    lower: float | None = None
    upper: float | None = None

    def __add__(self, other: ImpactMetricWithConfidenceInterval) -> ImpactMetricWithConfidenceInterval:
        """Component-wise addition. None means 'no contribution'."""

        def _add(a: float | None, b: float | None) -> float | None:
            if a is None and b is None:
                return None
            return (a or 0) + (b or 0)

        return ImpactMetricWithConfidenceInterval(
            value=_add(self.value, other.value),
            lower=_add(self.lower, other.lower),
            upper=_add(self.upper, other.upper),
        )

    def __truediv__(self, divisor: int | float) -> ImpactMetricWithConfidenceInterval:
        """Component-wise division by a scalar."""
        if divisor == 0:
            return ImpactMetricWithConfidenceInterval()
        return ImpactMetricWithConfidenceInterval(
            value=self.value / divisor if self.value is not None else None,
            lower=self.lower / divisor if self.lower is not None else None,
            upper=self.upper / divisor if self.upper is not None else None,
        )
