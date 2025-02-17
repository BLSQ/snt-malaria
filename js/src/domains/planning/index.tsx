import React, { FC, useState } from 'react';
import { Toolbar, Typography, Grid } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    PaperContainer,
    PaperFullHeight,
    AppBar,
    PageContainer,
} from '../../components/styledComponents';
import { Budgets } from './components/Budgets';
import { Interventions } from './components/Interventions';
import { InterventionsPlans } from './components/InterventionsPlans';
import { LayersDrawer } from './components/LayersDrawer';
import { Map } from './components/map';
import { useGetOrgUnits } from './hooks/useGetOrgUnits';
import { useGetMetricTypes, useGetMetricValues } from './hooks/useGetMetrics';
import { MESSAGES } from './messages';
import { MetricType } from './types/metrics';

export const Planning: FC = () => {
    const { data: orgUnits } = useGetOrgUnits();
    const { data: metricTypes } = useGetMetricTypes();
    const { formatMessage } = useSafeIntl();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    };

    // Metric selection
    const [displayedMetric, setDisplayedMetric] = useState<MetricType | null>(
        null,
    );
    const toggleMetricSelection = (metric: MetricType) => {
        setDisplayedMetric(prevSelected =>
            prevSelected?.name === metric.name ? null : metric,
        );
    };
    const { data: displayedMetricValues, isLoading } = useGetMetricValues(
        displayedMetric?.id || null,
    );

    return (
        <>
            <AppBar elevation={0} position="static">
                <Toolbar>
                    <Typography variant="h6">
                        {formatMessage(MESSAGES.title)}
                    </Typography>
                </Toolbar>
            </AppBar>
            <LayersDrawer
                toggleDrawer={toggleDrawer}
                isDrawerOpen={isDrawerOpen}
                metricTypes={metricTypes}
                displayedMetric={displayedMetric}
                toggleMetricSelection={toggleMetricSelection}
            />
            <PageContainer>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={7}>
                        <PaperContainer>
                            <PaperFullHeight>
                                {isLoading && <p>Loading data...</p>}
                                <Map
                                    orgUnits={orgUnits}
                                    toggleDrawer={toggleDrawer}
                                    displayedMetric={displayedMetric}
                                    displayedMetricValues={
                                        displayedMetricValues
                                    }
                                />
                            </PaperFullHeight>
                        </PaperContainer>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <PaperContainer>
                            <Interventions />
                            <InterventionsPlans />
                            <Budgets />
                        </PaperContainer>
                    </Grid>
                </Grid>
            </PageContainer>
        </>
    );
};
