import React, { FC } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableContainer,
    Typography,
} from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { InterventionsPlanRowTable } from './InterventionsPlanRowTable';

const styles: SxStyles = {
    tableContainer: {
        minHeight: 275,
        overflowY: 'auto',
        padding: 0,
        margin: 0,
    },
    tableCellStyle: {
        padding: theme => theme.spacing(0),
    },
    orgUnitStyle: {
        margin: theme => theme.spacing(0.5),
    },
    interventionDotStyle: {
        verticalAlign: 'baseline',
        paddingLeft: theme => theme.spacing(0.6),
        paddingRight: theme => theme.spacing(0.6),
    },
};

type Props = {
    scenarioId: number;
    isLoadingPlans: boolean;
    interventionPlans: any;
};
export const InterventionsPlanTable: FC<Props> = ({
    scenarioId,
    isLoadingPlans,
    interventionPlans,
}) => {
    return (
        <TableContainer component={Paper} sx={styles.tableContainer}>
            {isLoadingPlans || (interventionPlans?.length ?? 0) === 0 ? (
                <Box
                    sx={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 200, // ensure there's enough vertical space
                    }}
                >
                    <Typography variant="body2" sx={{ color: '#1F2B3D99' }}>
                        Intervention mixes and their districts will appear here.
                    </Typography>
                </Box>
            ) : (
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                    <TableBody>
                        {interventionPlans?.map((row, index) => (
                            <InterventionsPlanRowTable
                                scenarioId={scenarioId}
                                key={row.id}
                                row={row}
                                index={index} 
                                iconProps={undefined}                            />
                        ))}
                    </TableBody>
                </Table>
            )}
        </TableContainer>
    );
};
