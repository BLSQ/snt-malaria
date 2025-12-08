import React, { FunctionComponent } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import { Grid, Typography, Divider, Chip } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { IconBoxed } from '../../../../components/IconBoxed';
import { MESSAGES } from '../../../messages';
import {
    InterventionBudgetSettings,
    InterventionPlan,
} from '../../types/interventions';

type Props = {
    interventionPlan: InterventionPlan;
    interventionBudgetSettings?: InterventionBudgetSettings;
    showInterventionPlanDetails: (interventionPlan: InterventionPlan) => void;
};

const styles: SxStyles = {
    rowStyle: theme => ({
        padding: theme.spacing(1),
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
            '& .actions': {
                visibility: 'visible',
            },
        },
        '& .actions': {
            visibility: 'hidden',
        },
    }),
    cellStyle: {
        display: 'flex',
        alignItems: 'center',
    },
    textButton: {
        textTransform: 'none',
    },
    chip: theme => ({
        backgroundColor: theme.palette.primary.light,
    }),
};
export const InterventionsPlanRow: FunctionComponent<Props> = ({
    interventionPlan,
    interventionBudgetSettings,
    showInterventionPlanDetails,
}) => {
    const { formatMessage } = useSafeIntl();
    return interventionPlan ? (
        <>
            <Grid
                container
                columnSpacing={3}
                sx={styles.rowStyle}
                onClick={() => showInterventionPlanDetails(interventionPlan)}
            >
                <Grid item xs={2} sx={styles.cellStyle}>
                    <Typography variant="body2">
                        {interventionPlan?.intervention.name} -{' '}
                        {interventionPlan?.intervention.code}
                    </Typography>
                </Grid>
                <Grid item xs={1} sx={styles.cellStyle}>
                    <Typography color="primary" variant="body2">
                        {interventionPlan?.org_units.length}{' '}
                    </Typography>
                </Grid>
                <Grid item xs={4} sx={styles.cellStyle}>
                    {interventionBudgetSettings && (
                        <Chip
                            label={interventionBudgetSettings.coverage + '%'}
                            sx={styles.chip}
                        />
                    )}
                </Grid>
                <Grid item xs={4} sx={styles.cellStyle}>
                    <Typography variant="body2">
                        {formatMessage(MESSAGES.impactSettingsNotIncluded)}
                    </Typography>
                </Grid>
                <Grid item xs={1} sx={styles.cellStyle} className="actions">
                    <IconBoxed Icon={EditIcon} rounded />
                </Grid>
            </Grid>
            <Divider />
        </>
    ) : null;
};
