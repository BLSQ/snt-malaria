import React, { FC, useEffect, useState } from 'react';
import { Toolbar, Typography, Grid } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    PaperContainer,
    PaperFullHeight,
    AppBar,
    PageContainer,
} from '../../components/styledComponents';
import { Budgets } from './components/Budgets';
import { InterventionsMix } from './components/interventionMix/InterventionsMix';
import { InterventionsPlans } from './components/InterventionsPlans';
import { LayersDrawer } from './components/LayersDrawer';
import { Map } from './components/map';
import { useGetMetricTypes, useGetMetricValues } from './hooks/useGetMetrics';
import { useGetOrgUnits } from './hooks/useGetOrgUnits';
import { MESSAGES } from './messages';
import { MetricType } from './types/metrics';

export const Planning: FC = () => {
    const { data: orgUnits } = useGetOrgUnits();
    const { formatMessage } = useSafeIntl();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    };

    // Metric selection
    // v1: display Incidence by default
    const { data: metricTypes } = useGetMetricTypes();
    const [displayedMetric, setDisplayedMetric] = useState<MetricType | null>(
        null,
    );
    useEffect(() => {
        if (metricTypes && !displayedMetric) {
            setDisplayedMetric(metricTypes.Incidence[0]);
        }
    }, [metricTypes, displayedMetric]);
    const displayMetricOnMap = (metric: MetricType) => {
        setDisplayedMetric(prevSelected =>
            prevSelected?.name === metric.name ? null : metric,
        );
    };
    const { data: displayedMetricValues, isLoading } = useGetMetricValues({
        metricTypeId: displayedMetric?.id || null,
    });

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
                displayMetricOnMap={displayMetricOnMap}
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
                            <InterventionsMix />
                            <InterventionsPlans />
                            <Budgets />
                        </PaperContainer>
                    </Grid>
                </Grid>
            </PageContainer>
        </>
    );
};
