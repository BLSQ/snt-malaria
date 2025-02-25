import React, { FC, useCallback, useEffect, useState } from 'react';
import { Grid } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';
import {
    PaperContainer,
    PaperFullHeight,
    PageContainer,
} from '../../components/styledComponents';

import { baseUrls } from '../../constants/urls';
import { useGetScenario } from '../scenarios/hooks/useGetScenarios';
import { Budgets } from './components/Budgets';
import { InterventionsMix } from './components/interventionMix/InterventionsMix';
import { InterventionsPlans } from './components/interventionPlan/InterventionsPlans';
import { LayersDrawer } from './components/LayersDrawer';
import { Map } from './components/map';
import { ScenarioTopBar } from './components/ScenarioTopBar';
import { useGetMetricTypes, useGetMetricValues } from './hooks/useGetMetrics';
import { useGetOrgUnits } from './hooks/useGetOrgUnits';
import { MESSAGES } from './messages';
import { MetricType } from './types/metrics';

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
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<OrgUnit[]>([]);
    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    };

    const onSelectOrgUnits = () => {
        console.log('click!');
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

    const onAddOrgUnitToMix = useCallback((orgUnit: OrgUnit | null) => {
        if (orgUnit) {
            setSelectedOrgUnits(prev => {
                if (prev.some(unit => unit.id === orgUnit.id)) {
                    return prev.filter(unit => unit.id !== orgUnit.id);
                }
                return [...prev, orgUnit];
            });
        }
    }, []);

    return (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <LayersDrawer
                toggleDrawer={toggleDrawer}
                isDrawerOpen={isDrawerOpen}
                metricTypes={metricTypes}
                displayedMetric={displayedMetric}
                displayMetricOnMap={displayMetricOnMap}
                onSelectOrgUnits={onSelectOrgUnits}
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
                                    onAddOrgUnitToMix={onAddOrgUnitToMix}
                                    selectedOrgUnits={selectedOrgUnits}
                                />
                            </PaperFullHeight>
                        </PaperContainer>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <PaperContainer>
                            <InterventionsMix
                                scenarioId={scenario?.id}
                                selectedOrgUnits={selectedOrgUnits}
                            />
                            <InterventionsPlans scenarioId={scenario?.id} />
                            <Budgets />
                        </PaperContainer>
                    </Grid>
                </Grid>
            </PageContainer>
        </>
    );
};
