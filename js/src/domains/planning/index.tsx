import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Grid } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { openSnackBar } from 'Iaso/components/snackBars/EventDispatcher';
import { succesfullSnackBar } from 'Iaso/constants/snackBars';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';
import { SxStyles } from 'Iaso/types/general';
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
import { PlanningFiltersSidebar } from './components/PlanningFiltersSidebar';
import { ScenarioTopBar } from './components/ScenarioTopBar';
import { useGetInterventionAssignments } from './hooks/useGetInterventionAssignments';
import { useGetLatestCalculatedBudget } from './hooks/useGetLatestCalculatedBudget';
import {
    useGetMetricCategories,
    useGetMetricOrgUnits,
    useGetMetricValues,
} from './hooks/useGetMetrics';
import { useGetOrgUnits } from './hooks/useGetOrgUnits';
import { Intervention } from './types/interventions';
import { MetricsFilters, MetricType } from './types/metrics';

type PlanningParams = {
    scenarioId: number;
};

const styles: SxStyles = {
    assignmentContainer: { height: '630px' },
};

export const Planning: FC = () => {
    const params = useParamsObject(
        baseUrls.planning,
    ) as unknown as PlanningParams;
    const { data: scenario } = useGetScenario(params.scenarioId);
    const { formatMessage } = useSafeIntl();

    const [metricFilters, setMetricFilters] = useState<MetricsFilters>();
    const [selectionOnMap, setSelectionOnMap] = useState<OrgUnit[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedOrgUnitId, setSelectedOrgUnitId] = useState<number | null>(
        null,
    );

    // Fetch org units with optional parent filter (API handles filtering)
    const { data: orgUnits, isLoading: isLoadingOrgUnits } =
        useGetOrgUnits(selectedOrgUnitId);

    // Use orgUnits directly - filtering is done via API when selectedOrgUnitId is set
    const filteredOrgUnits = orgUnits;

    const handleOrgUnitChange = useCallback((orgUnitId: number | null) => {
        setSelectedOrgUnitId(orgUnitId);
        // Clear selection when filter changes
        setSelectionOnMap([]);
    }, []);

    const handleToggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);
    const [selectedInterventions, setSelectedInterventions] = useState<{
        [categoryId: number]: Intervention;
    }>({});
    // Metric selection
    // v1: display Incidence by default
    const { data: metricCategories } = useGetMetricCategories();
    const [displayedMetric, setDisplayedMetric] = useState<MetricType | null>(
        null,
    );

    const { data: budget } = useGetLatestCalculatedBudget(scenario?.id);

    const { data: interventionPlans, isLoading: isLoadingPlans } =
        useGetInterventionAssignments(scenario?.id);

    useEffect(() => {
        if (
            metricCategories &&
            metricCategories.length > 0 &&
            !displayedMetric
        ) {
            setDisplayedMetric(metricCategories[0].items[0]);
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
        const newOrgUnitSelection = filteredOrgUnits?.filter(orgUnit =>
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

    const handleSelectAllOnMap = useCallback(
        () => setSelectionOnMap(filteredOrgUnits || []),
        [filteredOrgUnits],
    );

    const handleInvertSelectionOnMap = useCallback(() => {
        setSelectionOnMap(prevSelected => {
            if (!filteredOrgUnits) return prevSelected;
            const newSelection = filteredOrgUnits.filter(
                orgUnit => !prevSelected.some(sel => sel.id === orgUnit.id),
            );
            return newSelection;
        });
    }, [filteredOrgUnits]);

    return (
        <>
            {isLoadingOrgUnits && <LoadingSpinner />}
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <PageContainer>
                {scenario && (
                    <ScenarioTopBar
                        scenario={scenario}
                        isSidebarOpen={isSidebarOpen}
                        onToggleSidebar={handleToggleSidebar}
                    />
                )}
                <Grid container spacing={1}>
                    <Grid item xs={12} md={7}>
                        <PaperContainer>
                            <PaperFullHeight>
                                {isLoading && <p>Loading data...</p>}
                                <Map
                                    orgUnits={filteredOrgUnits}
                                    displayedMetric={displayedMetric}
                                    displayedMetricValues={
                                        displayedMetricValues
                                    }
                                    orgUnitsOnMap={selectionOnMap}
                                    onApplyFilters={setMetricFilters}
                                    onClearSelection={handleClearSelectionOnMap}
                                    onInvertSelected={
                                        handleInvertSelectionOnMap
                                    }
                                    onSelectAll={handleSelectAllOnMap}
                                    onChangeMetricLayer={
                                        handleDisplayMetricOnMap
                                    }
                                    onAddRemoveOrgUnit={
                                        handleAddRemoveOrgUnitToMap
                                    }
                                    disabled={scenario?.is_locked}
                                />
                            </PaperFullHeight>
                        </PaperContainer>
                    </Grid>
                    <Grid
                        item
                        xs={12}
                        md={isSidebarOpen ? 3 : 5}
                        sx={{
                            transition: 'flex-basis 0.3s ease-in-out',
                        }}
                    >
                        <PaperFullHeight>
                            {isLoading && <p>Loading data...</p>}
                            {metricCategories && filteredOrgUnits && (
                                <SideMapList
                                    orgUnits={filteredOrgUnits}
                                    metricCategories={metricCategories}
                                />
                            )}
                        </PaperFullHeight>
                    </Grid>
                    {isSidebarOpen && orgUnits && (
                        <Grid item xs={12} md={2}>
                            <PaperFullHeight>
                                <PlanningFiltersSidebar
                                    orgUnits={orgUnits}
                                    selectedOrgUnitId={selectedOrgUnitId}
                                    onOrgUnitChange={handleOrgUnitChange}
                                />
                            </PaperFullHeight>
                        </Grid>
                    )}
                </Grid>
                <Grid container spacing={1} sx={{ mt: 0 }}>
                    {scenario?.is_locked ? null : (
                        <Grid
                            item
                            xs={12}
                            md={3}
                            sx={styles.assignmentContainer}
                        >
                            <InterventionAssignments
                                scenarioId={scenario?.id}
                                selectedOrgUnits={selectionOnMap}
                                setSelectedInterventions={
                                    setSelectedInterventions
                                }
                                selectedInterventions={selectedInterventions}
                                interventionPlans={interventionPlans ?? []}
                                disabled={scenario?.is_locked}
                            />
                        </Grid>
                    )}
                    <Grid
                        item
                        xs={12}
                        md={scenario?.is_locked ? 12 : 9}
                        sx={styles.assignmentContainer}
                    >
                        <InterventionsPlan
                            scenarioId={params.scenarioId}
                            totalOrgUnitCount={orgUnits?.length ?? 0}
                            interventionPlans={interventionPlans ?? []}
                            isLoadingPlans={isLoadingPlans}
                            disabled={scenario?.is_locked}
                        />
                    </Grid>
                    {orgUnits && budget && (
                        <Budgeting
                            budgets={budget?.results}
                            orgUnits={orgUnits}
                        />
                    )}
                </Grid>
            </PageContainer>
        </>
    );
};
