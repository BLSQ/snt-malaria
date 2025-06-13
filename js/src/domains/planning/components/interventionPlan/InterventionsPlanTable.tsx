import React, { FC } from 'react';
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
import { MESSAGES } from '../../messages';
import { InterventionsPlanRowTable } from './InterventionsPlanRowTable';

const styles: SxStyles = {
    tableContainer: {
        minHeight: 424,
        overflowY: 'auto',
        padding: 0,
        margin: 0,
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
    scenarioId: number | undefined;
    isLoadingPlans: boolean;
    interventionPlans: any;
    setSelectedInterventions: any;
    selectedInterventions: any;
    setMixName: (name: string) => void;
    mixName: string;
};
export const InterventionsPlanTable: FC<Props> = ({
    scenarioId,
    isLoadingPlans,
    interventionPlans,
    setSelectedInterventions,
    selectedInterventions,
    setMixName,
    mixName,
}) => {
    const { formatMessage } = useSafeIntl();
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
                        {interventionPlans?.map((row, index) => (
                            <InterventionsPlanRowTable
                                scenarioId={scenarioId}
                                key={row.id}
                                row={row}
                                index={index}
                                iconProps={undefined}
                                setSelectedInterventions={
                                    setSelectedInterventions
                                }
                                selectedInterventions={selectedInterventions}
                                setMixName={setMixName}
                                mixName={mixName}
                            />
                        ))}
                    </TableBody>
                </Table>
            )}
        </TableContainer>
    );
};
