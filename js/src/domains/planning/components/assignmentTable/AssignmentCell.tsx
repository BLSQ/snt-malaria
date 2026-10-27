import React, { FC, memo } from 'react';
import { Box, TableCell } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { ColorDot } from '../../../../components/ColorDot';
import { overrideColors } from '../../../../constants/overrideColors';
import {
    COST_ITEM_COLUMN_WIDTH,
    INTERVENTION_COLUMN_WIDTH,
    ROW_HEIGHT,
} from './assignmentTableLayout';
import { AssignmentTableCell } from './buildAssignmentTable';

const OVERRIDDEN_PILL_CLASS = 'assignmentOverriddenPill';

const styles = {
    cell: {
        boxSizing: 'border-box',
        height: ROW_HEIGHT,
        px: '10px',
        py: 0,
        borderLeft: 1,
        borderLeftColor: 'divider',
        borderBottomColor: 'divider',
        backgroundColor: 'background.paper',
        color: 'text.primary',
        typography: 'body2',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
        [`&:hover .${OVERRIDDEN_PILL_CLASS}`]: {
            backgroundColor: overrideColors.overriddenHoverBackground,
        },
    },
    firstInGroupCell: { borderLeftColor: 'transparent' },
    lastInGroupCell: {
        borderRight: 1,
        borderRightColor: overrideColors.inputBorder,
    },
    interventionCell: {
        width: INTERVENTION_COLUMN_WIDTH,
        minWidth: INTERVENTION_COLUMN_WIDTH,
        maxWidth: INTERVENTION_COLUMN_WIDTH,
        textAlign: 'center',
    },
    costItemCell: {
        width: COST_ITEM_COLUMN_WIDTH,
        minWidth: COST_ITEM_COLUMN_WIDTH,
        maxWidth: COST_ITEM_COLUMN_WIDTH,
        textAlign: 'right',
    },
    ruleValue: {
        color: overrideColors.overriddenText,
        fontWeight: 'medium',
    },
    content: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: 22,
        verticalAlign: 'middle',
    },
    overriddenPill: {
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        boxSizing: 'border-box',
        px: 1,
        borderRadius: 999,
        backgroundColor: overrideColors.overriddenBackground,
    },
    overriddenInterventionPill: {
        fontSize: theme => theme.typography.caption.fontSize,
    },
} satisfies SxStyles;

type Props = {
    cell: AssignmentTableCell;
    isCostItem: boolean;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    showRuleDot: boolean;
    ruleDotSize: number;
    formattedValue: string;
    tooltip: string;
    columnIndex: number;
};

const AssignmentCellComponent: FC<Props> = ({
    cell,
    isCostItem,
    isFirstInGroup,
    isLastInGroup,
    showRuleDot,
    ruleDotSize,
    formattedValue,
    tooltip,
    columnIndex,
}) => (
    <TableCell
        data-column={columnIndex}
        title={tooltip}
        sx={[
            styles.cell,
            isCostItem ? styles.costItemCell : styles.interventionCell,
            isFirstInGroup && styles.firstInGroupCell,
            isLastInGroup && styles.lastInGroupCell,
            (cell.isRuleValue || (!isCostItem && cell.isOverridden)) &&
                styles.ruleValue,
        ]}
    >
        {!isCostItem && cell.rule && cell.isDeployed && (
            <Box component="span" sx={styles.content}>
                <ColorDot color={cell.rule.color} size={ruleDotSize} />
                {cell.isOverridden && (
                    <Box
                        component="span"
                        className={OVERRIDDEN_PILL_CLASS}
                        sx={[
                            styles.overriddenPill,
                            styles.overriddenInterventionPill,
                        ]}
                    >
                        {formattedValue}
                    </Box>
                )}
            </Box>
        )}
        {isCostItem && formattedValue && (
            <Box component="span" sx={styles.content}>
                {showRuleDot && cell.rule && (
                    <ColorDot color={cell.rule.color} size={ruleDotSize} />
                )}
                {cell.isOverridden ? (
                    <Box
                        component="span"
                        className={OVERRIDDEN_PILL_CLASS}
                        sx={styles.overriddenPill}
                    >
                        {formattedValue}
                    </Box>
                ) : (
                    formattedValue
                )}
            </Box>
        )}
    </TableCell>
);

export const AssignmentCell = memo(AssignmentCellComponent);
