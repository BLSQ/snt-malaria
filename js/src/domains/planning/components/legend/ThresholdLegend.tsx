import React, { FunctionComponent, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { scaleThreshold } from '@visx/scale';
import { LegendThreshold, LegendItem, LegendLabel } from '@visx/legend';

import { SxStyles } from 'Iaso/types/general';
import { ScaleThreshold } from 'Iaso/components/LegendBuilder/types';
import { getThresHoldLabels } from 'Iaso/components/LegendBuilder/utils';

export const useGetLegend = (threshold?: ScaleThreshold): any => {
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
    const getLegend = useGetLegend(threshold);
    const legendLabels = useMemo(
        () => getThresHoldLabels(threshold, unit),
        [threshold, unit],
    );
    return (
        <LegendThreshold scale={getLegend}>
            {labels =>
                labels.reverse().map(label => {
                    return (
                        <LegendItem
                            key={`legend-${label.value}-${label.index}`}
                        >
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
                                {legendLabels[label.index]}
                            </LegendLabel>
                        </LegendItem>
                    );
                })
            }
        </LegendThreshold>
    );
};
