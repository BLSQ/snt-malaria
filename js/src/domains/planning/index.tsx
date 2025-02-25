import React, { FC, useEffect, useState } from 'react';
import { Grid } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    PaperContainer,
    PaperFullHeight,
    PageContainer,
} from '../../components/styledComponents';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';

import { Budgets } from './components/Budgets';
import { InterventionsMix } from './components/interventionMix/InterventionsMix';
import { InterventionsPlans } from './components/InterventionsPlans';
import { LayersDrawer } from './components/LayersDrawer';
import { Map } from './components/map';
import { useGetMetricTypes, useGetMetricValues } from './hooks/useGetMetrics';
import { useGetOrgUnits } from './hooks/useGetOrgUnits';
import { MESSAGES } from './messages';
import { MetricType } from './types/metrics';
import { baseUrls } from '../../constants/urls';
import { useGetScenario } from '../scenarios/hooks/useGetScenarios';
import { ScenarioTopBar } from './components/ScenarioTopBar';

type PlanningParams = {
    scenarioId: number;
};

export const Planning: FC = () => {
    const params = useParamsObject(
        baseUrls.planning,
    ) as unknown as PlanningParams;

    const { data: scenario } = useGetScenario(params.scenarioId);
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
            if (metricTypes.Incidence?.length > 0) {
                setDisplayedMetric(metricTypes.Incidence[0]);
            }
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
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <LayersDrawer
                toggleDrawer={toggleDrawer}
                isDrawerOpen={isDrawerOpen}
                metricTypes={metricTypes}
                displayedMetric={displayedMetric}
                displayMetricOnMap={displayMetricOnMap}
            />
            <PageContainer>
                {scenario && <ScenarioTopBar scenario={scenario} />}
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
