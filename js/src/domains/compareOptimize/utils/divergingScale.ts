import { green, grey, red } from '@mui/material/colors';
import { formatBigNumber } from '../../planning/libs/cost-utils';
import { OrgUnitImpactMetrics, ScenarioImpactMetrics } from '../types';
import { hexToRgb } from './colors';

const COLOR_RED = red[500];
const COLOR_GREEN = green[500];
const COLOR_NEUTRAL = grey[400];

export type DivergingScale = {
    thresholds: number[];
    colors: string[];
    labels: string[];
};

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
 * Builds a symmetric diverging color scale around zero.
 *
 * Negative values interpolate from neutral (grey) toward green (improvement),
 * positive values from neutral toward red (worsening).
 * Returns evenly spaced thresholds, one color per bucket, and
 * human-readable labels for each bucket.
 */
export const buildDivergingScale = (
    minDelta: number,
    maxDelta: number,
    bucketCount = 7,
): DivergingScale => {
    const absMax = Math.max(Math.abs(minDelta), Math.abs(maxDelta));
    if (absMax === 0) {
        return {
            thresholds: [],
            colors: [COLOR_NEUTRAL],
            labels: ['0'],
        };
    }

    const halfBuckets = Math.floor(bucketCount / 2);
    const step = absMax / halfBuckets;

    const thresholds: number[] = [];
    for (let i = -halfBuckets; i <= halfBuckets; i++) {
        thresholds.push(i * step);
    }

    const colors: string[] = [];
    const labels: string[] = [];
    for (let i = 0; i < thresholds.length - 1; i++) {
        const lo = thresholds[i];
        const hi = thresholds[i + 1];
        const center = (lo + hi) / 2;
        let color: string;
        if (center < 0) {
            const t = Math.abs(center) / absMax;
            color = interpolateColor(COLOR_NEUTRAL, COLOR_GREEN, t);
        } else if (center > 0) {
            const t = center / absMax;
            color = interpolateColor(COLOR_NEUTRAL, COLOR_RED, t);
        } else {
            color = COLOR_NEUTRAL;
        }
        colors.push(color);

        const prefix = lo >= 0 ? '+' : '';
        const prefixHi = hi >= 0 ? '+' : '';
        labels.push(
            `${prefix}${formatBigNumber(Math.round(lo))}-${prefixHi}${formatBigNumber(Math.round(hi))}`,
        );
    }

    return { thresholds, colors, labels };
};

/**
 * Returns the bucket color for a given numeric value.
 * Values below the lowest threshold get the first color;
 * values at or above the highest threshold get the last.
 */
export const getColorForValue = (
    value: number,
    thresholds: number[],
    colors: string[],
): string => {
    for (let i = 0; i < thresholds.length - 1; i++) {
        if (value >= thresholds[i] && value < thresholds[i + 1]) {
            return colors[i];
        }
    }
    if (value >= thresholds[thresholds.length - 1]) {
        return colors[colors.length - 1];
    }
    return colors[0];
};

/**
 * Computes per-org-unit direct-death deltas between a comparison
 * and a baseline scenario: `comparison.direct_deaths - baseline.direct_deaths`.
 * Returns a Map of orgUnitId -> delta.
 */
export const computeOrgUnitDeltas = (
    baselineImpact: ScenarioImpactMetrics,
    comparisonImpact: ScenarioImpactMetrics,
): Map<number, number> => {
    const map = new Map<number, number>();
    const baselineByOu = new Map<number, OrgUnitImpactMetrics>(
        baselineImpact.org_units.map(ou => [ou.org_unit_id, ou]),
    );

    for (const compOu of comparisonImpact.org_units) {
        const baseOu = baselineByOu.get(compOu.org_unit_id);
        if (
            baseOu &&
            compOu.direct_deaths?.value != null &&
            baseOu.direct_deaths?.value != null
        ) {
            map.set(
                compOu.org_unit_id,
                compOu.direct_deaths.value - baseOu.direct_deaths.value,
            );
        }
    }
    return map;
};
