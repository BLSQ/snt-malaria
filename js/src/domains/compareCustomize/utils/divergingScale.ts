import { green, grey, red } from '@mui/material/colors';
import type { IntlShape } from 'react-intl';
import { BudgetCalculationResponse } from '../../planning/types/budget';

/**
 * Minimal slice of `IntlShape` used by the diverging-scale utilities.
 * Lets callers pass either react-intl's strict `IntlShape` or
 * bluesquare-components' `useSafeIntl()` result (which has a wider
 * `formatMessage` signature and is therefore not assignable to
 * `IntlShape` directly).
 */
type IntlFormatter = Pick<IntlShape, 'formatNumber'>;

import {
    IMPACT_METRIC_KEYS,
    ImpactMetricKey,
    MetricKey,
    OrgUnitImpactMetrics,
    ScenarioImpactMetrics,
} from '../types';
import { hexToRgb } from './colors';
import { computeOrgUnitCumulativeCostDeltas } from './impactCalculations';
import { MetricConfig } from './metricConfig';

const COLOR_RED = red[500];
const COLOR_GREEN = green[500];
const COLOR_NEUTRAL = grey[400];

/**
 * Continuous color gradient over a numeric domain.
 *
 * Three layouts are produced from the data:
 *  - Empty / all sub-precision: a single neutral stop, `isVisible: false`.
 *  - One-sided (all ≥ 0 or all ≤ 0): three stops with a midpoint label
 *    (`[0, max/2, max]` or `[min, min/2, 0]`), grey at the zero side,
 *    saturated color at the extreme.
 *  - Mixed signs: five stops `[-absMax, -absMax/2, 0, +absMax/2, +absMax]`
 *    (symmetric mirror) so zero sits at the visual center of the gradient
 *    bar, with negative color at the left, positive color at the right,
 *    and quarter-bar shades for both directions.
 *
 * Adding the midpoint stops doesn't change cell colors: a piecewise-linear
 * interpolation through the average of two endpoints is identical to the
 * direct interpolation between them. The stops only exist so the legend
 * can render quarter-bar tick labels.
 *
 * `domainLabels` are the formatted strings to render under each stop;
 * the legend renderer treats each entry as opaque and lays them out at
 * 0%, ..., 100% via `justify-content: space-between`.
 */
export type DivergingScale = {
    domain: number[];
    range: string[];
    domainLabels: string[];
    isVisible: boolean;
};

type Formatter = (value: number) => string;

const makeFormatter = (
    intl: IntlFormatter,
    config: MetricConfig,
): Formatter => {
    const opts = { ...config.format, signDisplay: 'exceptZero' as const };
    return v => intl.formatNumber(v, opts);
};

/**
 * True when the formatted value is distinct from a formatted zero. Compares
 * strings produced by the same `Intl.NumberFormat` so locale, percent style,
 * currency, sign rules, and rounding precision are all handled by the platform.
 */
const isVisibleAtPrecision = (fmt: Formatter, v: number): boolean =>
    fmt(v) !== fmt(0);

/**
 * Linearly interpolates between two hex colors.
 * `t` is clamped to [0, 1] where 0 returns `colorA` and 1 returns `colorB`.
 */
export const interpolateColor = (
    colorA: string,
    colorB: string,
    t: number,
): string => {
    const a = hexToRgb(colorA);
    const b = hexToRgb(colorB);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    const toHex = (v: number) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
};

/**
 * Builds a diverging color gradient for a metric's deltas.
 *
 * Filters the input through {@link isVisibleAtPrecision} (so noise below
 * display precision doesn't influence the range), then picks a layout
 * from the surviving extremes. Color direction comes from
 * `config.positiveIsGreen`: when true, positive is green (improvement)
 * and negative is red; otherwise the reverse (the default for "lower is
 * better" metrics).
 */
export const buildDivergingScale = (
    intl: IntlFormatter,
    config: MetricConfig,
    rawDeltas: Iterable<number>,
): DivergingScale => {
    const fmt = makeFormatter(intl, config);
    const visible: number[] = [];
    for (const v of rawDeltas) {
        if (isVisibleAtPrecision(fmt, v)) visible.push(v);
    }
    if (visible.length === 0) {
        return {
            domain: [0],
            range: [COLOR_NEUTRAL],
            domainLabels: [fmt(0)],
            isVisible: false,
        };
    }

    const min = Math.min(...visible);
    const max = Math.max(...visible);
    const positiveColor = config.positiveIsGreen ? COLOR_GREEN : COLOR_RED;
    const negativeColor = config.positiveIsGreen ? COLOR_RED : COLOR_GREEN;
    const midColor = (a: string, b: string) => interpolateColor(a, b, 0.5);

    if (min >= 0) {
        const half = max / 2;
        return {
            domain: [0, half, max],
            range: [
                COLOR_NEUTRAL,
                midColor(COLOR_NEUTRAL, positiveColor),
                positiveColor,
            ],
            domainLabels: [fmt(0), fmt(half), fmt(max)],
            isVisible: true,
        };
    }
    if (max <= 0) {
        const half = min / 2;
        return {
            domain: [min, half, 0],
            range: [
                negativeColor,
                midColor(negativeColor, COLOR_NEUTRAL),
                COLOR_NEUTRAL,
            ],
            domainLabels: [fmt(min), fmt(half), fmt(0)],
            isVisible: true,
        };
    }
    // Mixed signs → symmetric mirror so zero anchors the visual center.
    const absMax = Math.max(Math.abs(min), Math.abs(max));
    const halfAbs = absMax / 2;
    return {
        domain: [-absMax, -halfAbs, 0, halfAbs, absMax],
        range: [
            negativeColor,
            midColor(negativeColor, COLOR_NEUTRAL),
            COLOR_NEUTRAL,
            midColor(COLOR_NEUTRAL, positiveColor),
            positiveColor,
        ],
        domainLabels: [
            fmt(-absMax),
            fmt(-halfAbs),
            fmt(0),
            fmt(halfAbs),
            fmt(absMax),
        ],
        isVisible: true,
    };
};

