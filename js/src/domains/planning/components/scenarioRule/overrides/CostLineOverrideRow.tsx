import React, { FC, MouseEvent, useCallback, useMemo } from 'react';
import GroupsIcon from '@mui/icons-material/Groups';
import TagIcon from '@mui/icons-material/Tag';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, Button, Tooltip, Typography } from '@mui/material';
import { getCurrencyAffixes, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import {
    HoverSwapTile,
    hoverSwapTileTrigger,
} from '../../../../../components/HoverSwapTile';
import { overrideColors } from '../../../../../constants/overrideColors';
import { InterventionCostBreakdownLine } from '../../../../interventions/types';
import {
    formatConversionDirection,
    getDefaultCoverage,
} from '../../../../interventions/utils/costBreakdownLine';
import { MESSAGES } from '../../../../messages';
import {
    CostLineValueField,
    countCostLineOverrides,
    emptyCostLineOverride,
    getYearCoverage,
    setYearCoverage,
} from '../../../libs/override-utils';
import { RuleCostLineOverride } from '../../../types/scenarioRule';
import {
    CoverageYearCell,
    NotApplicableCell,
    OverrideValueCell,
} from './OverrideCells';
import {
    getOverridesGridColumns,
    getStickyCellStyles,
    OVERRIDES_ROW_TILE_SIZE,
    OVERRIDES_HOVER_ROW_CLASS,
    overridesGridStyles,
} from './overridesGrid';

const ellipsis = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

const styles = {
    row: {
        ...overridesGridStyles.row,
        py: '6px',
    },
    revertableRow: hoverSwapTileTrigger,
    nameCell: {
        ...getStickyCellStyles('6px'),
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: 0,
    },
    revertButton: {
        color: 'primary.main',
        '&:hover': { backgroundColor: overrideColors.actionHoverBackground },
    },
    labels: { minWidth: 0, flex: '1 1 auto' },
    name: { ...ellipsis, fontWeight: 'medium' },
    caption: { color: 'text.secondary', ...ellipsis },
} satisfies SxStyles;

const toNumberOrNull = (value: number | string | null) =>
    value === null || value === '' ? null : Number(value);

type Props = {
    line: InterventionCostBreakdownLine;
    costLineOverride?: RuleCostLineOverride;
    years: number[];
    deployedYears: number[];
    currency: string;
    defaultBufferPercent: number;
    isCompact: boolean;
    onChange: (next: RuleCostLineOverride) => void;
};

export const CostLineOverrideRow: FC<Props> = ({
    line,
    costLineOverride,
    years,
    deployedYears,
    currency,
    defaultBufferPercent,
    isCompact,
    onChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const currencyAffixes = getCurrencyAffixes(currency);
    const current = useMemo(
        () => costLineOverride ?? emptyCostLineOverride(line.id),
        [costLineOverride, line.id],
    );
    const hasOverrides = countCostLineOverrides(costLineOverride) > 0;
    const rowSx = useMemo(
        () => [
            styles.row,
            hasOverrides && isCompact && styles.revertableRow,
            {
                gridTemplateColumns: getOverridesGridColumns(
                    years.length,
                    isCompact,
                ),
            },
        ],
        [hasOverrides, isCompact, years.length],
    );

    const lineCoverage = toNumberOrNull(line.coverage);
    const deployedCoverage =
        current.coverage ??
        lineCoverage ??
        getDefaultCoverage(line.is_proportional);

    const handleValueCommit = useCallback(
        (field: CostLineValueField, value: number | null) =>
            onChange({ ...current, [field]: value }),
        [current, onChange],
    );
    const handleYearChange = useCallback(
        (year: number, coverage: number | null) =>
            onChange(setYearCoverage(current, year, coverage)),
        [current, onChange],
    );
    const handleRevert = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            onChange(emptyCostLineOverride(line.id));
        },
        [line.id, onChange],
    );

    const caption = line.is_proportional
        ? formatConversionDirection(
              formatMessage,
              line.unit_type_label,
              line.conversion_factor,
              line.invert_conversion_factor,
          )
        : formatMessage(MESSAGES.fixedCountCaption, {
              unit: line.unit_type_label,
          });

    return (
        <Box className={OVERRIDES_HOVER_ROW_CLASS} sx={rowSx}>
            <Box sx={styles.nameCell}>
                <HoverSwapTile
                    size={OVERRIDES_ROW_TILE_SIZE}
                    tile={
                        <Tooltip
                            title={formatMessage(
                                line.is_proportional
                                    ? MESSAGES.costItemProportionalLabel
                                    : MESSAGES.costItemFixedLabel,
                            )}
                        >
                            <Box
                                component="span"
                                sx={overridesGridStyles.tile}
                            >
                                {line.is_proportional ? (
                                    <GroupsIcon
                                        sx={overridesGridStyles.smallIcon}
                                    />
                                ) : (
                                    <TagIcon
                                        sx={overridesGridStyles.smallIcon}
                                    />
                                )}
                            </Box>
                        </Tooltip>
                    }
                    actionIcon={
                        hasOverrides &&
                        isCompact && (
                            <UndoIcon sx={overridesGridStyles.smallIcon} />
                        )
                    }
                    actionLabel={formatMessage(MESSAGES.revertLineTooltip)}
                    onAction={handleRevert}
                    actionSx={styles.revertButton}
                />
                <Box sx={styles.labels}>
                    <Typography
                        variant="body2"
                        title={line.name}
                        sx={styles.name}
                    >
                        {line.name}
                    </Typography>
                    <Typography
                        variant="caption"
                        component="div"
                        title={caption}
                        sx={styles.caption}
                    >
                        {caption}
                    </Typography>
                </Box>
                {hasOverrides && !isCompact && (
                    <Tooltip title={formatMessage(MESSAGES.revertLineTooltip)}>
                        <Button
                            size="small"
                            startIcon={
                                <UndoIcon sx={overridesGridStyles.smallIcon} />
                            }
                            onClick={handleRevert}
                            sx={overridesGridStyles.textAction}
                        >
                            {formatMessage(MESSAGES.revertLine)}
                        </Button>
                    </Tooltip>
                )}
            </Box>
            <OverrideValueCell
                field="unit_cost"
                label={formatMessage(MESSAGES.budgetingCostLineUnitCost)}
                value={current.unit_cost}
                defaultValue={toNumberOrNull(line.unit_cost)}
                lineName={line.name}
                onCommit={handleValueCommit}
                minDecimals={2}
                maxDecimals={2}
                prefix={currencyAffixes.prefix}
                suffix={currencyAffixes.suffix}
                compact
            />
            {line.is_proportional ? (
                <OverrideValueCell
                    field="conversion_factor"
                    label={formatMessage(MESSAGES.conversionFactorShort)}
                    value={current.conversion_factor}
                    defaultValue={toNumberOrNull(line.conversion_factor)}
                    lineName={line.name}
                    onCommit={handleValueCommit}
                    maxDecimals={6}
                />
            ) : (
                <NotApplicableCell />
            )}
            <OverrideValueCell
                field="buffer"
                label={formatMessage(MESSAGES.budgetingCostLineBuffer)}
                value={current.buffer}
                defaultValue={toNumberOrNull(line.buffer) ?? defaultBufferPercent}
                lineName={line.name}
                onCommit={handleValueCommit}
                maxDecimals={2}
                suffix="%"
            />
            <OverrideValueCell
                field="coverage"
                label={formatMessage(
                    line.is_proportional
                        ? MESSAGES.coverageLabel
                        : MESSAGES.quantityLabel,
                )}
                value={current.coverage}
                defaultValue={lineCoverage}
                lineName={line.name}
                onCommit={handleValueCommit}
                maxDecimals={2}
                max={line.is_proportional ? 100 : undefined}
                suffix={line.is_proportional ? '%' : undefined}
            />
            <span />
            {years.map(year => (
                <CoverageYearCell
                    key={year}
                    year={year}
                    yearCoverage={getYearCoverage(current, year)}
                    isDeployed={deployedYears.includes(year)}
                    deployedCoverage={deployedCoverage}
                    isQuantity={!line.is_proportional}
                    lineName={line.name}
                    onChange={handleYearChange}
                />
            ))}
        </Box>
    );
};
