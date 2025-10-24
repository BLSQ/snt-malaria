import React, { FC, useCallback, useMemo, useState } from 'react';
import { TabContext, TabPanel } from '@mui/lab';
import { Divider, Box, CardHeader, CardContent, Card } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { useCalculateBudget } from '../../hooks/useCalculateBudget';
import { useRemoveManyOrgUnitsFromInterventionPlan } from '../../hooks/useRemoveOrgUnitFromInterventionPlan';
import {
    Budget,
    BudgetCalculationResponse,
    InterventionCostCoverage,
} from '../../types/budget';
import { InterventionPlan } from '../../types/interventions';
import { InterventionPlanDetails } from './InterventionPlanDetails';
import { InterventionPlanSummary, TabValue } from './InterventionplanSummary';
import { InterventionsPlanMap } from './InterventionsPlanMap';
import { InterventionsPlanTable } from './InterventionsPlanTable';

type Props = {
    scenarioId: number | undefined;
    interventionPlans: InterventionPlan[];
    isLoadingPlans: boolean;
    totalOrgUnitCount: number;
    onBudgetRan: (budgets: Budget[]) => void;
};

const styles: SxStyles = {
    mainContent: {
        borderRadius: theme => theme.spacing(2),
        overflow: 'hidden',
        height: '493px',
    },
    cardHeader: { paddingTop: 1.5 },
    cardContent: {
        padding: 0,
        '&:last-child': {
            paddingBottom: 0,
            height: '424px',
        },
    },
    divider: { width: '100%', mt: -1 },
    listTab: {
        height: '100%',
        padding: 1,
    },
    mapTab: {
        p: 1,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
};

export const InterventionsPlan: FC<Props> = ({
    scenarioId,
    interventionPlans,
    isLoadingPlans,
    totalOrgUnitCount = 0,
    onBudgetRan,
}) => {
    const [tabValue, setTabValue] = useState<TabValue>('map');

    const [isRemovingOrgUnits, setIsRemovingOrgUnits] =
        useState<boolean>(false);
    const [selectedInterventionId, setSelectedInterventionId] = useState<
        number | null
    >(null);

    const [interventionCoverage, setInterventionCoverage] = useState<{
        [interventionId: number]: InterventionCostCoverage;
    }>({});

    const assignedOrgUnitCount = useMemo(() => {
        return interventionPlans.reduce((acc, plan) => {
            plan.org_units.forEach(orgUnit => {
                if (!acc.includes(orgUnit.id)) {
                    acc.push(orgUnit.id);
                }
            });
            return acc;
        }, [] as number[]).length;
    }, [interventionPlans]);

    const selectedInterventionPlan: InterventionPlan | null = useMemo(() => {
        return (
            interventionPlans.find(
                plan => plan.intervention.id === selectedInterventionId,
            ) || null
        );
    }, [interventionPlans, selectedInterventionId]);

    const { mutateAsync: removeManyOrgUnitsFromPlan } =
        useRemoveManyOrgUnitsFromInterventionPlan();

    const { mutate: calculateBudget, isLoading: isCalculatingBudget } =
        useCalculateBudget();

    const onRemoveOrgUnitsFromPlan = async (
        interventionAssignmentIds: number[],
        shouldCloseDrawer: boolean,
    ) => {
        setIsRemovingOrgUnits(true);
        await removeManyOrgUnitsFromPlan(interventionAssignmentIds);
        setIsRemovingOrgUnits(false);
        if (shouldCloseDrawer) {
            onCloseInterventionPlanDetails();
        }
    };

    const onShowInterventionPlanDetails = (
        interventionPlan: InterventionPlan,
    ) => {
        setSelectedInterventionId(interventionPlan.intervention.id);
    };

    const onCloseInterventionPlanDetails = () => {
        setSelectedInterventionId(null);
    };

    const setSelectedCoverageForIntervention = useCallback(
        (interventionId: number, coverage: InterventionCostCoverage) => {
            setInterventionCoverage({
                ...interventionCoverage,
                [interventionId]: coverage,
            });
        },
        [setInterventionCoverage, interventionCoverage],
    );

    const runBudget = useCallback(() => {
        calculateBudget(scenarioId, {
            onSuccess: (data: BudgetCalculationResponse) =>
                onBudgetRan(data.results),
        });
    }, [scenarioId, calculateBudget, onBudgetRan]);

    return (
        <Box sx={styles.mainContent}>
            <Card elevation={2}>
                <TabContext value={tabValue}>
                    <CardHeader
                        sx={styles.cardHeader}
                        title={
                            <InterventionPlanSummary
                                setTabValue={setTabValue}
                                tabValue={tabValue}
                                assignedOrgUnits={assignedOrgUnitCount}
                                totalOrgUnits={totalOrgUnitCount}
                                onRunBudget={runBudget}
                                isCalculatingBudget={isCalculatingBudget}
                            />
                        }
                    />
                    <CardContent sx={styles.cardContent}>
                        <Divider sx={styles.divider} />
                        <TabPanel value="list" sx={styles.listTab}>
                            <InterventionsPlanTable
                                isLoadingPlans={isLoadingPlans}
                                interventionPlans={interventionPlans}
                                showInterventionPlanDetails={
                                    onShowInterventionPlanDetails
                                }
                                onCoverageSelected={
                                    setSelectedCoverageForIntervention
                                }
                                interventionsCoverage={interventionCoverage}
                            />
                        </TabPanel>
                        <TabPanel value="map" sx={styles.mapTab}>
                            <InterventionsPlanMap scenarioId={scenarioId} />
                        </TabPanel>
                    </CardContent>
                </TabContext>
            </Card>
            <InterventionPlanDetails
                interventionPlan={selectedInterventionPlan}
                removeOrgUnitsFromPlan={onRemoveOrgUnitsFromPlan}
                closeInterventionPlanDetails={onCloseInterventionPlanDetails}
                isRemovingOrgUnits={isRemovingOrgUnits}
            />
        </Box>
    );
};
