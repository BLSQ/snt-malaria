import { blueGrey } from '@mui/material/colors';
import { alpha, darken } from '@mui/material/styles';
import { theme } from '../../../constants/theme';

export const SCENARIO_BASE_COLORS = ['#FFC107', '#673AB7', '#3D74FF'] as const;
export const NO_INTERVENTION_COLOR = blueGrey[200];

type TagColors = { background: string; text: string };

const SCENARIO_TAG_COLORS: Record<string, TagColors> = {
    '#FFC107': { background: '#FEF1D3', text: '#7A5300' },
    '#673AB7': {
        background: theme.palette.primary.light,
        text: theme.palette.primary.main,
    },
    '#3D74FF': { background: '#E5ECFF', text: '#2A57CC' },
};

/** Light background and readable text for chips in a scenario's colour. */
export const getScenarioTagColors = (color: string): TagColors =>
    SCENARIO_TAG_COLORS[color.toUpperCase()] ?? {
        background: alpha(color, 0.16),
        text: darken(color, 0.45),
    };

const clamp = (value: number, min = 0, max = 1) =>
    Math.min(Math.max(value, min), max);

export const hexToRgb = (hex: string) => {
    const normalized = hex.replace('#', '');
    const expanded =
        normalized.length === 3
            ? normalized
                  .split('')
                  .map(v => v + v)
                  .join('')
            : normalized;
    const num = parseInt(expanded, 16);
    return {
        // eslint-disable-next-line no-bitwise
        r: (num >> 16) & 255,
        // eslint-disable-next-line no-bitwise
        g: (num >> 8) & 255,
        // eslint-disable-next-line no-bitwise
        b: num & 255,
    };
};

const mixWithWhite = (hex: string, amount: number) => {
    const ratio = clamp(amount);
    const { r, g, b } = hexToRgb(hex);
    const rr = Math.round(r + (255 - r) * ratio);
    const gg = Math.round(g + (255 - g) * ratio);
    const bb = Math.round(b + (255 - b) * ratio);
    return `rgb(${rr}, ${gg}, ${bb})`;
};

export const getScenarioColor = (index: number) =>
    SCENARIO_BASE_COLORS[index] ?? SCENARIO_BASE_COLORS[0];

/**
 * Generate evenly spaced shades from a base color by mixing with white.
 * The first entry is the strongest (base color), and subsequent entries
 * are progressively lighter based on the number of intervention groups.
 * Note: We do not use alpha transparency in blending; all shades are solid colors.
 * This ensures the shades appear consistent and clear against different backgrounds.
 */
export const getInterventionGroupShades = (
    baseColor: string,
    count: number,
) => {
    if (count <= 1) return [baseColor];
    const maxMix = 0.7;
    return Array.from({ length: count }).map((_, index) => {
        const t = index / (count - 1);
        return mixWithWhite(baseColor, t * maxMix);
    });
};
