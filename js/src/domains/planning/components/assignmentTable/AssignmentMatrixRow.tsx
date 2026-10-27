import React, { FC, memo } from 'react';
import { TableCell, TableRow, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../../../constants/overrideColors';
import { AssignmentCell } from './AssignmentCell';
import {
    crosshairTint,
    districtColumnStyles,
    ellipsis,
    fillerCellStyles,
    highlightTint,
    hoveredCellTint,
    ROW_HEIGHT,
} from './assignmentTableLayout';
import { AssignmentFlatColumn, AssignmentRow } from './buildAssignmentTable';
import {
    CellTooltipFormatter,
    CellValueFormatter,
} from './useAssignmentCellText';

const DISTRICT_CELL_CLASS = 'assignmentDistrictCell';
const FILLER_CELL_CLASS = 'assignmentFillerCell';

const styles = {
    row: {
        [`&:hover > td[data-column], &:hover > .${FILLER_CELL_CLASS}`]: {
            backgroundImage: crosshairTint,
        },
        '&:hover > td[data-column]:hover': {
            backgroundImage: hoveredCellTint,
        },
        [`&:hover > .${DISTRICT_CELL_CLASS}`]: {
            backgroundImage: highlightTint,
        },
    },
    districtCell: {
        ...districtColumnStyles,
        zIndex: 2,
        height: ROW_HEIGHT,
        py: 0.5,
        backgroundColor: 'grey.50',
    },
    districtName: { ...ellipsis, lineHeight: 1.3 },
    unassignedDistrictName: {
        ...ellipsis,
        lineHeight: 1.3,
        color: overrideColors.notApplicableText,
    },
    regionName: {
        ...ellipsis,
        display: 'block',
        lineHeight: 1.25,
        color: 'text.secondary',
    },
    fillerCell: fillerCellStyles,
} satisfies SxStyles;

type Props = {
    row: AssignmentRow;
    columns: AssignmentFlatColumn[];
    isCostItems: boolean;
    showRuleDot: boolean;
    ruleDotSize: number;
    formatValue: CellValueFormatter;
    formatTooltip: CellTooltipFormatter;
};

const AssignmentMatrixRowComponent: FC<Props> = ({
    row,
    columns,
    isCostItems,
    showRuleDot,
    ruleDotSize,
    formatValue,
    formatTooltip,
}) => (
    <TableRow sx={styles.row}>
        <TableCell className={DISTRICT_CELL_CLASS} sx={styles.districtCell}>
            <Typography
                variant="body2"
                title={row.name}
                sx={
                    row.isAssigned
                        ? styles.districtName
                        : styles.unassignedDistrictName
                }
            >
                {row.name}
            </Typography>
            {row.regionName && (
                <Typography variant="caption" sx={styles.regionName}>
                    {row.regionName}
                </Typography>
            )}
        </TableCell>
        {row.cells.map((cell, index) => {
            const { column, label, isFirstInGroup, isLastInGroup } =
                columns[index];
            const formattedValue = formatValue(cell, column);
            return (
                <AssignmentCell
                    key={column.key}
                    cell={cell}
                    isCostItem={isCostItems && Boolean(column.costLine)}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    showRuleDot={showRuleDot}
                    ruleDotSize={ruleDotSize}
                    formattedValue={formattedValue}
                    tooltip={formatTooltip(
                        cell,
                        label,
                        row.name,
                        formattedValue,
                    )}
                    columnIndex={index}
                />
            );
        })}
        <TableCell className={FILLER_CELL_CLASS} sx={styles.fillerCell} />
    </TableRow>
);

export const AssignmentMatrixRow = memo(AssignmentMatrixRowComponent);
