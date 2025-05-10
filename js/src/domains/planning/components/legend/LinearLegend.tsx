import React, { FunctionComponent } from 'react';
import { Box, Theme } from '@mui/material';

import { SxStyles } from 'Iaso/types/general';
import { ScaleDomainRange } from '../../types/metrics';

const styles: SxStyles = {
    mainBox: (theme: Theme) => ({
        marginTop: theme.spacing(1),
    }),
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
        <Box sx={styles.mainBox}>
            <div style={gradientStyle} />
            <Box sx={styles.gradientLabels}>
                <span>{startValue}</span>
                <span>{endValue}</span>
            </Box>
        </Box>
    );
};
