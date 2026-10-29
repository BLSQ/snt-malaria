import React, { FC, memo, useCallback, useMemo } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupsIcon from '@mui/icons-material/Groups';
import NumbersIcon from '@mui/icons-material/Numbers';
import {
    Box,
    IconButton,
    MenuItem,
    Select,
    SelectChangeEvent,
    Tooltip,
    Typography,
} from '@mui/material';
import { getCurrencyAffixes, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { DropdownOptions } from 'Iaso/types/utils';
import { NumberInput } from '../../../../components/NumberInput';
import { useInterventionContext } from '../../../interventions/contexts/InterventionContext';
import { InterventionCostBreakdownLine } from '../../../interventions/types';
import { formatConversionDirection } from '../../../interventions/utils/costBreakdownLine';
import { MESSAGES } from '../../../messages';
import { LineHandler, PartialLineHandler } from '../types';
import { COST_ITEMS_COLUMNS, costItemsRowLayout } from './costItemsColumns';

type EditableField = 'unit_cost' | 'conversion_factor' | 'buffer' | 'coverage';

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

const caption = {
    color: 'text.secondary',
    lineHeight: 1.3,
    ...ellipsis,
};

const styles = {
    row: {
        ...costItemsRowLayout,
        py: 1,
        '&:hover': { backgroundColor: 'action.hover' },
        '&:hover .costItemAction, &:focus-within .costItemAction': {
            opacity: 1,
        },
    },
    nameCell: {
        ...COST_ITEMS_COLUMNS.name,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
    },
    unitCost: COST_ITEMS_COLUMNS.unitCost,
    unitCostCaption: { ...COST_ITEMS_COLUMNS.unitCostCaption, ...caption },
    targetPopulation: COST_ITEMS_COLUMNS.targetPopulation,
    factor: COST_ITEMS_COLUMNS.factor,
    factorCaption: { ...COST_ITEMS_COLUMNS.factorCaption, ...caption },
    buffer: COST_ITEMS_COLUMNS.buffer,
    coverage: COST_ITEMS_COLUMNS.coverage,
    select: {
        height: 28,
        width: '100%',
        typography: 'body2',
        backgroundColor: 'background.paper',
        '&.Mui-disabled': { backgroundColor: 'grey.100', opacity: 0.45 },
        '& .MuiSelect-select': { py: 0, ...ellipsis },
    },
    basisIcon: { color: 'text.secondary', display: 'flex' },
    name: ellipsis,
    mutedCaption: { color: 'text.disabled', lineHeight: 1.3, ...ellipsis },
    actions: { ...COST_ITEMS_COLUMNS.actions, display: 'flex' },
    edit: {
        opacity: 0,
        transition: 'opacity 0.2s',
        color: 'text.disabled',
        '&:hover': { color: 'primary.main' },
    },
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
    const { currency, defaultBufferPercent, populationOptions } =
        useInterventionContext();
    const currencyAffixes = getCurrencyAffixes(currency);

    const handleEdit = useCallback(() => onEdit(line), [onEdit, line]);
    const handleDelete = useCallback(() => onDelete(line), [onDelete, line]);
    const handleFieldCommit = useMemo(() => {
        const commitField = (field: EditableField) => (value: number | null) =>
            onUpdate(line.id, { [field]: value });
        return {
            unitCost: commitField('unit_cost'),
            conversionFactor: commitField('conversion_factor'),
            buffer: commitField('buffer'),
            coverage: commitField('coverage'),
        };
    }, [onUpdate, line.id]);
    const handlePopulationChange = useCallback(
        (event: SelectChangeEvent<number | ''>) =>
            onUpdate(line.id, {
                population_layer: Number(event.target.value),
                population_layer_label:
                    populationOptions.find(
                        option => option.value === event.target.value,
                    )?.label ?? null,
            }),
        [onUpdate, line.id, populationOptions],
    );

    return (
        <Box sx={styles.row}>
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

            <NumberInput
                value={line.unit_cost}
                onCommit={handleFieldCommit.unitCost}
                minDecimals={2}
                maxDecimals={2}
                min={0}
                compact
                sx={styles.unitCost}
                prefix={currencyAffixes.prefix}
                suffix={currencyAffixes.suffix}
                ariaLabel={formatMessage(MESSAGES.budgetingCostLineUnitCost)}
            />
            <Typography variant="caption" sx={styles.unitCostCaption}>
                {formatMessage(MESSAGES.perUnit, {
                    unit: line.unit_type_label,
                })}
            </Typography>

            <Box sx={styles.targetPopulation}>
                <Select
                    size="small"
                    value={
                        (line.is_proportional && line.population_layer) || ''
                    }
                    onChange={handlePopulationChange}
                    disabled={!line.is_proportional}
                    sx={styles.select}
                    inputProps={{
                        'aria-label': formatMessage(
                            MESSAGES.targetPopulationLabel,
                        ),
                    }}
                >
                    {populationOptions
                        .filter(
                            (option): option is DropdownOptions<number> =>
                                option.value !== null,
                        )
                        .map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                </Select>
            </Box>

            <NumberInput
                value={line.conversion_factor}
                onCommit={handleFieldCommit.conversionFactor}
                maxDecimals={6}
                min={0}
                sx={styles.factor}
                disabled={!line.is_proportional}
                ariaLabel={formatMessage(
                    MESSAGES.budgetingCostLineConversionFactor,
                )}
            />
            <Typography variant="caption" sx={styles.factorCaption}>
                {line.is_proportional
                    ? formatConversionDirection(
                          formatMessage,
                          line.unit_type_label,
                          line.conversion_factor,
                          line.invert_conversion_factor,
                      )
                    : formatMessage(MESSAGES.fixedCost)}
            </Typography>

            <NumberInput
                value={line.buffer}
                onCommit={handleFieldCommit.buffer}
                maxDecimals={2}
                min={0}
                sx={styles.buffer}
                suffix="%"
                isNullable
                placeholder={String(defaultBufferPercent)}
                ariaLabel={formatMessage(MESSAGES.budgetingCostLineBuffer)}
            />

            <NumberInput
                value={line.coverage}
                onCommit={handleFieldCommit.coverage}
                maxDecimals={2}
                min={0}
                sx={styles.coverage}
                suffix={line.is_proportional ? '%' : undefined}
                max={line.is_proportional ? 100 : undefined}
                ariaLabel={formatMessage(
                    line.is_proportional
                        ? MESSAGES.coverageLabel
                        : MESSAGES.quantityLabel,
                )}
            />

            <Box sx={styles.actions}>
                <Tooltip title={formatMessage(MESSAGES.editCostItem)}>
                    <IconButton
                        size="small"
                        className="costItemAction"
                        sx={styles.edit}
                        onClick={handleEdit}
                        aria-label={formatMessage(MESSAGES.editCostItem)}
                    >
                        <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={formatMessage(MESSAGES.deleteCostItem)}>
                    <IconButton
                        size="small"
                        className="costItemAction"
                        sx={styles.delete}
                        onClick={handleDelete}
                        aria-label={formatMessage(MESSAGES.deleteCostItem)}
                    >
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};

export const CostItemRow = memo(CostItemRowComponent);
