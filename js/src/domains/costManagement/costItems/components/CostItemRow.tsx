import React, { FC, memo, MouseEvent, useCallback } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import GroupsIcon from '@mui/icons-material/Groups';
import NumbersIcon from '@mui/icons-material/Numbers';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { getCurrencyAffixes, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { NumberInput } from '../../../../components/NumberInput';
import { useInterventionContext } from '../../../interventions/contexts/InterventionContext';
import { InterventionCostBreakdownLine } from '../../../interventions/types';
import { formatConversionDirection } from '../../../interventions/utils/costBreakdownLine';
import { MESSAGES } from '../../../messages';
import { LineHandler, PartialLineHandler } from '../types';
import {
    COST_ITEMS_GRID_COLUMNS,
    COST_ITEMS_GRID_MIN_WIDTH,
    COST_ITEMS_INPUT_WIDTH,
    COST_ITEMS_ROW_PADDING_LEFT,
} from './costItemsGrid';

type Props = {
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
    input: { width: COST_ITEMS_INPUT_WIDTH, flexShrink: 0 },
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
    line,
    onUpdate,
    onEdit,
    onDelete,
}) => {
    const { formatMessage } = useSafeIntl();
    const { currency, defaultBufferPercent } = useInterventionContext();
    const currencyAffixes = getCurrencyAffixes(currency);

    const handleEdit = useCallback(() => onEdit(line), [onEdit, line]);
    const handleDelete = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            onDelete(line);
        },
        [onDelete, line],
    );
    const handleUnitCostCommit = useCallback(
        (value: number | null) => {
            if (value !== null) {
                onUpdate(line.id, { unit_cost: value });
            }
        },
        [onUpdate, line.id],
    );
    const handleConversionFactorCommit = useCallback(
        (value: number | null) => {
            if (value !== null) {
                onUpdate(line.id, { conversion_factor: value });
            }
        },
        [onUpdate, line.id],
    );
    const handleBufferCommit = useCallback(
        (value: number | null) => onUpdate(line.id, { buffer: value }),
        [onUpdate, line.id],
    );
    const handleCoverageCommit = useCallback(
        (value: number | null) => {
            if (value !== null) {
                onUpdate(line.id, { coverage: value });
            }
        },
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
                <NumberInput
                    value={line.unit_cost}
                    onCommit={handleUnitCostCommit}
                    minDecimals={2}
                    maxDecimals={2}
                    min={0}
                    compact
                    sx={styles.input}
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
                <NumberInput
                    value={line.conversion_factor}
                    onCommit={handleConversionFactorCommit}
                    maxDecimals={6}
                    min={0}
                    sx={styles.input}
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

            <NumberInput
                value={line.buffer}
                onCommit={handleBufferCommit}
                maxDecimals={2}
                min={0}
                sx={styles.input}
                suffix="%"
                isNullable
                placeholder={String(defaultBufferPercent)}
                ariaLabel={formatMessage(MESSAGES.budgetingCostLineBuffer)}
            />

            <NumberInput
                value={line.coverage}
                onCommit={handleCoverageCommit}
                maxDecimals={2}
                min={0}
                sx={styles.input}
                suffix={line.is_proportional ? '%' : undefined}
                max={line.is_proportional ? 100 : undefined}
                ariaLabel={formatMessage(
                    line.is_proportional
                        ? MESSAGES.coverageLabel
                        : MESSAGES.quantityLabel,
                )}
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
