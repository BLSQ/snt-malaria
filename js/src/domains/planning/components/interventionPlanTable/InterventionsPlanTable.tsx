import React, { FC, useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { BudgetAssumptions, InterventionPlan } from '../../types/interventions';
import { InterventionsPlanRow } from './InterventionsPlanRow';

const styles: SxStyles = {
    container: {
        overflowY: 'none',
        padding: 0,
        margin: 0,
        height: 'calc(100% - 37px)',
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
    budgetAssumptions?: BudgetAssumptions[];
    showInterventionPlanDetails: (interventionPlan: InterventionPlan) => void;
};
export const InterventionsPlanTable: FC<Props> = ({
    budgetAssumptions,
    showInterventionPlanDetails,
}) => {
    const { formatMessage } = useSafeIntl();
    const { interventionPlans } = usePlanningContext();

    const interventionPlanBudgetAssumptions = useMemo(
        () =>
            budgetAssumptions?.reduce(
                (acc, ia) => ({ ...acc, [ia.intervention_code]: ia }),
                {} as { [interventionCode: string]: BudgetAssumptions },
            ),
        [budgetAssumptions],
    );

    return (
        <Paper component={Paper} sx={styles.container}>
            {(interventionPlans?.length ?? 0) === 0 ? (
                <Box sx={styles.tableNoContent}>
                    <Typography variant="body2" sx={{ color: '#1F2B3D99' }}>
                        {formatMessage(MESSAGES.tableNoContent)}
                    </Typography>
                </Box>
            ) : (
                <>
                    <Box sx={styles.rowContainer}>
                        {interventionPlans?.map((row, index) => (
                            <InterventionsPlanRow
                                key={row.intervention.id}
                                interventionPlan={row}
                                budgetAssumptions={
                                    interventionPlanBudgetAssumptions?.[
                                        row.intervention.code
                                    ] ?? undefined
                                }
                                showInterventionPlanDetails={
                                    showInterventionPlanDetails
                                }
                                hideDivider={
                                    index === interventionPlans.length - 1
                                }
                            />
                        ))}
                    </Box>
                </>
            )}
        </Paper>
    );
};
