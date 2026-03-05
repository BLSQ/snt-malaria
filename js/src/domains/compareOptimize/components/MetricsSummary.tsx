import React, { FC, ReactNode, useMemo } from 'react';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SentimentVeryDissatisfiedOutlinedIcon from '@mui/icons-material/SentimentVeryDissatisfiedOutlined';
import { Box, Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
import { formatBigNumber } from '../../planning/libs/cost-utils';
import { BudgetCalculationResponse } from '../../planning/types/budget';
import { ScenarioImpactMetrics, ScenarioDisplay } from '../types';
import {
    formatPercent,
    getCumulativeCosts,
    getPfprReduction,
    nullToUndefined,
} from '../utils/impactCalculations';
import { Card } from './Card';
import {
    DeltaChip,
    getDeltaChip,
    type DeltaChipOptions,
    type DeltaChipProps,
} from './DeltaChip';

const styles = {
    valuesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        mb: 1.5,
    },
    valueRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontWeight: 400,
        fontSize: '1.5rem',
        lineHeight: 1.2,
        m: 0,
    },
    dot: {
        width: theme => theme.spacing(1.75),
        height: theme => theme.spacing(1.75),
        borderRadius: '50%',
        flex: '0 0 auto',
    },
    subtext: {
        color: 'text.secondary',
    },
} satisfies SxStyles;

type MetricRow = {
    id: number;
    color: string;
    isBaseline: boolean;
    value: string;
    chip?: DeltaChipProps;
};

type MetricCardProps = {
    title: string;
    icon: React.ElementType;
    isLoading: boolean;
    values: MetricRow[];
    keyPrefix: string;
    subtext?: ReactNode;
};

const MetricCard: FC<MetricCardProps> = ({
    title,
    icon,
    isLoading,
    values,
    keyPrefix,
    subtext,
}) => (
    <Grid item xs={12} md={3}>
        <Card title={title} icon={icon} isLoading={isLoading}>
            <Box sx={styles.valuesList}>
                {values.map(row => (
                    <Typography
                        key={`${keyPrefix}-${row.id}`}
                        variant="h6"
                        sx={[
                            styles.valueRow,
                            row.isBaseline && {
                                color: 'text.secondary',
                            },
                        ]}
                    >
                        <Box
                            component="span"
                            sx={[
                                styles.dot,
                                { backgroundColor: row.color },
                            ]}
                        />
                        {row.value}
                        {row.chip && <DeltaChip {...row.chip} />}
                    </Typography>
                ))}
            </Box>
            {subtext}
        </Card>
    </Grid>
);

const buildMetricRows = <TData,>(
    scenarios: ScenarioDisplay[],
    dataMap: Map<number, TData | undefined>,
    extractor: (data: TData | undefined) => number | undefined,
    formatter: (v: number) => string,
    delta: DeltaChipOptions,
): MetricRow[] => {
    const baselineId = scenarios[0]?.id;
    const baselineValue =
        baselineId !== undefined
            ? nullToUndefined(extractor(dataMap.get(baselineId)))
            : undefined;

    return scenarios.map(scenario => {
        const raw = nullToUndefined(extractor(dataMap.get(scenario.id)));
        const isBaseline = scenario.id === baselineId;
        return {
            id: scenario.id,
            color: scenario.color,
            isBaseline,
            value: raw === undefined ? '-' : formatter(raw),
            chip: isBaseline
                ? undefined
                : getDeltaChip(raw, baselineValue, delta),
        };
    });
};

type Props = {
    scenarios: ScenarioDisplay[];
    budgetsByScenarioId: Map<number, BudgetCalculationResponse | undefined>;
    impactsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>;
    isBudgetLoading: boolean;
    isImpactLoading: boolean;
    targetYear?: number;
    yearFrom?: number;
};

export const MetricsSummary: FC<Props> = ({
    scenarios,
    budgetsByScenarioId,
    impactsByScenarioId,
    isBudgetLoading,
    isImpactLoading,
    targetYear,
}) => {
    const { formatMessage } = useSafeIntl();

    const baselineId = scenarios[0]?.id;

    const baselineTargetYearData = useMemo(() => {
        if (baselineId === undefined || targetYear === undefined)
            return undefined;
        const impact = impactsByScenarioId.get(baselineId);
        return impact?.by_year?.find(yr => yr.year === targetYear);
    }, [baselineId, targetYear, impactsByScenarioId]);

    const casesValues = useMemo(
        () =>
            buildMetricRows(scenarios, impactsByScenarioId, d => d?.number_cases?.value ?? undefined, formatBigNumber, {
                relative: true,
                positiveIsGreen: false,
            }),
        [scenarios, impactsByScenarioId],
    );
    const severeCasesValues = useMemo(
        () =>
            buildMetricRows(scenarios, impactsByScenarioId, d => d?.number_severe_cases?.value ?? undefined, formatBigNumber, {
                relative: true,
                positiveIsGreen: false,
            }),
        [scenarios, impactsByScenarioId],
    );
    const pfprValues = useMemo(
        () =>
            buildMetricRows(scenarios, impactsByScenarioId, getPfprReduction, formatPercent, {
                relative: false,
                positiveIsGreen: true,
            }),
        [scenarios, impactsByScenarioId],
    );
    const costsValues = useMemo(
        () =>
            buildMetricRows(scenarios, budgetsByScenarioId, getCumulativeCosts, formatBigNumber, {
                relative: true,
                positiveIsGreen: false,
            }),
        [scenarios, budgetsByScenarioId],
    );

    const targetYearSubtext = (
        metricField: 'number_cases' | 'number_severe_cases' | 'prevalence_rate',
        formatter: (v: number) => string,
    ) => {
        if (!targetYear || !baselineTargetYearData) return undefined;
        const metricValue = baselineTargetYearData[metricField]?.value;
        return (
            <Typography variant="caption" sx={styles.subtext}>
                {formatMessage(MESSAGES.impactTargetLabel, {
                    year: targetYear,
                    value:
                        metricValue != null ? formatter(metricValue) : '-',
                })}
            </Typography>
        );
    };

    return (
        <Grid container spacing={1}>
            <MetricCard
                title={formatMessage(MESSAGES.impactCases)}
                icon={PersonOutlineOutlinedIcon}
                isLoading={isImpactLoading}
                values={casesValues}
                keyPrefix="cases"
                subtext={targetYearSubtext('number_cases', formatBigNumber)}
            />
            <MetricCard
                title={formatMessage(MESSAGES.impactSevereCases)}
                icon={SentimentVeryDissatisfiedOutlinedIcon}
                isLoading={isImpactLoading}
                values={severeCasesValues}
                keyPrefix="severe"
                subtext={targetYearSubtext(
                    'number_severe_cases',
                    formatBigNumber,
                )}
            />
            <MetricCard
                title={formatMessage(MESSAGES.impactPfprReduction)}
                icon={TrendingDownOutlinedIcon}
                isLoading={isImpactLoading}
                values={pfprValues}
                keyPrefix="pfpr"
                subtext={targetYearSubtext('prevalence_rate', formatPercent)}
            />
            <MetricCard
                title={formatMessage(MESSAGES.impactTotalCosts)}
                icon={MonetizationOnOutlinedIcon}
                isLoading={isBudgetLoading}
                values={costsValues}
                keyPrefix="total-costs"
            />
        </Grid>
    );
};
