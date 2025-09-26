import React, { FC, useMemo } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableContainer,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { sortByStringProp } from '../../libs/list-utils';
import { InterventionPlan } from '../../types/interventions';
import { MetricType } from '../../types/metrics';
import { InterventionsPlanRowTable } from './InterventionsPlanRowTable';

const styles: SxStyles = {
    tableContainer: {
        overflowY: 'auto',
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
};

type Props = {
    isLoadingPlans: boolean;
    interventionPlans: InterventionPlan[] | undefined;
    showInterventionPlanDetails: (interventionPlan: InterventionPlan) => void;
    onMetricSelected: (interventionId: number, metric: MetricType) => void;
};
export const InterventionsPlanTable: FC<Props> = ({
    isLoadingPlans,
    interventionPlans,
    showInterventionPlanDetails,
    onMetricSelected,
}) => {
    const { formatMessage } = useSafeIntl();
    const sortedInterventionPlans = useMemo(
        () =>
            interventionPlans
                ? sortByStringProp(interventionPlans, 'intervention.name')
                : [],
        [interventionPlans],
    );
    return (
        <TableContainer component={Paper} sx={styles.tableContainer}>
            {isLoadingPlans || (interventionPlans?.length ?? 0) === 0 ? (
                <Box sx={styles.tableNoContent}>
                    <Typography variant="body2" sx={{ color: '#1F2B3D99' }}>
                        {formatMessage(MESSAGES.tableNoContent)}
                    </Typography>
                </Box>
            ) : (
                <Table
                    sx={{
                        minWidth: 650,
                    }}
                    aria-label="simple table"
                >
                    <TableBody>
                        {sortedInterventionPlans?.map((row, index) => (
                            <InterventionsPlanRowTable
                                key={row.intervention.id}
                                row={row}
                                index={index}
                                showInterventionPlanDetails={
                                    showInterventionPlanDetails
                                }
                                onMetricSelected={metric =>
                                    onMetricSelected(
                                        row.intervention.id,
                                        metric,
                                    )
                                }
                            />
                        ))}
                    </TableBody>
                </Table>
            )}
        </TableContainer>
    );
};
