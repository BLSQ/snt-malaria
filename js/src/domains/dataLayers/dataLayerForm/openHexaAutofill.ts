import { LegendTypes } from '../../../constants/legend';
import { MetricTypeFormModel, OpenHexaDataLayer } from '../types/metrics';
import { initialTopColor, scaleFromDomainRange } from './legendScale';

export type OpenHexaFormPatch = Pick<
    MetricTypeFormModel,
    | 'code'
    | 'name'
    | 'description'
    | 'source'
    | 'units'
    | 'unit_symbol'
    | 'category'
    | 'legend_type'
    | 'is_population'
    | 'legend_config'
    | 'legend_top_color'
>;

/** Map an OpenHexa data layer onto the fields the data-layer form pre-fills. */
export const openHexaLayerToFormPatch = (
    layer: OpenHexaDataLayer,
): OpenHexaFormPatch => {
    const { code, name, description, source, units, unit_symbol, category } =
        layer;
    return {
        code,
        name,
        description,
        source,
        units,
        unit_symbol,
        category,
        legend_type: layer.legend_type || LegendTypes.THRESHOLD,
        is_population: layer.metric_kind === 'population',
        legend_config: scaleFromDomainRange(layer.legend_config),
        // Keep the colour past the editable rows so a save doesn't drop the top bucket.
        legend_top_color: initialTopColor(layer.legend_config),
    };
};
