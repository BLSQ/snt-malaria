import React, { FunctionComponent } from 'react';
import { Box } from '@mui/material';

import { SxStyles } from 'Iaso/types/general';
import { ScaleDomainRange } from '../../types/metrics';

const styles: SxStyles = {
    gradientLabels: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
    },
};

type Props = {
    domainAndRange: ScaleDomainRange;
};

export const LinearLegend: FunctionComponent<Props> = ({ domainAndRange }) => {
    const [startValue, endValue] = domainAndRange.domain;
    const [startColor, endColor] = domainAndRange.range;

    const gradientStyle = {
        background: `linear-gradient(to right, ${startColor}, ${endColor})`,
        minWidth: '250px',
        width: '100%',
        height: '10px',
    };

    return (
        <Box>
            <div style={gradientStyle}></div>
            <Box sx={styles.gradientLabels}>
                <span>{startValue}</span>
                <span>{endValue}</span>
            </Box>
        </Box>
    );
};
