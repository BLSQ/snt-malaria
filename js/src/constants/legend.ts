export const LegendTypes = {
    THRESHOLD: 'threshold',
    ORDINAL: 'ordinal',
    SCALE: 'scale',
};

export const LEGEND_TYPE_MAX_ITEMS: Record<LegendTypes, number> = {
    [LegendTypes.ORDINAL]: 4,
    [LegendTypes.THRESHOLD]: 9,
    [LegendTypes.LINEAR]: 2,
};

export const LEGEND_TYPE_MIN_ITEMS: Record<LegendTypes, number> = {
    [LegendTypes.ORDINAL]: 2,
    [LegendTypes.THRESHOLD]: 2,
    [LegendTypes.LINEAR]: 2,
};
