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

/** Legend types with an open-ended top bucket (values above the last break), so their
 *  `range` carries one more colour than the domain has breaks. */
export const hasOpenEndedTopBucket = (legendType?: string): boolean =>
    legendType === LegendTypes.THRESHOLD;

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
