import React, { FC } from 'react';
import { TableCell, TableRow, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { ProgressBar } from '../../../../components/LinearProgress';
import { formatBigNumber } from '../../libs/cost-utils';

const styles = {
    row: { backgroundColor: '#f0f0f0' },
    emphasis: { fontWeight: 'bold' },
} satisfies SxStyles;

export const BudgetTotalRow: FC<{
    yearRange: number[];
    colors: string[];
    totalCosts: {
        totalCost: number;
        yearlyTotal: Record<number, number>;
        interventionTotals: { label: string; totalCost: number }[];
    };
}> = ({ yearRange, colors, totalCosts }) => (
    <TableRow sx={styles.row}>
        <TableCell align="left" colSpan={2}>
            <Typography variant="body2" component="span" sx={styles.emphasis}>
                Total
            </Typography>
        </TableCell>
        {yearRange.map(year => (
            <TableCell key={`total_cost_year_${year}`} align="right">
                <Typography
                    variant="body2"
                    component="span"
                    sx={styles.emphasis}
                >
                    {formatBigNumber(totalCosts.yearlyTotal[year] || 0)}
                </Typography>
            </TableCell>
        ))}
        <TableCell align="right">
            <Typography variant="body2" component="span" sx={styles.emphasis}>
                {formatBigNumber(totalCosts.totalCost)}
            </Typography>
        </TableCell>
        <TableCell align="right">
            <ProgressBar
                values={totalCosts.interventionTotals.map(
                    intervention => intervention.totalCost,
                )}
                colors={colors}
                max={totalCosts.totalCost}
                tooltips={totalCosts.interventionTotals.map(
                    intervention => intervention.label,
                )}
            />
        </TableCell>
    </TableRow>
);
