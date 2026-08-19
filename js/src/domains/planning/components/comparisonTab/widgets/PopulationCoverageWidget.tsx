import React, { FC } from 'react';
import { GroupsOutlined } from '@mui/icons-material';
import {
    Box,
    Grid,
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
    getSlotInterventionCoverage,
    mergeSlotRowsByIntervention,
} from '../../../libs/comparison-aggregation';
import { formatBigNumber, formatPercentValue } from '../../../libs/cost-utils';
import { OverlayGroupedBarChart } from './OverlayGroupedBarChart';

const CHART_HEIGHT = 320;

const styles = {
    chartBody: {
        height: CHART_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
    },
    tableBody: {
        height: CHART_HEIGHT,
        overflowY: 'auto',
    },
    sectionTitle: {
        fontWeight: 600,
        mb: 1,
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
                bodySx={styles.chartBody}
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
        <>
            <Typography variant="subtitle2" sx={styles.sectionTitle}>
                {titleWithYear}
            </Typography>
            <Grid container spacing={1} sx={{ flex: 1, minHeight: 0 }}>
                {slots.map((slot, index) => (
                    <Grid
                        item
                        xs={12}
                        md={12 / slots.length}
                        key={slot.key}
                        sx={{ height: '100%' }}
                    >
                        <WidgetCard
                        title={slot.label}
                        icon={GroupsOutlined}
                        iconSx={{ color: slot.color }}
                        isLoading={isBudgetLoading}
                        bodySx={styles.chartBody}
                    >
                        {coverageBySlotIndex[index].length === 0 ? (
                            <Typography variant="body2" color="textSecondary">
                                {formatMessage(MESSAGES.noBudgetData)}
                            </Typography>
                        ) : (
                            <Box sx={styles.tableBody}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>
                                                {formatMessage(
                                                    MESSAGES.comparisonIntervention,
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatMessage(
                                                    MESSAGES.comparisonPersonsAtRisk,
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatMessage(
                                                    MESSAGES.comparisonPercentEligible,
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatMessage(
                                                    MESSAGES.comparisonPercentTotalPop,
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {coverageBySlotIndex[index].map(
                                            row => (
                                                <TableRow key={row.interventionId}>
                                                    <TableCell>
                                                        {row.interventionLabel}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {formatBigNumber(
                                                            row.personsAtRisk,
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {formatPercentValue(
                                                            row.percentEligible,
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {percentOfTotal(
                                                            row.personsAtRisk,
                                                            totalPopulation,
                                                        ) ?? '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </WidgetCard>
                </Grid>
            ))}
            </Grid>
        </>
    );
};
