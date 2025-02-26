import React, { FC } from 'react';
import { AccountTree as PlanIcon, ExpandMore } from '@mui/icons-material';
import { AccordionSummary, Grid, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../messages';

type Props = {
    orgUnitCount: number;
};
export const InterventionPlanSummary: FC<Props> = ({ orgUnitCount }) => {
    const { formatMessage } = useSafeIntl();
    return (
        <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="interventions-content"
            id="interventions-header"
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
                        <PlanIcon color="primary" />
                        <Typography variant="h6" gutterBottom color="#1F2B3D">
                            {formatMessage(MESSAGES.interventionPlanTitle)}
                        </Typography>
                    </Stack>
                </Grid>
                <Grid item sx={{ mr: 5 }}>
                    <Stack
                        direction="row"
                        spacing={2}
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
