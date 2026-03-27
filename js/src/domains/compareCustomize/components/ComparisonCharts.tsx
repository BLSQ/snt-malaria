import React, { FC } from 'react';
import { Box, Grid } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { BudgetByCategoryCard } from './charts/BudgetByCategoryCard';
import { CostPerAvertedCaseCard } from './charts/CostPerAvertedCaseCard';
import { ImpactDifferencesCard } from './charts/ImpactDifferencesCard';
import { YearlyPrevalenceCard } from './charts/YearlyPrevalenceCard';

const styles = {
    stackedCards: {
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        height: '100%',
    },
} satisfies SxStyles;

export const ComparisonCharts: FC = () => (
    <>
        <Grid item xs={12} md={6}>
            <ImpactDifferencesCard />
        </Grid>
        <Grid item xs={12} md={6}>
            <Box sx={styles.stackedCards}>
                <YearlyPrevalenceCard />
                <CostPerAvertedCaseCard />
            </Box>
        </Grid>
        <Grid item xs={12}>
            <BudgetByCategoryCard />
        </Grid>
    </>
);
