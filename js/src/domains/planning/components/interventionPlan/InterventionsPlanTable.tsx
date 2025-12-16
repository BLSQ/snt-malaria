import React, { FC, useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { sortByStringProp } from '../../libs/list-utils';
import { BudgetAssumptions, InterventionPlan } from '../../types/interventions';
import { InterventionsPlanHeader } from './InterventionsPlanHeader';
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
    isLoadingPlans: boolean;
    interventionPlans?: InterventionPlan[];
    budgetAssumptions?: BudgetAssumptions[];
    showInterventionPlanDetails: (interventionPlan: InterventionPlan) => void;
};
export const InterventionsPlanTable: FC<Props> = ({
    isLoadingPlans,
    interventionPlans,
    budgetAssumptions,
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
                        {sortedInterventionPlans?.map((row, index) => (
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
                                    index === sortedInterventionPlans.length - 1
                                }
                            />
                        ))}
                    </Box>
                </>
            )}
        </Paper>
    );
};
