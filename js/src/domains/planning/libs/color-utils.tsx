import { hslToRgb } from '@mui/material';

const [sat, lightness] = [0.69, 0.84];
export const maxHue = 350;

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
