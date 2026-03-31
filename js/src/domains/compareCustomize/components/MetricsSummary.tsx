import React, { FC, useMemo } from 'react';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SentimentVeryDissatisfiedOutlinedIcon from '@mui/icons-material/SentimentVeryDissatisfiedOutlined';
import { Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
import {
    formatBigNumber,
    formatPercentValue,
} from '../../planning/libs/cost-utils';
import { useComparisonDataContext } from '../ComparisonDataContext';
import {
    getCumulativeCosts,
    getPfprReduction,
} from '../utils/impactCalculations';
import { MetricCard, buildMetricEntries } from './MetricCard';

const styles = {
    subtext: {
        color: 'text.secondary',
    },
} satisfies SxStyles;

export const MetricsSummary: FC = () => {
    const {
        scenarios,
        budgetsByScenarioId,
        impactsByScenarioId,
        isBudgetLoading,
        isImpactLoading,
        targetYear,
    } = useComparisonDataContext();
    const { formatMessage } = useSafeIntl();

    const baselineId = scenarios[0]?.id;

    const baselineTargetYearData = useMemo(() => {
        if (baselineId === undefined || targetYear === undefined)
            return undefined;
        const impact = impactsByScenarioId.get(baselineId);
        return impact?.by_year?.find(yr => yr.year === targetYear);
    }, [baselineId, targetYear, impactsByScenarioId]);

    const casesEntries = useMemo(
        () =>
            buildMetricEntries(scenarios, impactsByScenarioId, d => d?.number_cases?.value ?? undefined, formatBigNumber, {
                relative: true,
                positiveIsGreen: false,
            }),
        [scenarios, impactsByScenarioId],
    );
    const severeCasesEntries = useMemo(
        () =>
            buildMetricEntries(scenarios, impactsByScenarioId, d => d?.number_severe_cases?.value ?? undefined, formatBigNumber, {
                relative: true,
                positiveIsGreen: false,
            }),
        [scenarios, impactsByScenarioId],
    );
    const pfprEntries = useMemo(
        () =>
            buildMetricEntries(scenarios, impactsByScenarioId, getPfprReduction, formatPercentValue, {
                relative: false,
                positiveIsGreen: true,
            }),
        [scenarios, impactsByScenarioId],
    );
    const costsEntries = useMemo(
        () =>
            buildMetricEntries(scenarios, budgetsByScenarioId, getCumulativeCosts, formatBigNumber, {
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
                entries={casesEntries}
                keyPrefix="cases"
                subtext={targetYearSubtext('number_cases', formatBigNumber)}
            />
            <MetricCard
                title={formatMessage(MESSAGES.impactSevereCases)}
                icon={SentimentVeryDissatisfiedOutlinedIcon}
                isLoading={isImpactLoading}
                entries={severeCasesEntries}
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
                entries={pfprEntries}
                keyPrefix="pfpr"
                subtext={targetYearSubtext('prevalence_rate', formatPercentValue)}
            />
            <MetricCard
                title={formatMessage(MESSAGES.impactTotalCosts)}
                icon={MonetizationOnOutlinedIcon}
                isLoading={isBudgetLoading}
                entries={costsEntries}
                keyPrefix="total-costs"
            />
        </Grid>
    );
};
