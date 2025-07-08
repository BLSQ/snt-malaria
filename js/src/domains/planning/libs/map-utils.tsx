import { scaleThreshold, ThresholdScaleConfig } from '@visx/scale';
import * as d3 from 'd3-scale';
import { mapTheme } from '../../../constants/map-theme';
import { ScaleDomainRange } from '../types/metrics';

const getLegend = (legend_config: ThresholdScaleConfig, value: number) => {
    return scaleThreshold(legend_config)(value);
};

const getColorForShape = (
    value: number | string,
    legend_type: string,
    legend_config: ScaleDomainRange,
) => {
    if (legend_type === 'ordinal') {
        const index = legend_config.domain.indexOf(value as never);
        return legend_config.range[index];
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
        console.error(
            `Value for ${legend_type} legend can only be a numeric value`,
        );
        return null;
    }

    // Ensure the domain is a number array for linear scales
    const numericDomain = legend_config.domain.map(Number) as number[];
    if (numericDomain.some(d => Number.isNaN(d))) {
        console.error('Legend of type linear only accept numeric as domain');
        return null;
    }

    if (legend_type === 'linear') {
        const colorScale = d3
            .scaleLinear()
            .domain(numericDomain)
            .range(legend_config.range);
        return colorScale(numericValue);
    }

    return getLegend(
        {
            domain: numericDomain,
            range: legend_config.range,
            type: 'threshold',
        },
        numericValue,
    );
};

export const getStyleForShape = (
    value: number | string | undefined,
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
