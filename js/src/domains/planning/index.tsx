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
import { MetricType, MetricValue } from './types/metrics';
import { getRequest } from 'Iaso/libs/Api';

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

    // Manage OU selection from the "Intervention mix" section
    // Manual add/remove
    const handleAddRemoveOrgUnitToMix = useCallback(
        (orgUnit: OrgUnit | null) => {
            console.log('handleAddRemoveOrgUnitToMix  ');
            if (orgUnit) {
                setSelectedOrgUnits(prev => {
                    if (prev.some(unit => unit.id === orgUnit.id)) {
                        return prev.filter(unit => unit.id !== orgUnit.id);
                    }
                    return [...prev, orgUnit];
                });
            }
        },
        [],
    );

    // Automatic add based on filter
    const handleSelectOrgUnits = useCallback(
        async (metricId: number, filterValue: number) => {
            // Hardcoded on greater than for v1
            const jsonFilter = { '>': [{ var: 'value' }, filterValue] };
            const encodedJsonFilter = encodeURIComponent(
                JSON.stringify(jsonFilter),
            );
            let url = `/api/metricvalues/?metric_type_id=${metricId}&json_filter=${encodedJsonFilter}`;
            const resp = await getRequest(url);
            const orgUnitIdsToAdd = resp.map((e: MetricValue) => e.org_unit);

            // Find the org units that have IDs in orgUnitIdsToAdd
            const orgUnitsToAdd = orgUnits.filter(orgUnit =>
                orgUnitIdsToAdd.includes(orgUnit.id),
            );

            // Combine with existing selectedOrgUnits, avoiding duplicates
            setSelectedOrgUnits(prevSelectedOrgUnits => {
                // Create a map of existing selected org unit IDs for quick lookup
                const existingIds = new Set(
                    prevSelectedOrgUnits.map(orgUnit => orgUnit.id),
                );

                // Combine the lists, avoiding duplicates
                const combinedOrgUnits = [
                    ...prevSelectedOrgUnits,
                    ...orgUnitsToAdd.filter(
                        orgUnit => !existingIds.has(orgUnit.id),
                    ),
                ];

                return combinedOrgUnits;
            });
        },
        [orgUnits],
    );

    return (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <LayersDrawer
                toggleDrawer={toggleDrawer}
                isDrawerOpen={isDrawerOpen}
                displayedMetric={displayedMetric}
                displayMetricOnMap={displayMetricOnMap}
                onSelectOrgUnits={handleSelectOrgUnits}
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
                                    onAddRemoveOrgUnitToMix={
                                        handleAddRemoveOrgUnitToMix
                                    }
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
