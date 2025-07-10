import React, { FunctionComponent, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { LegendThreshold, LegendItem, LegendLabel } from '@visx/legend';
import { scaleThreshold } from '@visx/scale';

import { ScaleThreshold } from 'Iaso/components/LegendBuilder/types';

export const useGetLegend = (
    threshold?: ScaleThreshold,
    shouldReverse = false,
): any => {
    if (!threshold) {
        return null;
    }

    if (shouldReverse) {
        return scaleThreshold({
            domain: [...threshold.domain].reverse(),
            range: [...threshold.range].reverse(),
        });
    }

    return scaleThreshold(threshold);
};

type Props = {
    threshold: ScaleThreshold;
    unit?: string;
};

export const ThresholdLegend: FunctionComponent<Props> = ({
    threshold,
    unit,
}) => {
    const theme = useTheme();

    const shouldReverse = useMemo(() => {
        if (!threshold || !threshold.domain || threshold.domain.length < 2)
            return false;
        return (
            threshold.domain[0] > threshold.domain[threshold.domain.length - 1]
        );
    }, [threshold]);

    const getLegend = useGetLegend(threshold, shouldReverse);

    return (
        <LegendThreshold
            scale={getLegend}
            labelDelimiter="-"
            labelLower="< "
            labelUpper="> "
        >
            {labels =>
                labels.map(label => (
                    <LegendItem key={`legend-${label.value}-${label.index}`}>
                        <svg width={16} height={16}>
                            <rect
                                fill={label.value}
                                width="16px"
                                height="16px"
                                rx="4px"
                            />
                        </svg>
                        <LegendLabel
                            align="left"
                            margin={theme.spacing(0, 0, 0, 1)}
                        >
                            {label.text}
                            {unit}
                        </LegendLabel>
                    </LegendItem>
                ))
            }
        </LegendThreshold>
    );
};
