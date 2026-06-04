export const INTERVENTION_COLORS = {
    ACTs: '#A2CAEA',
    RDTs: '#ACDF9B',
    MDA: '#D1C4E9',
    PMC: '#F2B16E',
    SMC: '#C54A53',
    'RTS,S': '#F2D683',
    IRS: '#E4754F',
    'LLIN Routine': '#80B3DC',
    'LLIN Campaign': '#6BD39D',
    IPTp: '#80B3DC',
};

export const formatPercentValue = (value: number) => {
    return `${(value * 100).toFixed(0)}%`;
};

export const formatSignedPercentValue = (value: number) => {
    const pct = Math.round(value * 100);
    return `${pct > 0 ? '+' : ''}${pct}%`;
};

export const formatBigNumber = (value: number) => {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000_000) {
        return `${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
    }
    if (abs >= 1_000_000) {
        return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
    }
    if (abs >= 1_000) {
        return `${sign}${(abs / 1_000).toFixed(2)}K`;
    }
    return value.toFixed(2);
};
