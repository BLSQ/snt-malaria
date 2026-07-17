import React, { FC, useMemo } from 'react';
import GroupsIcon from '@mui/icons-material/Groups';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import NumbersIcon from '@mui/icons-material/Numbers';
import {
    Box,
    IconButton,
    Stack,
    TableCell,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { pluralize } from '../../../../utils/pluralize';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { formatBigNumber, formatQuantity } from '../../libs/cost-utils';
import { YearlyCoverageInput } from './YearlyCoverageInput';

export type CostLineYearlyCoverage = {
    id: number;
    value: number;
};

export type CostLineRowData = {
    id: number;
    label: string;
    subLabel: string;
    isProportional: boolean;
    totalCost: number;
    quantity: number;
    coverageByYear: Record<number, CostLineYearlyCoverage>;
    unitCost: number;
    unitName: string;
    conversionFactor: number | null;
    invertedConversionFactor: boolean | null;
    targetPopulation: string | null;
    buffer: number;
};

type Props = {
    costLine: CostLineRowData;
    yearRange: number[];
    isEditable: boolean;
};

const styles = {
    costLineRow: { backgroundColor: '#f9f9f9', p: 1 },
    labelCell: { p: 2 },
    // Match the intervention chevron IconButton footprint so icon and label stay aligned.
    costDriverIconButton: {
        width: 34,
        height: 34,
        mr: 1,
        cursor: 'default',
        '&:hover': { backgroundColor: 'transparent' },
    },
    costDriverIcon: {
        fontSize: 18,
        color: 'text.secondary',
    },
    tooltip: { maxWidth: 750, width: 300, p: 1.5 },
    tooltipShort: { p: 1.5 },
    tooltipLabel: { whiteSpace: 'nowrap', width: 100 },
    tooltipLongText: {
        flex: 1,
        minWidth: 0,
        maxWidth: 200,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
} satisfies SxStyles;

const clampPercentage = (value: number) => {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.min(100, Math.max(0, value));
};

export const CostLineRow: FC<Props> = ({ costLine, yearRange, isEditable }) => {
    const { saveYearlyCoverage } = usePlanningContext();
    const [coverageInputsByYear, setCoverageInputsByYear] = React.useState<
        Record<number, string>
    >({});

    const defaultCoverage = costLine.isProportional ? 100 : 0;

    React.useEffect(() => {
        const nextCoverageInputsByYear: Record<number, string> = {};
        yearRange.forEach(year => {
            nextCoverageInputsByYear[year] = String(
                costLine.coverageByYear[year]?.value ?? defaultCoverage,
            );
        });
        setCoverageInputsByYear(nextCoverageInputsByYear);
    }, [costLine.coverageByYear, yearRange, defaultCoverage]);

    const handleCoverageChange = React.useCallback(
        (year: number, nextValue: string) => {
            setCoverageInputsByYear(current => ({
                ...current,
                [year]: nextValue,
            }));

            if (nextValue.trim() === '') {
                return;
            }

            const parsedValue = Number(nextValue);
            if (!Number.isFinite(parsedValue)) {
                return;
            }

            saveYearlyCoverage({
                assignmentId: costLine.coverageByYear[year]?.id,
                costLineId: costLine.id,
                year,
                value: parsedValue,
            });
        },
        [costLine, saveYearlyCoverage],
    );

    const normalizeCoverageValue = React.useCallback(
        (year: number) => {
            if (!costLine.isProportional) return;

            setCoverageInputsByYear(current => {
                const rawValue = current[year] ?? '';
                if (rawValue.trim() === '') {
                    return {
                        ...current,
                        [year]: String(
                            costLine.coverageByYear[year]?.value ??
                                defaultCoverage,
                        ),
                    };
                }

                const parsedValue = Number(rawValue);
                if (!Number.isFinite(parsedValue)) {
                    return {
                        ...current,
                        [year]: String(
                            costLine.coverageByYear[year]?.value ??
                                defaultCoverage,
                        ),
                    };
                }

                return {
                    ...current,
                    [year]: String(clampPercentage(parsedValue)),
                };
            });
        },
        [costLine, defaultCoverage],
    );

    return (
        <TableRow sx={styles.costLineRow}>
            <TableCell align="left" colSpan={2} sx={styles.labelCell}>
                <CostDriverIcon isProportional={costLine.isProportional} />
                <Typography variant="body2" component="span">
                    {costLine.label}
                </Typography>
            </TableCell>
            {yearRange.map(year => (
                <TableCell
                    key={`cost_line_${costLine.label}_${year}`}
                    align="center"
                >
                    <CostDriverTooltip isProportional={costLine.isProportional}>
                        <Box component="span" display="inline-flex">
                            <YearlyCoverageInput
                                value={coverageInputsByYear[year]}
                                onChange={nextValue =>
                                    handleCoverageChange(year, nextValue)
                                }
                                onBlur={() => normalizeCoverageValue(year)}
                                disabled={!isEditable}
                                percentage={costLine.isProportional}
                            />
                        </Box>
                    </CostDriverTooltip>
                </TableCell>
            ))}
            <TableCell align="right">
                <Typography variant="body2" component="div">
                    {formatBigNumber(costLine.totalCost)}
                </Typography>
                {costLine.unitName && costLine.quantity > 0 && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        component="div"
                    >
                        {formatQuantity(costLine.quantity)}{' '}
                        {pluralize(costLine.unitName, costLine.quantity)}
                    </Typography>
                )}
            </TableCell>
            <TableCell align="center">
                <CostLineTooltip costLine={costLine} />
            </TableCell>
        </TableRow>
    );
};

type CostDriverTooltipProps = {
    isProportional: boolean;
    children: React.ReactElement;
    /** When true, show the short definition only (no description). */
    short?: boolean;
};

const useCostDriverTooltipContent = (
    isProportional: boolean,
    short: boolean,
): React.ReactNode => {
    const { formatMessage } = useSafeIntl();
    const name = formatMessage(
        isProportional
            ? MESSAGES.budgetingCostLineProportionalLabel
            : MESSAGES.budgetingCostLineFixedLabel,
    );
    if (short) {
        return name;
    }
    const description = formatMessage(
        isProportional
            ? MESSAGES.budgetingCostLineProportionalTooltip
            : MESSAGES.budgetingCostLineFixedTooltip,
    );
    return (
        <>
            <b>{name}</b>: {description}
        </>
    );
};

const CostDriverTooltip: FC<CostDriverTooltipProps> = ({
    isProportional,
    children,
    short = false,
}) => {
    const tooltipContent = useCostDriverTooltipContent(isProportional, short);
    return (
        <Tooltip
            arrow={true}
            placement="top-end"
            componentsProps={{
                tooltip: { sx: short ? styles.tooltipShort : styles.tooltip },
            }}
            title={<Typography variant="body2">{tooltipContent}</Typography>}
        >
            {children}
        </Tooltip>
    );
};

type CostDriverIconProps = {
    isProportional: boolean;
};

const CostDriverIcon: FC<CostDriverIconProps> = ({ isProportional }) => (
    <CostDriverTooltip isProportional={isProportional} short>
        <IconButton size="small" disableRipple sx={styles.costDriverIconButton}>
            {isProportional ? (
                <GroupsIcon sx={styles.costDriverIcon} />
            ) : (
                <NumbersIcon sx={styles.costDriverIcon} />
            )}
        </IconButton>
    </CostDriverTooltip>
);

type TooltipProps = {
    costLine: CostLineRowData;
};

export const CostLineTooltip: FC<TooltipProps> = ({ costLine }) => {
    const { formatMessage } = useSafeIntl();
    const bufferPercent = Math.round((costLine.buffer - 1) * 100);
    const unitLabel = useMemo(
        () =>
            (!costLine.unitName &&
                formatMessage(MESSAGES.budgetingCostLineConversionFactor)) ||
            (costLine.invertedConversionFactor
                ? formatMessage(MESSAGES.budgetingCostLinePeoplePerUnit, {
                      unit: costLine.unitName,
                  })
                : formatMessage(MESSAGES.budgetingCostLineUnitPerPeople, {
                      unit: pluralize(
                          costLine.unitName,
                          costLine.conversionFactor ?? 1,
                      ),
                  })),
        [
            costLine.unitName,
            costLine.invertedConversionFactor,
            costLine.conversionFactor,
            formatMessage,
        ],
    );
    return (
        <Tooltip
            arrow={true}
            placement="top-end"
            componentsProps={{
                tooltip: { sx: styles.tooltip },
            }}
            title={
                <Box>
                    <Typography mb={2}>{costLine.label}</Typography>
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">
                            {formatMessage(MESSAGES.budgetingCostLineUnitCost)}
                            {costLine.unitName && (
                                <>
                                    {' '}
                                    (<b>{costLine.unitName}</b>)
                                </>
                            )}
                        </Typography>
                        <Typography variant="body2" textAlign={'right'}>
                            ${costLine.unitCost.toFixed(2)}
                        </Typography>
                    </Stack>
                    {costLine.targetPopulation && (
                        <Stack direction="row" alignItems="flex-start" gap={2}>
                            <Typography
                                variant="body2"
                                sx={styles.tooltipLabel}
                            >
                                {formatMessage(
                                    MESSAGES.budgetingCostLineTargetPop,
                                )}
                            </Typography>
                            <Tooltip
                                title={costLine.targetPopulation}
                                placement="top"
                                disableInteractive
                            >
                                <Typography
                                    variant="body2"
                                    textAlign="right"
                                    sx={styles.tooltipLongText}
                                >
                                    {costLine.targetPopulation}
                                </Typography>
                            </Tooltip>
                        </Stack>
                    )}
                    {costLine.isProportional &&
                        costLine.conversionFactor !== null && (
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                            >
                                <Typography variant="body2">
                                    {unitLabel}
                                </Typography>
                                <Typography variant="body2" textAlign="right">
                                    {costLine.conversionFactor?.toFixed(2)}
                                </Typography>
                            </Stack>
                        )}
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">
                            {formatMessage(MESSAGES.budgetingCostLineBuffer)}
                        </Typography>
                        <Typography variant="body2" textAlign={'right'}>
                            {bufferPercent}%
                        </Typography>
                    </Stack>
                </Box>
            }
        >
            <InfoIcon fontSize="medium" />
        </Tooltip>
    );
};
