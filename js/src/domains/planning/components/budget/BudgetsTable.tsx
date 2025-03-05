import React, { FC } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Typography,
} from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { Budget } from '../../types/interventions';

const styles: SxStyles = {
    tableContainer: { maxHeight: 320, overflowY: 'auto', padding: '10px' },
    tableCellStyle: {
        paddingTop: 0.4,
        paddingBottom: 0.4,
        borderBottom: 'none',
    },
};

const TableRowWithBudgets = ({ row, index }) => {
    return (
        <TableRow
            key={index}
            sx={{
                backgroundColor: index % 2 === 0 ? 'white' : '#ECEFF1',
            }}
        >
            <TableCell sx={styles.tableCellStyle}>{row.name}</TableCell>
            <TableCell
                sx={{
                    ...styles.tableCellStyle,
                    textAlign: 'left',
                    paddingLeft: '260px',
                }}
            >
                <Typography variant="h6">
                    {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }).format(row.budget)}
                </Typography>
            </TableCell>
        </TableRow>
    );
};

const TableRowWithoutBudgets = () => {
    return (
        <TableRow
            sx={{
                backgroundColor: '#f5f5f5',
            }}
        >
            <TableCell colSpan={2} align="center" />
        </TableRow>
    );
};

type Props = {
    isLoadingBudgets: boolean;
    budgets: Budget[] | undefined;
};
export const BudgetsTable: FC<Props> = ({ isLoadingBudgets, budgets }) => {
    return (
        <TableContainer component={Paper} sx={styles.tableContainer}>
            <Table size="small" aria-label="a dense table">
                <TableBody>
                    {isLoadingBudgets || (budgets?.length ?? 0) === 0 ? (
                        <TableRowWithoutBudgets />
                    ) : (
                        budgets?.map((row, index) => (
                            <TableRowWithBudgets
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
