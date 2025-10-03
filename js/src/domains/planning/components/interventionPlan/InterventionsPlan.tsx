import React, { FC, useCallback, useMemo, useState } from 'react';
import { TabContext, TabPanel } from '@mui/lab';
import { Divider, Box, CardHeader, CardContent, Card } from '@mui/material';
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
        const budgetRequest = interventionPlans.map(ip => ({
            interventionId: ip.intervention.id,
            orgUnits: ip.org_units,
            coverage: interventionCoverage[ip.intervention.id] ?? undefined,
        }));

        // TODO: Should we send the request with all intervention even if no metricType is selected ?
        calculateBudget(
            { scenarioId, requestBody: budgetRequest },
            {
                onSuccess: (data: BudgetCalculationResponse) =>
                    onBudgetRan(data.intervention_budget),
            },
        );
    }, [
        scenarioId,
        calculateBudget,
        interventionPlans,
        interventionCoverage,
        onBudgetRan,
    ]);

    return (
        <Box
            sx={{
                borderRadius: theme => theme.spacing(2),
                overflow: 'hidden',
                height: '493px',
            }}
        >
            <Card elevation={2}>
                <TabContext value={tabValue}>
                    <CardHeader
                        sx={{ paddingTop: 1.5 }}
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
                    <CardContent
                        sx={{
                            padding: 0,
                            '&:last-child': {
                                paddingBottom: 0,
                                height: '424px',
                            },
                        }}
                    >
                        <Divider sx={{ width: '100%', mt: -1 }} />
                        <TabPanel
                            value="list"
                            sx={{
                                height: '100%',
                                padding: 1,
                            }}
                        >
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
                        <TabPanel
                            value="map"
                            sx={{
                                pt: '4px',
                                px: '4px',
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'center',
                            }}
                        >
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
