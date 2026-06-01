import React, { FC } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { IconButton, TableCell, TableRow, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { ProgressBar } from '../../../../components/LinearProgress';
import { MESSAGES } from '../../../messages';
import { formatBigNumber } from '../../libs/cost-utils';
import { CostLineRow, CostLineRowData } from './CostLineRow';

export type BudgetRowData = {
    interventionId: number;
    interventionLabel: string;
    orgUnitCount: number;
    yearCosts: {
        [year: number]: number;
    };
    totalCost: number;
    costBreakdowns: CostLineRowData[];
};

type Props = {
    yearRange: number[];
    intervention: BudgetRowData;
    combinedTotalCost: number;
    color: string;
    isEditable: boolean;
};

const styles = {
    emphasis: { fontWeight: 'bold' },
    supEmphasis: { fontWeight: 'bold', fontSize: '1.2rem' },
} satisfies SxStyles;

export const BudgetRow: FC<Props> = ({
    yearRange,
    intervention,
    combinedTotalCost,
    color,
    isEditable,
}) => {
    const [open, setOpen] = React.useState(false);
    const { formatMessage } = useSafeIntl();
    return (
        <>
            <TableRow>
                <TableCell>
                    <IconButton
                        aria-label={formatMessage(MESSAGES.budgetingExpandRow)}
                        size="small"
                        sx={{ mr: 1 }}
                        onClick={() => setOpen(!open)}
                    >
                        {open ? (
                            <KeyboardArrowUpIcon />
                        ) : (
                            <KeyboardArrowDownIcon />
                        )}
                    </IconButton>
                    <Typography
                        variant="body1"
                        component="span"
                        sx={styles.emphasis}
                    >
                        {intervention.interventionLabel}
                    </Typography>
                </TableCell>
                <TableCell align="right">
                    <Typography variant="body2">
                        {intervention.orgUnitCount}
                    </Typography>
                </TableCell>
                {yearRange.map((year: number) => (
                    <TableCell
                        key={`budget_row_${intervention.interventionId}_year_${year}`}
                        align="center"
                    >
                        <Typography
                            variant="body1"
                            component="span"
                            sx={{ ...styles.emphasis }}
                        >
                            {formatBigNumber(intervention.yearCosts[year] || 0)}
                        </Typography>
                    </TableCell>
                ))}

                <TableCell align="center">
                    <Typography
                        variant="body1"
                        component="span"
                        sx={styles.supEmphasis}
                    >
                        {formatBigNumber(intervention.totalCost)}
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    <ProgressBar
                        values={[intervention.totalCost]}
                        colors={[color]}
                        max={combinedTotalCost || 0} // Replace with the actual max value if available
                    />
                </TableCell>
            </TableRow>
            {open &&
                intervention.costBreakdowns.map(line => (
                    <CostLineRow
                        key={`cost_line_${line.id}`}
                        yearRange={yearRange}
                        isEditable={isEditable}
                        costLineId={line.id}
                        coverageByYear={line.coverageByYear}
                        totalCost={line.totalCost}
                        label={line.label}
                    />
                ))}
        </>
    );
};
