import React, { FC, useCallback, useEffect, useState } from 'react';
import { Grid } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { openSnackBar } from 'Iaso/components/snackBars/EventDispatcher';
import { succesfullSnackBar } from 'Iaso/constants/snackBars';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { getRequest } from 'Iaso/libs/Api';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';
import {
    PaperContainer,
    PaperFullHeight,
    PageContainer,
} from '../../components/styledComponents';

import { baseUrls } from '../../constants/urls';
import { useGetScenario } from '../scenarios/hooks/useGetScenarios';
import { Budgets } from './components/budget/Budgets';
import { InterventionsMix } from './components/interventionMix/InterventionsMix';
import { InterventionsPlan } from './components/interventionPlan/InterventionsPlan';
import { LayersDrawer } from './components/LayersDrawer';
import { Map } from './components/map';
import { ScenarioTopBar } from './components/ScenarioTopBar';
import {
    useGetMetricCategories,
    useGetMetricValues,
} from './hooks/useGetMetrics';
import { useGetOrgUnits } from './hooks/useGetOrgUnits';
import { MESSAGES } from './messages';
import { MetricsFilters, MetricType, MetricValue } from './types/metrics';

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
    const [expanded, setExpanded] = useState('interventionsMix');
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<OrgUnit[]>([]);
    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    };

    // Metric selection
    // v1: display Incidence by default
    const { data: metricCategories } = useGetMetricCategories();
    const [displayedMetric, setDisplayedMetric] = useState<MetricType | null>(
        null,
    );
    useEffect(() => {
        if (metricCategories && !displayedMetric) {
            setDisplayedMetric(metricCategories[1].items[0]);
        }
    }, [metricCategories, displayedMetric]);

    const handleDisplayMetricOnMap = (metric: MetricType) => {
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

    // Automatic OU add based on filters.
    // To move fast for the demo, what this actually does is filter on each filter
    // individually (parallelized in a `Promise.all`) and then takes the intersection
    // of all these filters to get the final result.
    const handleSelectOrgUnits = useCallback(
        async (filters: MetricsFilters) => {
            const urls: string[] = [];
            for (const category in filters) {
                const filter = filters[category];
                const [[metricId, filterValue]] = Object.entries(filter);

                // Hardcoded on greater than for v1
                const jsonFilter = { '>': [{ var: 'value' }, filterValue] };
                const encodedJsonFilter = encodeURIComponent(
                    JSON.stringify(jsonFilter),
                );
                urls.push(
                    `/api/metricvalues/?metric_type_id=${metricId}&json_filter=${encodedJsonFilter}`,
                );
            }
            const responses = await Promise.all(
                urls.map(url => getRequest(url)),
            );
            const ouArrs = responses.map(values =>
                values.map((v: MetricValue) => v.org_unit),
            );

            const orgUnitIdsToSelect = ouArrs.reduce(
                (intersection, currentArray) => {
                    return intersection.filter(element =>
                        currentArray.includes(element),
                    );
                },
            );

            // Find the org units that have IDs in orgUnitIdsToSelect
            const newOrgUnitSelection = orgUnits?.filter(orgUnit =>
                orgUnitIdsToSelect.includes(orgUnit.id),
            );

            if (newOrgUnitSelection && newOrgUnitSelection.length > 0) {
                setSelectedOrgUnits(newOrgUnitSelection);
                openSnackBar(
                    succesfullSnackBar(
                        'selectOrgUnitsSuccess',
                        formatMessage(MESSAGES.selectOrgUnitsSuccess, {
                            amount: newOrgUnitSelection.length,
                        }),
                    ),
                );
            } else {
                openSnackBar({
                    messageKey: 'warning',
                    id: 'noOrgUnitsSelected',
                    messageObject: MESSAGES.noOrgUnitsSelected,
                    options: {
                        variant: 'warning',
                        persist: false,
                    },
                });
            }
        },
        [formatMessage, orgUnits],
    );

    const handleClearOrgUnitSelection = useCallback(() => {
        setSelectedOrgUnits([]);
    }, []);

    const handleExpandAccordion = panel => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : null);
    };
    return (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <LayersDrawer
                toggleDrawer={toggleDrawer}
                isDrawerOpen={isDrawerOpen}
                displayedMetric={displayedMetric}
                selectedOrgUnits={selectedOrgUnits}
                onDisplayMetricOnMap={handleDisplayMetricOnMap}
                onSelectOrgUnits={handleSelectOrgUnits}
                onClearOrgUnitSelection={handleClearOrgUnitSelection}
            />
            <PageContainer>
                {scenario && <ScenarioTopBar scenario={scenario} />}
                <Grid container spacing={1}>
                    <Grid item xs={12} md={8}>
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
                    <Grid item xs={12} md={4}>
                        <PaperContainer />
                    </Grid>
                </Grid>
                <Grid container spacing={1} sx={{ mt: 0 }}>
                    <Grid item xs={12} md={6}>
                        <PaperContainer>
                            <InterventionsMix
                                scenarioId={scenario?.id}
                                selectedOrgUnits={selectedOrgUnits}
                            />
                        </PaperContainer>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <PaperContainer>
                            <InterventionsPlan
                                scenarioId={scenario?.id}
                                handleExpandAccordion={handleExpandAccordion}
                                expanded={expanded}
                            />
                            <Budgets
                                scenarioId={scenario?.id}
                                handleExpandAccordion={handleExpandAccordion}
                                expanded={expanded}
                            />
                        </PaperContainer>
                    </Grid>
                </Grid>
            </PageContainer>
        </>
    );
};
