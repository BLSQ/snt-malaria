import React, { FunctionComponent, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { LegendThreshold, LegendItem, LegendLabel } from '@visx/legend';

import { ScaleThreshold } from 'Iaso/components/LegendBuilder/types';
import { formatBigNumber } from '../../libs/cost-utils';
import { getLegend, shouldReverse } from '../../libs/map-utils';

type Props = {
    threshold: ScaleThreshold;
    unit?: string;
};

export const ThresholdLegend: FunctionComponent<Props> = ({
    threshold,
    unit,
}) => {
    const theme = useTheme();

    const isReversed = useMemo(() => shouldReverse(threshold), [threshold]);
    const legend = useMemo(
        () => getLegend(threshold, isReversed),
        [threshold, isReversed],
    );

    return (
        <LegendThreshold
            scale={legend}
            labelDelimiter="-"
            labelLower="< "
            labelUpper="> "
            labelFormat={formatBigNumber}
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
