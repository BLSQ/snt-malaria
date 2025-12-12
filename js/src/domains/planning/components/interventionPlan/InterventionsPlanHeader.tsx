import React, { FC } from 'react';
import { Grid, Typography, Divider } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../../domains/messages';

const styles: SxStyles = {
    rowStyle: theme => ({
        padding: theme.spacing(1),
    }),
};
export const InterventionsPlanHeader: FC = () => {
    const { formatMessage } = useSafeIntl();
    return (
        <>
            <Grid container columnSpacing={3} sx={styles.rowStyle}>
                <Grid item xs={2}>
                    <Typography variant="subtitle2">
                        {formatMessage(MESSAGES.interventionLabel)}
                    </Typography>
                </Grid>
                <Grid item xs={1}>
                    <Typography variant="subtitle2">
                        {formatMessage(MESSAGES.orgUnitDistrict)}
                    </Typography>
                </Grid>
                <Grid item xs={4}>
                    <Typography variant="subtitle2">
                        {formatMessage(MESSAGES.budgetAssumptionsLabel)}
                    </Typography>
                </Grid>
                <Grid item xs={4}>
                    <Typography variant="subtitle2">
                        {formatMessage(MESSAGES.impactSettingsLabel)}
                    </Typography>
                </Grid>
                <Grid item xs={1}></Grid>
            </Grid>
            <Divider />
        </>
    );
};
