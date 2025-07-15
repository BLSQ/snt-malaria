import React, { FunctionComponent } from 'react';
import { useTheme } from '@mui/material';
import { LegendOrdinal, LegendItem, LegendLabel } from '@visx/legend';
import { scaleOrdinal } from '@visx/scale';
import { ScaleDomainRange } from '../../types/metrics';

export const useGetLegend = (threshold?: ScaleDomainRange): any => {
    return scaleOrdinal(threshold);
};

type Props = {
    domainAndRange: ScaleDomainRange;
};

export const OrdinalLegend: FunctionComponent<Props> = ({ domainAndRange }) => {
    const theme = useTheme();
    const getLegend = useGetLegend(domainAndRange);

    return (
        <LegendOrdinal scale={getLegend}>
            {labels =>
                labels.map(label => {
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
                                {label.text}
                            </LegendLabel>
                        </LegendItem>
                    );
                })
            }
        </LegendOrdinal>
    );
};
