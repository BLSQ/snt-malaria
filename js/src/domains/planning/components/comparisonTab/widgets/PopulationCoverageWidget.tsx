import React, { FC } from 'react';
import { GroupsOutlined } from '@mui/icons-material';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { ChartTooltip } from '../../../../../components/charts/ChartTooltip';
import { WidgetCard } from '../../../../../components/WidgetCard';
import { MESSAGES } from '../../../../messages';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import {
    InterventionCoverage,
    getSlotInterventionCoverage,
    mergeSlotRowsByIntervention,
} from '../../../libs/comparison-aggregation';
import { formatBigNumber, formatPercentValue } from '../../../libs/cost-utils';
import { OverlayGroupedBarChart } from './OverlayGroupedBarChart';
import { SideBySideWidgetGrid } from './SideBySideWidgetGrid';

const CHART_HEIGHT = 320;

const styles = {
    body: {
        height: CHART_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
    },
    tableScrollArea: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
    },
} satisfies SxStyles;

const percentOfTotal = (value: number, total?: number): string | undefined =>
    total ? formatPercentValue(value / total) : undefined;

export const PopulationCoverageWidget: FC = () => {
    const { formatMessage } = useSafeIntl();
    const {
        slots,
        budgetsBySlotKey,
        isBudgetLoading,
        displayMode,
        totalPopulation,
        populationYear,
    } = useScenarioComparisonContext();

    const coverageBySlotIndex = slots.map(slot =>
        getSlotInterventionCoverage(budgetsBySlotKey.get(slot.key)),
    );

    const title = formatMessage(MESSAGES.comparisonPopulationCoverageTitle);
    const titleWithYear =
        populationYear != null ? `${title} (${populationYear})` : title;

    if (displayMode === 'overlay') {
        const rowsBySlotKey = new Map(
            slots.map((slot, index) => [
                slot.key,
                coverageBySlotIndex[index].map(row => ({
                    interventionId: row.interventionId,
                    interventionLabel: row.interventionLabel,
                    value: row.personsAtRisk,
                })),
            ]),
        );
        const rows = mergeSlotRowsByIntervention(rowsBySlotKey);
        const coverageBySlotKeyByIntervention = new Map(
            rows.map(row => [
                row.interventionId,
                new Map(
                    slots.map((slot, index) => [
                        slot.key,
                        coverageBySlotIndex[index].find(
                            r => r.interventionId === row.interventionId,
                        ),
                    ]),
                ),
            ]),
        );

        return (
            <WidgetCard
                title={titleWithYear}
                icon={GroupsOutlined}
                isLoading={isBudgetLoading}
                bodySx={styles.body}
            >
                <OverlayGroupedBarChart
                    rows={rows}
                    slots={slots}
                    valueFormatter={value => formatBigNumber(value)}
                    emptyMessage={formatMessage(MESSAGES.noBudgetData)}
                    renderTooltip={row => {
                        const bySlotKey =
                            coverageBySlotKeyByIntervention.get(
                                row.interventionId,
                            ) ?? new Map();
                        return (
                            <ChartTooltip
                                title={row.interventionLabel}
                                rows={slots.map(slot => {
                                    const coverage = bySlotKey.get(slot.key);
                                    const percentTotal = coverage
                                        ? percentOfTotal(
                                              coverage.personsAtRisk,
                                              totalPopulation,
                                          )
                                        : undefined;
                                    const parts = [
                                        formatMessage(
                                            MESSAGES.comparisonPersonsAtRisk,
                                        ),
                                        coverage
                                            ? formatBigNumber(
                                                  coverage.personsAtRisk,
                                              )
                                            : '-',
                                    ];
                                    if (coverage) {
                                        parts.push(
                                            `${formatMessage(MESSAGES.comparisonPercentEligible)} ${formatPercentValue(coverage.percentEligible)}`,
                                        );
                                    }
                                    if (percentTotal) {
                                        parts.push(
                                            `${formatMessage(MESSAGES.comparisonPercentTotalPop)} ${percentTotal}`,
                                        );
                                    }
                                    return {
                                        label: slot.label,
                                        value: parts.join(' · '),
                                        color: slot.color,
                                    };
                                })}
                            />
                        );
                    }}
                />
            </WidgetCard>
        );
    }

    return (
        <SideBySideWidgetGrid
            slots={slots}
            title={titleWithYear}
            icon={GroupsOutlined}
            isLoading={isBudgetLoading}
            bodySx={styles.body}
        >
            {(_slot, index) =>
                coverageBySlotIndex[index].length === 0 ? (
                    <Typography variant="body2" color="textSecondary">
                        {formatMessage(MESSAGES.noBudgetData)}
                    </Typography>
                ) : (
                    <CoverageTable
                        rows={coverageBySlotIndex[index]}
                        totalPopulation={totalPopulation}
                    />
                )
            }
        </SideBySideWidgetGrid>
    );
};

type CoverageTableProps = {
    rows: InterventionCoverage[];
    totalPopulation?: number;
};

const CoverageTable: FC<CoverageTableProps> = ({ rows, totalPopulation }) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Box sx={styles.tableScrollArea}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>
                            {formatMessage(MESSAGES.comparisonIntervention)}
                        </TableCell>
                        <TableCell align="right">
                            {formatMessage(MESSAGES.comparisonPersonsAtRisk)}
                        </TableCell>
                        <TableCell align="right">
                            {formatMessage(MESSAGES.comparisonPercentEligible)}
                        </TableCell>
                        <TableCell align="right">
                            {formatMessage(MESSAGES.comparisonPercentTotalPop)}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map(row => (
                        <TableRow key={row.interventionId}>
                            <TableCell>{row.interventionLabel}</TableCell>
                            <TableCell align="right">
                                {formatBigNumber(row.personsAtRisk)}
                            </TableCell>
                            <TableCell align="right">
                                {formatPercentValue(row.percentEligible)}
                            </TableCell>
                            <TableCell align="right">
                                {percentOfTotal(
                                    row.personsAtRisk,
                                    totalPopulation,
                                ) ?? '-'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
};
