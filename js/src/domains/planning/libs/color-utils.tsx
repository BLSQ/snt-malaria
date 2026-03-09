import { hslToRgb } from '@mui/material';

const [sat, lightness] = [0.69, 0.84];
export const maxHue = 350;

export const purples = [
    '#673AB7',
    '#7E57C2',
    '#B39DDB',
    '#CE93D8',
    '#E1BEE7',
    '#F3E5F5',
];

export const INTERVENTION_COLORS = {
    ACTs: '#A2CAEA',
    RDTs: '#ACDF9B',
    MDA: '#D1C4E9',
    PMC: '#F2B16E',
    'PMC (SP)': '#F2B16E',
    SMC: '#C54A53',
    'RTS,S': '#F2D683',
    IRS: '#E4754F',
    'LLIN Routine': '#80B3DC',
    'LLIN Campaign': '#6BD39D',
    IPTp: '#80B3DC',
};

export const severityColorRange = [
    '#6BD39D',
    '#ACDF9B',
    '#F5F1A0',
    '#F2B16E',
    '#E4754F',
    '#A93A42',
];

export const defaultLegend = '#999999';

export const getColorRange = (count: number = 1) => {
    const colorStep = Math.round(maxHue / count);
    let prevHue = 0;

    return Array.from(Array(count)).map(() => {
        const [hue, sat, light] = getHslColor(prevHue, colorStep);
        prevHue = hue;
        return hslToRgb(`hsl(${hue},${sat * 100}%,${light * 100}%)`);
    });
};

export const getRandomColor = (str: string = ''): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        // eslint-disable-next-line no-bitwise
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return hslToRgb(`hsl(${hue},${sat * 100}%,${lightness * 100}%)`);
};

export const getHslColor = (prevHue: number = 0, stepSize = 10) => {
    let hue = prevHue + stepSize;
    if (hue > maxHue) {
        hue -= maxHue;
    }
    return [hue, sat, lightness];
};

const circularMean = (angles: number[]): number => {
    let sinSum = 0;
    let cosSum = 0;
    for (const angle of angles) {
        const rad = (angle * Math.PI) / 180;
        sinSum += Math.sin(rad);
        cosSum += Math.cos(rad);
    }
    const meanRad = Math.atan2(sinSum / angles.length, cosSum / angles.length);
    let meanDeg = (meanRad * 180) / Math.PI;
    if (meanDeg < 0) meanDeg += 360;
    return meanDeg;
};

export const blendColors = (colors: string[]) => {
    if (colors.length === 0) return defaultLegend;
    if (colors.length === 1) return colors[0];

    const hslColors = colors.map(hexToHsl);
    const avgHue = circularMean(hslColors.map(([hue]) => hue));
    const avgSat =
        hslColors.map(([, sat]) => sat).reduce((a, b) => a + b, 0) /
        hslColors.length;
    const avgLight =
        hslColors.map(([, , light]) => light).reduce((a, b) => a + b, 0) /
        hslColors.length;

    const boostedSat = Math.min(100, avgSat * 0.8);
    const darkenedLight = Math.max(0, avgLight * 0.7);

    return hslToRgb(
        `hsl(${avgHue},${boostedSat * 100}%,${darkenedLight * 100}%)`,
    );
};

const hexToHsl = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0, 0, 0];

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return [h * 360, s, l];
};
