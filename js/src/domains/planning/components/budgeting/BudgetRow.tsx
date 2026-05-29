import React, { FC } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { IconButton, TableCell, TableRow, Typography } from '@mui/material';
import { formatBigNumber } from '../../libs/cost-utils';
import { SxStyles } from 'Iaso/types/general';

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

export type CostLineRowData = {
    id: number;
    label: string;
    subLabel: string;
    totalCost: number;
};

type Props = {
    yearRange: number[];
    intervention: BudgetRowData;
};

export const BudgetRow: FC<Props> = ({ yearRange, intervention }) => {
    const [open, setOpen] = React.useState(false);
    return (
        <>
            <TableRow>
                <TableCell>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? (
                            <KeyboardArrowUpIcon />
                        ) : (
                            <KeyboardArrowDownIcon />
                        )}
                    </IconButton>
                    <Typography variant="body1" component="span">
                        {intervention.interventionLabel}
                    </Typography>
                </TableCell>
                <TableCell align="right">{intervention.orgUnitCount}</TableCell>
                {yearRange.map((year: number) => (
                    <TableCell
                        key={`budget_row_${intervention.interventionId}_year_${year}`}
                        align="right"
                    >
                        {formatBigNumber(intervention.yearCosts[year] || 0)}
                    </TableCell>
                ))}

                <TableCell align="right">
                    {formatBigNumber(intervention.totalCost)}
                </TableCell>
                <TableCell align="right">Cost chart</TableCell>
            </TableRow>
            {open &&
                intervention.costBreakdowns.map(line => (
                    <CostLineRow
                        key={`cost_line_${line.id}`}
                        yearRange={yearRange}
                        totalCost={line.totalCost}
                        label={line.label}
                    />
                ))}
        </>
    );
};

type CostLineRowProps = {
    yearRange: number[];
    totalCost: number;
    label: string;
    // subLabel: string;
};

const styles = {
    costLineRow: { backgroundColor: '#f9f9f9', p: 1 },
    buffer: { pl: 4 },
} satisfies SxStyles;

export const CostLineRow: FC<CostLineRowProps> = ({
    yearRange,
    totalCost,
    label,
    // subLabel,
}) => {
    return (
        <TableRow sx={styles.costLineRow}>
            <TableCell align="left" colSpan={2} sx={styles.buffer}>
                <Typography variant="body1" component="span">
                    {label}
                </Typography>
                {/* <Typography variant="body2" component="span">
                    {subLabel}
                </Typography> */}
            </TableCell>
            {yearRange.map(year => (
                <TableCell
                    key={`cost_line_${label}_${year}`}
                    align="right"
                ></TableCell>
            ))}
            <TableCell align="right">{formatBigNumber(totalCost)}</TableCell>
            <TableCell align="right"></TableCell>
        </TableRow>
    );
};
