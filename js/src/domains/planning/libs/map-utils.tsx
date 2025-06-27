import { scaleThreshold } from '@visx/scale';
import * as d3 from 'd3-scale';
import { mapTheme } from '../../../constants/map-theme';
import { ScaleDomainRange } from '../types/metrics';

const getLegend = (legend_config: ScaleDomainRange, value) => {
    return scaleThreshold(legend_config)(value);
};

const getColorForShape = (
    value: number,
    legend_type: string,
    legend_config: ScaleDomainRange,
) => {
    if (legend_type === 'linear') {
        const legend = legend_config;
        const colorScale = d3
            .scaleLinear()
            .domain(legend.domain)
            .range(legend.range);
        return colorScale(value);
    }

    return getLegend(legend_config, value);
};

export const getStyleForShape = (
    value: number | undefined,
    legend_type: string | undefined,
    legend_config: ScaleDomainRange | undefined,
    isActive = false,
    isSelected = false,
) => {
    let color: string;
    let weight: number;

    if (isActive) {
        color = mapTheme.activeShapeColor;
        weight = mapTheme.activeShapeWeight;
    } else if (isSelected) {
        color = mapTheme.selectedShapeColor;
        weight = mapTheme.selectedShapeWeight;
    } else {
        color = mapTheme.shapeColor;
        weight = mapTheme.shapeWeight;
    }

    return {
        color,
        weight,
        fillColor:
            legend_config &&
            getColorForShape(value ?? 0, legend_type ?? '', legend_config),
        fillOpacity: 1,
    };
};
