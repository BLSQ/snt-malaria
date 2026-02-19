export const LegendTypes = {
    THRESHOLD: 'threshold',
    ORDINAL: 'ordinal',
    LINEAR: 'linear',
};

export const LEGEND_TYPE_MAX_ITEMS: Record<string, number> = {
    [LegendTypes.ORDINAL]: 4,
    [LegendTypes.THRESHOLD]: 9,
    [LegendTypes.LINEAR]: 2,
};

export const LEGEND_TYPE_MIN_ITEMS: Record<string, number> = {
    [LegendTypes.ORDINAL]: 2,
    [LegendTypes.THRESHOLD]: 2,
    [LegendTypes.LINEAR]: 2,
};
