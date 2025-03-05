import React, { FC } from 'react';
import {
    Chip,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';

const styles: SxStyles = {
    tableContainer: { maxHeight: 320, overflowY: 'auto', padding: '10px' },
    tableCellStyle: {
        paddingTop: 0.4,
        paddingBottom: 0.4,
        borderBottom: 'none',
    },
};

const TableRowWithPlans = ({ row, index }) => {
    return (
        <TableRow
            key={index}
            sx={{
                backgroundColor: index % 2 === 0 ? 'white' : '#ECEFF1',
            }}
        >
            <TableCell sx={styles.tableCellStyle}>{row.name}</TableCell>
            <TableCell sx={styles.tableCellStyle}>
                {row.interventions.map((intervention, idx) => (
                    <Chip
                        key={idx}
                        label={intervention.name}
                        sx={{
                            marginLeft: 0.5,
                            backgroundColor: '#CFD8DC',
                        }}
                    />
                ))}
            </TableCell>
        </TableRow>
    );
};

const TableRowWithoutPlans = () => {
    const { formatMessage } = useSafeIntl();
    return (
        <TableRow
            sx={{
                backgroundColor: '#f5f5f5',
            }}
        >
            <TableCell colSpan={2} align="center">
                <Typography variant="h6">
                    {formatMessage(MESSAGES.noPlanAvailable)}
                </Typography>
            </TableCell>
        </TableRow>
    );
};

type Props = {
    isLoadingPlans: boolean;
    interventionPlans: any;
};
export const InterventionsPlanTable: FC<Props> = ({
    isLoadingPlans,
    interventionPlans,
}) => {
    return (
        <TableContainer component={Paper} sx={styles.tableContainer}>
            <Table size="small" aria-label="a dense table">
                <TableBody>
                    {isLoadingPlans ||
                    (interventionPlans?.length ?? 0) === 0 ? (
                        <TableRowWithoutPlans />
                    ) : (
                        interventionPlans?.map((row, index) => (
                            <TableRowWithPlans
                                key={row.id}
                                row={row}
                                index={index}
                            />
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
