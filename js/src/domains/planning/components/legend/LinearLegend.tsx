import React, { FunctionComponent } from 'react';
import { Box, Theme } from '@mui/material';

import { SxStyles } from 'Iaso/types/general';
import { ScaleDomainRange } from '../../../dataLayers/types/metrics';

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

/**
 * Renders a continuous gradient bar with one label per domain stop.
 *
 * Stops are evenly distributed across the bar (CSS lays them out at
 * 0%, ..., 100% when no positions are given). For a balanced diverging
 * gradient, pass `domain` of length 3 with the midpoint as the second
 * value (e.g. `[-100, 0, 100]`); the middle label then aligns visually
 * with the gradient's midpoint thanks to `justify-content: space-between`.
 *
 * Backward-compatible with 2-stop callers (data layers): a 2-element
 * `domain` and `range` render exactly as before.
 */
export const LinearLegend: FunctionComponent<Props> = ({ domainAndRange }) => {
    const { domain, range } = domainAndRange;
    const gradientStyle = {
        background: `linear-gradient(to right, ${range.join(', ')})`,
        minWidth: '250px',
        width: '100%',
        height: '10px',
    };

    return (
        <Box sx={styles.mainBox}>
            <div style={gradientStyle} />
            <Box sx={styles.gradientLabels}>
                {domain.map((value, idx) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <span key={idx}>{value}</span>
                ))}
            </Box>
        </Box>
    );
};
