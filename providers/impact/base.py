from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from iaso.models import OrgUnit
from plugins.snt_malaria.models import Intervention


@dataclass(frozen=True)
class OrgUnitRef:
    """Lightweight reference to an org unit (id + name)."""

    id: int
    name: str


@dataclass(frozen=True)
class ImpactProviderMeta:
    """Descriptor for an impact provider, attached to every impact response."""

    provider_key: str


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


@dataclass
class ImpactResult:
    """Typed result returned by ImpactProvider.match_impact.

    Metrics are wrapped in MetricWithCI to carry confidence interval bounds.
    """

    year: int
    population: float
    number_cases: ImpactMetricWithConfidenceInterval = field(default_factory=ImpactMetricWithConfidenceInterval)
    number_severe_cases: ImpactMetricWithConfidenceInterval = field(default_factory=ImpactMetricWithConfidenceInterval)
    prevalence_rate: ImpactMetricWithConfidenceInterval = field(default_factory=ImpactMetricWithConfidenceInterval)
    direct_deaths: ImpactMetricWithConfidenceInterval = field(default_factory=ImpactMetricWithConfidenceInterval)


@dataclass
class MatchWarnings:
    """Warnings produced during impact matching.

    org_units_not_found: org units whose reference does not exist in the
        impact database at all.
    org_units_with_unmatched_interventions: org units that exist in the
        impact database but have no data for their assigned intervention
        combination.
    """

    org_units_not_found: list[OrgUnitRef] = field(default_factory=list)
    org_units_with_unmatched_interventions: list[OrgUnitRef] = field(default_factory=list)


@dataclass
class MatchResult:
    """Return type for ImpactProvider.match_impact (single org unit).

    results: impact data rows for the queried org unit.
    warnings: any matching issues encountered during lookup.
    """

    results: list[ImpactResult] = field(default_factory=list)
    warnings: MatchWarnings = field(default_factory=MatchWarnings)


@dataclass
class BulkMatchResult:
    """Return type for ImpactProvider.match_impact_bulk (multiple org units).

    results: dict keyed by org_unit.id -> list of ImpactResult (one per year).
    warnings: any matching issues encountered during lookup.
    """

    results: dict[int, list[ImpactResult]] = field(default_factory=dict)
    warnings: MatchWarnings = field(default_factory=MatchWarnings)


class ImpactProviderError(Exception):
    """Base exception for all impact provider errors."""


class IncompleteConfigError(ImpactProviderError):
    """Raised when a provider's configuration is missing required fields."""


class InterventionMappingError(ImpactProviderError):
    """Raised when an intervention's impact_ref cannot be resolved by the provider."""


class DataIntegrityError(ImpactProviderError):
    """Raised when the external impact database contains conflicting or invalid data."""


class OrgUnitMappingError(ImpactProviderError):
    """Raised when requested org units cannot be found in the external impact database."""


class ImpactProvider(ABC):
    """Abstract base class for impact data providers.

    Each provider connects to a specific external impact data source
    and normalizes the data to a common format consumed by the API views.
    The ABC speaks in Iaso domain objects (OrgUnit, Intervention); each
    concrete provider handles its own internal translation (name mapping,
    intervention mapping, query building) as a private concern.

    Contract: implementations must return at most one ImpactResult per year
    and raise DataIntegrityError if their data source contains duplicates.
    """

    # Subclasses must override with their own ImpactProviderMeta instance.
    meta: ImpactProviderMeta = ImpactProviderMeta(provider_key="")

    def __init__(self, config_id: int, config: dict, secret: str):
        self.config_id = config_id
        self.config = config
        self.secret = secret

    def get_meta(self) -> ImpactProviderMeta:
        """Provider metadata attached to every impact response."""
        return self.meta

    @staticmethod
    def _impact_reference(org_unit: OrgUnit) -> str:
        """Return the impact reference for an org_unit.

        Uses the ImpactOrgUnitMapping when present (expects the relation to
        be prefetched via select_related), otherwise falls back to
        org_unit.name.
        """
        mapping = getattr(org_unit, "impact_mapping", None)
        return mapping.reference if mapping else org_unit.name

    @abstractmethod
    def match_impact(
        self,
        org_unit: OrgUnit,
        interventions: list[Intervention],
        age_group: str,
        year_from: int | None = None,
        year_to: int | None = None,
    ) -> MatchResult:
        """Match impact data for a single org unit and set of interventions.

        Args:
            org_unit: The Iaso OrgUnit to match against the provider's admin data.
            interventions: List of Iaso Intervention instances deployed in this org unit.
            age_group: Provider-specific age group filter (e.g. "under5", "allAges").
            year_from: Start year filter (inclusive), or None.
            year_to: End year filter (inclusive), or None.

        Returns:
            MatchResult containing impact data and any matching warnings.
            Implementations must ensure year uniqueness and raise
            DataIntegrityError on duplicates.
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
        year_from: int | None = None,
        year_to: int | None = None,
    ) -> BulkMatchResult:
        """Fetch impact data for multiple org units sharing the same interventions.

        Default: raises NotImplementedError. Providers that support bulk queries
        should override both this method and the supports_bulk property.

        Returns:
            BulkMatchResult containing impact data keyed by org_unit.id and
            any matching warnings.
        """
        raise NotImplementedError(
            f"{type(self).__name__} does not support bulk queries. Check supports_bulk before calling."
        )

    @abstractmethod
    def get_year_range(self) -> tuple[int | None, int | None]:
        """Return (min_year, max_year) tuple from the provider's data."""

    @abstractmethod
    def get_age_groups(self) -> list[str]:
        """Return a sorted list of age group labels."""
