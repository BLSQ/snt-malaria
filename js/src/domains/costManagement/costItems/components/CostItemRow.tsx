import React, { FC, memo, MouseEvent, useCallback } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import GroupsIcon from '@mui/icons-material/Groups';
import NumbersIcon from '@mui/icons-material/Numbers';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { getCurrencyAffixes, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { useInterventionContext } from '../../../interventions/contexts/InterventionContext';
import { InterventionCostBreakdownLine } from '../../../interventions/types';
import { formatConversionDirection } from '../../../interventions/utils/costBreakdownLine';
import { MESSAGES } from '../../../messages';
import { CostItemGroup, LineHandler, PartialLineHandler } from '../types';
import {
    COST_ITEMS_GRID_COLUMNS,
    COST_ITEMS_GRID_MIN_WIDTH,
    COST_ITEMS_ROW_PADDING_LEFT,
} from './costItemsGrid';
import { InlineNumberField } from './InlineNumberField';

type Props = {
    group: CostItemGroup;
    line: InterventionCostBreakdownLine;
    onUpdate: PartialLineHandler;
    onEdit: LineHandler;
    onDelete: LineHandler;
};

const ellipsis = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

const styles = {
    row: {
        display: 'grid',
        gridTemplateColumns: COST_ITEMS_GRID_COLUMNS,
        minWidth: COST_ITEMS_GRID_MIN_WIDTH,
        columnGap: 1,
        alignItems: 'center',
        py: 1,
        pr: 2,
        pl: COST_ITEMS_ROW_PADDING_LEFT,
        cursor: 'pointer',
        '&:hover': { backgroundColor: 'action.hover' },
        '&:hover .costItemDelete, &:focus-within .costItemDelete': {
            opacity: 1,
        },
    },
    nameCell: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 0,
    },
    inputCell: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 0,
    },
    basisIcon: { color: 'text.secondary', display: 'flex' },
    name: ellipsis,
    caption: { color: 'text.secondary', lineHeight: 1.3, ...ellipsis },
    mutedCaption: { color: 'text.disabled', lineHeight: 1.3, ...ellipsis },
    delete: {
        opacity: 0,
        transition: 'opacity 0.2s',
        color: 'text.disabled',
        '&:hover': { color: 'error.main' },
    },
} satisfies SxStyles;

const CostItemRowComponent: FC<Props> = ({
    group,
    line,
    onUpdate,
    onEdit,
    onDelete,
}) => {
    const { formatMessage } = useSafeIntl();
    const { currency, defaultBufferPercent } = useInterventionContext();
    const currencyAffixes = getCurrencyAffixes(currency);

    const handleEdit = useCallback(
        () => onEdit(group, line),
        [onEdit, group, line],
    );
    const handleDelete = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            onDelete(group, line);
        },
        [onDelete, group, line],
    );
    const handleFieldCommit = useCallback(
        (field: string, value: number | null) =>
            onUpdate(line.id, { [field]: value }),
        [onUpdate, line.id],
    );

    return (
        <Box sx={styles.row} onClick={handleEdit}>
            <Box sx={styles.nameCell}>
                <Tooltip
                    title={formatMessage(
                        line.is_proportional
                            ? MESSAGES.costItemProportionalLabel
                            : MESSAGES.costItemFixedLabel,
                    )}
                >
                    <Box component="span" sx={styles.basisIcon}>
                        {line.is_proportional ? (
                            <GroupsIcon fontSize="small" />
                        ) : (
                            <NumbersIcon fontSize="small" />
                        )}
                    </Box>
                </Tooltip>
                <Box minWidth={0}>
                    <Typography variant="body2" sx={styles.name}>
                        {line.name}
                    </Typography>
                    <Typography
                        variant="caption"
                        component="div"
                        sx={styles.mutedCaption}
                    >
                        {line.category_label}
                    </Typography>
                </Box>
            </Box>

            <Box sx={styles.inputCell}>
                <InlineNumberField
                    keyValue="unit_cost"
                    value={line.unit_cost}
                    onCommit={handleFieldCommit}
                    minDecimals={2}
                    maxDecimals={2}
                    prefix={currencyAffixes.prefix}
                    suffix={currencyAffixes.suffix}
                    ariaLabel={formatMessage(
                        MESSAGES.budgetingCostLineUnitCost,
                    )}
                />
                <Typography variant="caption" sx={styles.caption}>
                    {formatMessage(MESSAGES.perUnit, {
                        unit: line.unit_type_label,
                    })}
                </Typography>
            </Box>

            <Box sx={styles.inputCell}>
                <InlineNumberField
                    keyValue="conversion_factor"
                    value={line.conversion_factor}
                    onCommit={handleFieldCommit}
                    maxDecimals={6}
                    disabled={!line.is_proportional}
                    ariaLabel={formatMessage(
                        MESSAGES.budgetingCostLineConversionFactor,
                    )}
                />
                <Box minWidth={0}>
                    <Typography
                        variant="caption"
                        component="div"
                        sx={styles.caption}
                    >
                        {line.is_proportional
                            ? formatConversionDirection(
                                  formatMessage,
                                  line.unit_type_label,
                                  line.conversion_factor,
                                  line.invert_conversion_factor,
                              )
                            : formatMessage(MESSAGES.fixedCost)}
                    </Typography>
                    {line.is_proportional && line.population_layer_label && (
                        <Typography
                            variant="caption"
                            component="div"
                            title={line.population_layer_label}
                            sx={styles.mutedCaption}
                        >
                            ({line.population_layer_label})
                        </Typography>
                    )}
                </Box>
            </Box>

            <InlineNumberField
                keyValue="buffer"
                value={line.buffer}
                onCommit={handleFieldCommit}
                maxDecimals={2}
                suffix="%"
                isNullable
                placeholder={String(defaultBufferPercent)}
                ariaLabel={formatMessage(MESSAGES.budgetingCostLineBuffer)}
            />

            <InlineNumberField
                keyValue="coverage"
                value={line.coverage}
                onCommit={handleFieldCommit}
                maxDecimals={2}
                suffix="%"
                max={100}
                disabled={!line.is_proportional}
                ariaLabel={formatMessage(MESSAGES.coverageLabel)}
            />

            <Tooltip title={formatMessage(MESSAGES.deleteCostItem)}>
                <IconButton
                    size="small"
                    className="costItemDelete"
                    sx={styles.delete}
                    onClick={handleDelete}
                    aria-label={formatMessage(MESSAGES.deleteCostItem)}
                >
                    <DeleteOutlineIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    );
};

export const CostItemRow = memo(CostItemRowComponent);
