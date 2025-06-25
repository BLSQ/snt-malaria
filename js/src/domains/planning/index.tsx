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
    useGetMetricOrgUnits,
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

    const [metricFilters, setMetricFilters] = useState<MetricsFilters>();
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

    const handleApplyFilters = filters => {
        setMetricFilters(filters);
    };

    useGetMetricOrgUnits(metricFilters, metricOrgUnitIds => {
        const newOrgUnitSelection = orgUnits?.filter(orgUnit =>
            metricOrgUnitIds.includes(orgUnit.id),
        );

        console.log('New org unit selection:', newOrgUnitSelection);

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
    });

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
