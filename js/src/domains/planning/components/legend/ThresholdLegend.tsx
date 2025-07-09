import React, { FunctionComponent, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { LegendThreshold, LegendItem, LegendLabel } from '@visx/legend';
import { scaleThreshold } from '@visx/scale';

import { ScaleThreshold } from 'Iaso/components/LegendBuilder/types';
import { getThresHoldLabels } from 'Iaso/components/LegendBuilder/utils';

export const useGetLegend = (threshold?: ScaleThreshold): any => {
    return scaleThreshold({ ...threshold });
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
            {_labels =>
                threshold.range.map((range, index) => {
                    const value =
                        index > threshold.domain.length - 1
                            ? threshold.domain[index - 1]
                            : threshold.domain[index];
                    return (
                        <LegendItem key={`legend-${value}-${range}`}>
                            <svg width={16} height={16}>
                                <rect
                                    fill={range}
                                    width="16px"
                                    height="16px"
                                    rx="4px"
                                />
                            </svg>
                            <LegendLabel
                                align="left"
                                margin={theme.spacing(0, 0, 0, 1)}
                            >
                                {legendLabels[index]}
                            </LegendLabel>
                        </LegendItem>
                    );
                })
            }
        </LegendThreshold>
    );
};
