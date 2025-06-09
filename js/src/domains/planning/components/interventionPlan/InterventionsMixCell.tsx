import React, { FunctionComponent, useState } from 'react';
import { alpha, Box, Stack, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { EditInterventionMix } from './EditInterventionMixModal';

type Props = {
    scenarioId: number;
    iconProps: any;
    row: any;
};
const styles: SxStyles = {
    interventionDotStyle: {
        verticalAlign: 'baseline',
        paddingLeft: theme => theme.spacing(0.6),
        paddingRight: theme => theme.spacing(0.6),
    },
};

export const InterventionsMixCell: FunctionComponent<Props> = ({
    scenarioId,
    iconProps,
    row,
}) => {
    const [hoveredMixName, setHoveredMixName] = useState<boolean>(false);
    return (
        <Box display="flex" flexDirection="column">
            <Stack
                direction="row"
                gap={1}
                onMouseEnter={() => setHoveredMixName(true)}
                onMouseLeave={() => setHoveredMixName(false)}
            >
                <Typography
                    variant="subtitle2"
                    color={alpha('#1F2B3D', 0.87)}
                    fontWeight="bold"
                >
                    {row.name}
                </Typography>
                <Box visibility={hoveredMixName ? 'visible' : 'hidden'}>
                    <EditInterventionMix
                        setHoveredMixName={setHoveredMixName}
                        iconProps={iconProps}
                        mix={row}
                    />
                </Box>
            </Stack>
            <Box>
                {row.interventions.map((intervention, idx) => (
                    <Typography
                        key={intervention.name}
                        variant="caption"
                        color={alpha('#1F2B3D', 0.87)}
                    >
                        {intervention.name}
                        {idx < row.interventions.length - 1 && (
                            <Box
                                component="span"
                                sx={styles.interventionDotStyle}
                            >
                                ·
                            </Box>
                        )}
                    </Typography>
                ))}
            </Box>
        </Box>
    );
};
