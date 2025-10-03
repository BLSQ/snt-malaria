import React, { FC, useCallback, useEffect, useState } from 'react';
import { Grid } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { openSnackBar } from 'Iaso/components/snackBars/EventDispatcher';
import { succesfullSnackBar } from 'Iaso/constants/snackBars';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';
import {
    PaperContainer,
    PaperFullHeight,
    PageContainer,
} from '../../components/styledComponents';

import { baseUrls } from '../../constants/urls';
import { MESSAGES } from '../messages';
import { useGetScenario } from '../scenarios/hooks/useGetScenarios';
import { Budgeting } from './components/budgeting/Budgeting';
import { InterventionAssignments } from './components/interventionAssignment/InterventionAssignments';
import { InterventionsPlan } from './components/interventionPlan/InterventionsPlan';
import { Map } from './components/map';
import { SideMapList } from './components/maps/SideMapList';
import { ScenarioTopBar } from './components/ScenarioTopBar';
import { useGetInterventionAssignments } from './hooks/useGetInterventionAssignments';
import {
    useGetMetricCategories,
    useGetMetricOrgUnits,
    useGetMetricValues,
} from './hooks/useGetMetrics';
import { useGetOrgUnits } from './hooks/useGetOrgUnits';
import { Intervention } from './types/interventions';
import { MetricsFilters, MetricType } from './types/metrics';
import { Budget } from './types/budget';

type PlanningParams = {
    scenarioId: number;
};

export const Planning: FC = () => {
    const params = useParamsObject(
        baseUrls.planning,
    ) as unknown as PlanningParams;
    const { data: scenario } = useGetScenario(params.scenarioId);
    const { data: orgUnits, isLoading: isLoadingOrgUnits } = useGetOrgUnits();
    const { formatMessage } = useSafeIntl();

    const [metricFilters, setMetricFilters] = useState<MetricsFilters>();
    const [selectionOnMap, setSelectionOnMap] = useState<OrgUnit[]>([]);
    const [selectedInterventions, setSelectedInterventions] = useState<{
        [categoryId: number]: Intervention;
    }>({});
    // Metric selection
    // v1: display Incidence by default
    const { data: metricCategories } = useGetMetricCategories();
    const [displayedMetric, setDisplayedMetric] = useState<MetricType | null>(
        null,
    );

    const [budgets, setBudgets] = useState<Budget[] | null>(null);

    const { data: interventionPlans, isLoading: isLoadingPlans } =
        useGetInterventionAssignments(scenario?.id);

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

    // Manage OU selection from the "Intervention list" section
    // Manual add/remove
    const handleAddRemoveOrgUnitToMap = useCallback(
        (orgUnit: OrgUnit | null) => {
            if (orgUnit) {
                setSelectionOnMap(prev => {
                    if (prev.some(unit => unit.id === orgUnit.id)) {
                        return prev.filter(unit => unit.id !== orgUnit.id);
                    }
                    return [...prev, orgUnit];
                });
            }
        },
        [],
    );

    useGetMetricOrgUnits(metricFilters, metricOrgUnitIds => {
        const newOrgUnitSelection = orgUnits?.filter(orgUnit =>
            metricOrgUnitIds.includes(orgUnit.id),
        );

        setSelectionOnMap(newOrgUnitSelection || []);

        if (newOrgUnitSelection && newOrgUnitSelection.length > 0) {
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
        openSnackBar(
            succesfullSnackBar(
                'clearedMapSelection',
                formatMessage(MESSAGES.clearedMapSelection),
            ),
        );
    }, [formatMessage]);

    return (
        <>
            {isLoadingOrgUnits && <LoadingSpinner />}
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <PageContainer>
                {scenario && <ScenarioTopBar scenario={scenario} />}
                <Grid container spacing={1}>
                    <Grid item xs={12} md={7}>
                        <PaperContainer>
                            <PaperFullHeight>
                                {isLoading && <p>Loading data...</p>}
                                <Map
                                    orgUnits={orgUnits}
                                    displayedMetric={displayedMetric}
                                    displayedMetricValues={
                                        displayedMetricValues
                                    }
                                    orgUnitsOnMap={selectionOnMap}
                                    onApplyFilters={setMetricFilters}
                                    onClearSelection={handleClearSelectionOnMap}
                                    onChangeMetricLayer={
                                        handleDisplayMetricOnMap
                                    }
                                    onAddRemoveOrgUnit={
                                        handleAddRemoveOrgUnitToMap
                                    }
                                />
                            </PaperFullHeight>
                        </PaperContainer>
                    </Grid>
                    <Grid item xs={12} md={5}>
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
                    <Grid item xs={12} md={5}>
                        <PaperContainer>
                            <InterventionAssignments
                                scenarioId={scenario?.id}
                                selectedOrgUnits={selectionOnMap}
                                setSelectedOrgUnits={setSelectionOnMap}
                                setSelectedInterventions={
                                    setSelectedInterventions
                                }
                                selectedInterventions={selectedInterventions}
                                interventionPlans={interventionPlans ?? []}
                            />
                        </PaperContainer>
                    </Grid>
                    <Grid item xs={12} md={7}>
                        <PaperContainer>
                            <InterventionsPlan
                                scenarioId={scenario?.id}
                                totalOrgUnitCount={orgUnits?.length ?? 0}
                                interventionPlans={interventionPlans ?? []}
                                isLoadingPlans={isLoadingPlans}
                                onBudgetRan={setBudgets}
                            />
                        </PaperContainer>
                    </Grid>
                    {budgets ? <Budgeting budgets={budgets} /> : null}
                </Grid>
            </PageContainer>
        </>
    );
};
