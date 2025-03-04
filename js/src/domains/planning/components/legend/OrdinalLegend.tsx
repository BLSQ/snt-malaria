import React, { FunctionComponent } from 'react';
import { useTheme } from '@mui/material';
import { scaleOrdinal } from '@visx/scale';
import { LegendOrdinal, LegendItem, LegendLabel } from '@visx/legend';
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
                labels.reverse().map(label => {
                    return (
                        <LegendItem
                            key={`legend-${label.value}-${label.index}`}
                            margin={theme.spacing(0, 0, 1, 0)}
                        >
                            <svg width={20} height={20}>
                                <circle
                                    fill={label.value}
                                    cx="10"
                                    cy="10"
                                    r="10"
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