/**
 * Continuous piecewise-linear color sampler over `domain` / `range`.
 *
 * For values outside the domain, the nearest endpoint color is returned
 * (clamped). For values inside, the color is interpolated within the
 * surrounding segment via {@link interpolateColor}. With three stops
 * (the diverging mixed-sign case), values on either side of zero pull
 * toward the zero-side neutral grey at the right rate.
 */
export const getColorForValue = (
    value: number,
    domain: number[],
    range: string[],
): string => {
    if (domain.length === 0 || range.length === 0) return COLOR_NEUTRAL;
    if (domain.length === 1) return range[0];
    if (value <= domain[0]) return range[0];
    for (let i = 0; i < domain.length - 1; i++) {
        if (value <= domain[i + 1]) {
            const span = domain[i + 1] - domain[i];
            const t = span === 0 ? 0 : (value - domain[i]) / span;
            return interpolateColor(range[i], range[i + 1], t);
        }
    }
    return range[range.length - 1];
};

/**
 * Returns the rendering pieces for one map cell: a fill color (or
 * `undefined` when the cell should fall through to the map's default
 * color) and a tooltip label.
 *
 * Three cases:
 *  - delta is `undefined` (org unit missing on one side): no color, no label.
 *  - delta is below display precision: no color, label is the formatted zero
 *    (so the user still sees the delta exists but rounds to zero).
 *  - delta is visible: continuous color sampled from `scale`, signed label.
 */
export const getDeltaCell = (
    intl: IntlFormatter,
    config: MetricConfig,
    rawDelta: number | undefined,
    scale: DivergingScale,
): { color: string | undefined; label: string | undefined } => {
    if (rawDelta === undefined) {
        return { color: undefined, label: undefined };
    }
    const fmt = makeFormatter(intl, config);
    const label = fmt(rawDelta);
    if (!isVisibleAtPrecision(fmt, rawDelta)) {
        return { color: undefined, label };
    }
    const color = getColorForValue(rawDelta, scale.domain, scale.range);
    return { color, label };
};

/**
 * Computes comparison minus baseline for one impact field on org units
 * present in both scenarios with non-null values.
 */
export const computeOrgUnitImpactMetricDeltas = (
    baselineImpact: ScenarioImpactMetrics,
    comparisonImpact: ScenarioImpactMetrics,
    metricKey: ImpactMetricKey,
): Map<number, number> => {
    const deltas = new Map<number, number>();
    const baselineByOu = new Map<number, OrgUnitImpactMetrics>(
        baselineImpact.org_units.map(ou => [ou.org_unit_id, ou]),
    );

    for (const comparisonOu of comparisonImpact.org_units) {
        const baselineOu = baselineByOu.get(comparisonOu.org_unit_id);
        const comparisonValue = comparisonOu[metricKey]?.value;
        const baselineValue = baselineOu?.[metricKey]?.value;
        if (comparisonValue != null && baselineValue != null) {
            deltas.set(
                comparisonOu.org_unit_id,
                comparisonValue - baselineValue,
            );
        }
    }
    return deltas;
};

/**
 * Returns the metrics that have data on at least one loaded scenario.
 *
 * Impact metrics are checked against scenario-level aggregates (null when
 * no breakdown row contributed). The cost metric is checked by probing
 * `budget.results[].org_units_costs` directly — same source the cost
 * delta reads from in {@link computeOrgUnitImpactDifferenceDeltas}.
 * Scenarios still loading are skipped.
 */
export const getAvailableMetrics = (
    impactsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>,
    budgetsByScenarioId: Map<number, BudgetCalculationResponse | undefined>,
): Set<MetricKey> => {
    const available = new Set<MetricKey>();

    for (const impact of impactsByScenarioId.values()) {
        if (!impact) continue;
        for (const key of IMPACT_METRIC_KEYS) {
            if (impact[key]?.value != null) available.add(key);
        }
    }

    for (const budget of budgetsByScenarioId.values()) {
        const hasOrgUnitCosts =
            budget?.results?.some(r => (r.org_units_costs?.length ?? 0) > 0) ??
            false;
        if (hasOrgUnitCosts) {
            available.add(MetricKey.OrgUnitTotalCost);
        }
    }

    return available;
};

/**
 * Per-org-unit deltas for one baseline-vs-comparison pair, dispatched by
 * metric: impact metrics come from the impact payloads, the cost metric
 * from cumulative budget results.
 */
export const computeOrgUnitImpactDifferenceDeltas = (
    metric: MetricKey,
    baselineImpact: ScenarioImpactMetrics | undefined,
    comparisonImpact: ScenarioImpactMetrics | undefined,
    baselineBudget: BudgetCalculationResponse | undefined,
    comparisonBudget: BudgetCalculationResponse | undefined,
): Map<number, number> => {
    if (metric === MetricKey.OrgUnitTotalCost) {
        return computeOrgUnitCumulativeCostDeltas(
            baselineBudget,
            comparisonBudget,
        );
    }
    if (!baselineImpact || !comparisonImpact) {
        return new Map();
    }
    return computeOrgUnitImpactMetricDeltas(
        baselineImpact,
        comparisonImpact,
        metric,
    );
};
