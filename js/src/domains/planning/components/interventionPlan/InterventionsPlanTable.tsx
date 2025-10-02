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
    onCoverageSelected: (interventionId: number, coverage: string) => void;
    interventionsCoverage: { [interventionId: number]: string };
};
export const InterventionsPlanTable: FC<Props> = ({
    isLoadingPlans,
    interventionPlans,
    showInterventionPlanDetails,
    onCoverageSelected,
    interventionsCoverage,
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
                                onCoverageSelected={coverage =>
                                    onCoverageSelected(
                                        row.intervention.id,
                                        coverage,
                                    )
                                }
                                coverage={
                                    interventionsCoverage?.[row.intervention.id]
                                }
                            />
                        ))}
                    </TableBody>
                </Table>
            )}
        </TableContainer>
    );
};
