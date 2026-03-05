import React, { FC } from 'react';
import { Box, Grid } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { BudgetByCategoryCard } from './charts/BudgetByCategoryCard';
import { CostPerAvertedCaseCard } from './charts/CostPerAvertedCaseCard';
import { ImpactDifferencesCard } from './charts/ImpactDifferencesCard';
import { YearlyPrevalenceCard } from './charts/YearlyPrevalenceCard';
import { ScenarioImpactMetrics, ScenarioDisplay } from '../types';
import { BudgetCalculationResponse } from '../../planning/types/budget';

const styles = {
    stackedCards: {
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        height: '100%',
    },
} satisfies SxStyles;

type Props = {
    scenarios: ScenarioDisplay[];
    baselineScenarioId: number | undefined;
    budgetsByScenarioId: Map<number, BudgetCalculationResponse | undefined>;
    impactsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>;
    isImpactLoading: boolean;
};

export const ComparisonCharts: FC<Props> = ({
    scenarios,
    baselineScenarioId,
    budgetsByScenarioId,
    impactsByScenarioId,
    isImpactLoading,
}) => (
    <>
        <Grid item xs={12} md={6}>
            <ImpactDifferencesCard
                scenarios={scenarios}
                baselineScenarioId={baselineScenarioId}
                impactsByScenarioId={impactsByScenarioId}
                isLoading={isImpactLoading}
            />
        </Grid>
        <Grid item xs={12} md={6}>
            <Box sx={styles.stackedCards}>
                <YearlyPrevalenceCard
                    scenarios={scenarios}
                    impactsByScenarioId={impactsByScenarioId}
                    isLoading={isImpactLoading}
                />
                <CostPerAvertedCaseCard
                    scenarios={scenarios}
                    impactsByScenarioId={impactsByScenarioId}
                    isLoading={isImpactLoading}
                />
            </Box>
        </Grid>
        <Grid item xs={12}>
            <BudgetByCategoryCard
                scenarios={scenarios}
                budgetsByScenarioId={budgetsByScenarioId}
            />
        </Grid>
    </>
);
