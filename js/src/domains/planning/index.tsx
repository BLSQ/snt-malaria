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
import { Map } from './components/map';
import { SideMapList } from './components/maps/SideMapList';
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

    const [selectionOnMap, setSelectionOnMap] = useState<OrgUnit[]>([]);
    const [selectionOnInterventionMix, setSelectionOnInterventionMix] =
        useState<OrgUnit[]>([]);
    const [expanded, setExpanded] = useState('interventionsMix');
    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    };
    const [selectedInterventions, setSelectedInterventions] = useState<{
        [categoryId: number]: number[] | [];
    }>({});
    const [mixName, setMixName] = useState<string>('');
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

    const handleAddMapOrgUnitsToMix = () => {
        const newOrgUnits = selectionOnMap.filter(
            orgUnit =>
                !selectionOnInterventionMix.some(
                    unit => unit.id === orgUnit.id,
                ),
        );

        setSelectionOnInterventionMix(prev => [...prev, ...newOrgUnits]);
    };

    const { data: displayedMetricValues, isLoading } = useGetMetricValues({
        metricTypeId: displayedMetric?.id || null,
    });

    // Manage OU selection from the "Intervention mix" section
    // Manual add/remove
    const handleAddRemoveOrgUnitToMix = useCallback(
        (orgUnit: OrgUnit | null) => {
            if (orgUnit) {
                setSelectionOnInterventionMix(prev => {
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
    const handleApplyFilters = useCallback(
        // TODO: This is a more or less functional hack to make the modal work with the
        // `and` rules. This needs to be properly implemented in the backend
        // to be able to process more complex rules. Ideally, only 1 API call
        // would be needed instead of this intersection way of doing things.
        async (filters: MetricsFilters) => {
            const urls: string[] = [];
            const andFilters = filters['and'];
            andFilters.forEach(filter => {
                // force into old format
                const metricId = filter['>='][0]['var'];
                filter['>='][0]['var'] = 'value';
                const encodedFilter = encodeURIComponent(
                    JSON.stringify(filter),
                );
                urls.push(
                    `/api/metricvalues/?metric_type_id=${metricId}&json_filter=${encodedFilter}`,
                );
            });
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
                setSelectionOnMap(newOrgUnitSelection);
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

    const handleClearSelectionOnMap = useCallback(() => {
        setSelectionOnMap([]);
    }, []);

    const handleExpandAccordion = panel => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : null);
    };

    return (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <PageContainer>
                {scenario && <ScenarioTopBar scenario={scenario} />}
                <Grid container spacing={1}>
                    <Grid item xs={12} md={8}>
                        <PaperContainer>
                            <PaperFullHeight>
                                {isLoading && <p>Loading data...</p>}
                                <Map
                                    orgUnits={orgUnits}
                                    displayedMetric={displayedMetric}
                                    displayedMetricValues={
                                        displayedMetricValues
                                    }
                                    selectedOrgUnits={selectionOnMap}
                                    onApplyFilters={handleApplyFilters}
                                    onClearSelection={handleClearSelectionOnMap}
                                    onChangeMetricLayer={
                                        handleDisplayMetricOnMap
                                    }
                                    onAddRemoveOrgUnitToMix={
                                        handleAddRemoveOrgUnitToMix
                                    }
                                    onAddToMix={handleAddMapOrgUnitsToMix}
                                />
                            </PaperFullHeight>
                        </PaperContainer>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <PaperFullHeight>
                            {isLoading && <p>Loading data...</p>}
                            {metricCategories && orgUnits && (
                                <SideMapList
                                    orgUnits={orgUnits}
                                    metricCategories={metricCategories}
                                />
                            )}
                        </PaperFullHeight>
                    </Grid>
                </Grid>
                <Grid container spacing={1} sx={{ mt: 0 }}>
                    <Grid item xs={12} md={6}>
                        <PaperContainer>
                            <InterventionsMix
                                scenarioId={scenario?.id}
                                selectedOrgUnits={selectionOnInterventionMix}
                                setSelectedInterventions={
                                    setSelectedInterventions
                                }
                                selectedInterventions={selectedInterventions}
                                mixName={mixName}
                                setMixName={setMixName}
                            />
                        </PaperContainer>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <PaperContainer>
                            <InterventionsPlan
                                selectedOrgUnits={selectedOrgUnits
                                    .map(orgUnit => orgUnit.id)
                                    .join(',')}
                                scenarioId={scenario?.id}
                                handleExpandAccordion={handleExpandAccordion}
                                expanded={expanded}
                                setSelectedInterventions={
                                    setSelectedInterventions
                                }
                                selectedInterventions={selectedInterventions}
                                setMixName={setMixName}
                                mixName={mixName}
                            />
                            {/* <Budgets
                                scenarioId={scenario?.id}
                                handleExpandAccordion={handleExpandAccordion}
                                expanded={expanded}
                            /> */}
                        </PaperContainer>
                    </Grid>
                </Grid>
            </PageContainer>
        </>
    );
};
