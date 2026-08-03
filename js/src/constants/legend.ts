export const LegendTypes = {
    THRESHOLD: 'threshold',
    ORDINAL: 'ordinal',
    LINEAR: 'linear',
    // Composite layers only: resolved server-side when the graph runs.
    AUTO: 'auto',
    REFERENCE: 'reference',
};

/** Legend types whose buckets are configured by hand rather than resolved from the values. */
export const isConcreteLegend = (legendType?: string): boolean =>
    legendType !== LegendTypes.AUTO && legendType !== LegendTypes.REFERENCE;

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
