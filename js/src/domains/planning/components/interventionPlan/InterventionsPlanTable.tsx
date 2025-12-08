import React, { FC, useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { sortByStringProp } from '../../libs/list-utils';
import {
    InterventionBudgetSettings,
    InterventionPlan,
} from '../../types/interventions';
import { InterventionsPlanHeader } from './InterventionsPlanHeader';
import { InterventionsPlanRow } from './InterventionsPlanRow';

const styles: SxStyles = {
    container: {
        overflowY: 'none',
        padding: 0,
        margin: 0,
        height: '100%',
    },
    tableNoContent: {
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    rowContainer: {
        height: '100%',
        overflowY: 'auto',
    },
};

type Props = {
    isLoadingPlans: boolean;
    interventionPlans?: InterventionPlan[];
    interventionBudgetSettings?: InterventionBudgetSettings[];
    showInterventionPlanDetails: (interventionPlan: InterventionPlan) => void;
};
export const InterventionsPlanTable: FC<Props> = ({
    isLoadingPlans,
    interventionPlans,
    interventionBudgetSettings,
    showInterventionPlanDetails,
}) => {
    const { formatMessage } = useSafeIntl();
    const sortedInterventionPlans = useMemo(
        () =>
            interventionPlans
                ? sortByStringProp(interventionPlans, 'intervention.name')
                : [],
        [interventionPlans],
    );

    const interventionPlanBudgetSettings = useMemo(
        () =>
            interventionBudgetSettings?.reduce(
                (acc, ibs) => ({ ...acc, [ibs.intervention_id]: ibs }),
                {} as { [interventionId: number]: InterventionBudgetSettings },
            ),
        [interventionBudgetSettings],
    );

    return (
        <Paper component={Paper} sx={styles.container}>
            {isLoadingPlans || (interventionPlans?.length ?? 0) === 0 ? (
                <Box sx={styles.tableNoContent}>
                    <Typography variant="body2" sx={{ color: '#1F2B3D99' }}>
                        {formatMessage(MESSAGES.tableNoContent)}
                    </Typography>
                </Box>
            ) : (
                <>
                    <InterventionsPlanHeader />
                    <Box sx={styles.rowContainer}>
                        {sortedInterventionPlans?.map(row => (
                            <InterventionsPlanRow
                                key={row.intervention.id}
                                interventionPlan={row}
                                interventionBudgetSettings={
                                    interventionPlanBudgetSettings?.[
                                        row.intervention.id
                                    ] ?? undefined
                                }
                                showInterventionPlanDetails={
                                    showInterventionPlanDetails
                                }
                            />
                        ))}
                    </Box>
                </>
            )}
        </Paper>
    );
};
