import React, { FC } from 'react';
import { ExpandMore } from '@mui/icons-material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { AccordionSummary, Box, Grid, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../messages';
import { containerBoxStyles } from '../styles';

type Props = {
    orgUnitCount: number | undefined;
};

export const InterventionPlanSummary: FC<Props> = ({ orgUnitCount = 0 }) => {
    const { formatMessage } = useSafeIntl();
    return (
        <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="interventionsPlan-content"
            id="interventionsPlan-header"
        >
            <Grid
                container
                direction="row"
                spacing={2}
                alignItems="center"
                justifyContent="space-between"
            >
                <Grid item sx={{ flexGrow: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={containerBoxStyles}>
                            <AccountTreeOutlinedIcon
                                height="auto"
                                color="primary"
                            />
                        </Box>

                        <Typography variant="h6" gutterBottom color="#1F2B3D">
                            {formatMessage(MESSAGES.interventionPlanTitle)}
                        </Typography>
                    </Stack>
                </Grid>
                <Grid item sx={{ mr: 4 }}>
                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ color: '#1F2B3D99' }}
                    >
                        <Typography variant="h6">{orgUnitCount}</Typography>
                        <Typography variant="h6">
                            {formatMessage(
                                MESSAGES.orgUnitDistrict,
                            ).toLowerCase()}
                        </Typography>
                    </Stack>
                </Grid>
            </Grid>
        </AccordionSummary>
    );
};
