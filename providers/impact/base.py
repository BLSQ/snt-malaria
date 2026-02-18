from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

from iaso.models import OrgUnit
from plugins.snt_malaria.models import Intervention
from plugins.snt_malaria.types import MetricWithCI


@dataclass
class ImpactResult:
    """Typed result returned by ImpactProvider.match_impact.

    Metrics are wrapped in MetricWithCI to carry confidence interval bounds.
    """

    year: int
    population: float
    number_cases: MetricWithCI = field(default_factory=MetricWithCI)
    number_severe_cases: MetricWithCI = field(default_factory=MetricWithCI)
    prevalence_rate: MetricWithCI = field(default_factory=MetricWithCI)
    direct_deaths: MetricWithCI = field(default_factory=MetricWithCI)


class ImpactProvider(ABC):
    """Abstract base class for impact data providers.

    Each provider connects to a specific external impact data source
    and normalizes the data to a common format consumed by the API views.
    The ABC speaks in Iaso domain objects (OrgUnit, Intervention); each
    concrete provider handles its own internal translation (name mapping,
    intervention mapping, query building) as a private concern.

    Contract: implementations must return at most one ImpactResult per year
    and raise ValueError if their data source contains duplicates.
    """

    @abstractmethod
    def match_impact(
        self,
        org_unit: OrgUnit,
        interventions: list[Intervention],
        age_group: str,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
    ) -> list[ImpactResult]:
        """Match impact data for a single org unit and set of interventions.

        Args:
            org_unit: The Iaso OrgUnit to match against the provider's admin data.
            interventions: List of Iaso Intervention instances deployed in this org unit.
            age_group: Provider-specific age group filter (e.g. "under5", "allAges").
            year_from: Start year filter (inclusive), or None.
            year_to: End year filter (inclusive), or None.

        Returns:
            List of ImpactResult instances, one per year. Implementations must
            ensure year uniqueness and raise ValueError on duplicates.
        """

    @property
    def supports_bulk(self) -> bool:
        """Whether this provider supports batch queries via match_impact_bulk.

        Providers that override match_impact_bulk should return True.
        The service layer uses this to decide between bulk and per-org-unit calls.
        """
        return False

    def match_impact_bulk(
        self,
        org_units: list[OrgUnit],
        interventions: list[Intervention],
        age_group: str,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
    ) -> dict[int, list[ImpactResult]]:
        """Fetch impact data for multiple org units sharing the same interventions.

        Default: raises NotImplementedError. Providers that support bulk queries
        should override both this method and the supports_bulk property.

        Returns:
            Dict keyed by org_unit.id -> list of ImpactResult (one per year).
        """
        raise NotImplementedError(
            f"{type(self).__name__} does not support bulk queries. "
            f"Check supports_bulk before calling."
        )

    @abstractmethod
    def get_year_range(self) -> tuple[Optional[int], Optional[int]]:
        """Return (min_year, max_year) tuple from the provider's data."""

    @abstractmethod
    def get_age_groups(self) -> list[str]:
        """Return a sorted list of age group labels."""
