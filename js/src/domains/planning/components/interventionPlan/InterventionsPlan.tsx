import React, { FC, useCallback, useMemo, useState } from 'react';
import { TabContext, TabPanel } from '@mui/lab';
import { Divider, CardHeader, CardContent, Card } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { useCalculateBudget } from '../../hooks/useCalculateBudget';
import { useGetBudgetAssumptions } from '../../hooks/useGetBudgetAssumptions';
import { useRemoveManyOrgUnitsFromInterventionPlan } from '../../hooks/useRemoveOrgUnitFromInterventionPlan';
import {
    BudgetAssumptions,
    InterventionCategory,
    InterventionPlan,
} from '../../types/interventions';
import { InterventionPlanDetails } from './InterventionPlanDetails';
import { InterventionPlanSummary, TabValue } from './InterventionplanSummary';
import { InterventionsPlanMap } from './InterventionsPlanMap';
import { InterventionsPlanTable } from './InterventionsPlanTable';

type Props = {
    scenarioId: number;
    disabled?: boolean;
    interventionPlans: InterventionPlan[];
    isLoadingPlans: boolean;
    totalOrgUnitCount: number;
};

const styles: SxStyles = {
    mainContent: {
        borderRadius: theme => theme.spacing(2),
        overflow: 'hidden',
        height: '100%',
        boxShadow: 'none',
    },
    cardHeader: { paddingTop: 1.5 },
    cardContent: {
        padding: 0,
        '&:last-child': {
            paddingBottom: 0,
            height: '100%',
        },
    },
    divider: { width: '100%', mt: -1 },
    listTab: {
        height: 'calc(100% - 76px)',
        padding: 1,
    },
    mapTab: {
        p: 1,
        width: '100%',
        height: 'calc(100% - 76px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
};

export const InterventionsPlan: FC<Props> = ({
    scenarioId,
    disabled = false,
    interventionPlans,
    isLoadingPlans,
    totalOrgUnitCount = 0,
}) => {
    const [tabValue, setTabValue] = useState<TabValue>('map');
    const [interventionCategory, setInterventionCategory] =
        useState<InterventionCategory | null>(null);

    const [isRemovingOrgUnits, setIsRemovingOrgUnits] =
        useState<boolean>(false);
    const [selectedInterventionId, setSelectedInterventionId] = useState<
        number | undefined
    >(undefined);

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

    const selectedInterventionPlan: InterventionPlan | undefined =
        useMemo(() => {
            return interventionPlans.find(
                plan => plan.intervention.id === selectedInterventionId,
            );
        }, [interventionPlans, selectedInterventionId]);

    const { data: budgetAssumptions } = useGetBudgetAssumptions(scenarioId);
    const selectedBudgetAssumptions: BudgetAssumptions | undefined = useMemo(
        () =>
            budgetAssumptions?.find(
                bs =>
                    bs.intervention_code ===
                    selectedInterventionPlan?.intervention.code,
            ),
        [selectedInterventionPlan, budgetAssumptions],
    );

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
        setSelectedInterventionId(undefined);
    };

    const runBudget = useCallback(() => {
        calculateBudget(scenarioId);
    }, [scenarioId, calculateBudget]);

    return (
        <>
            <Card elevation={2} sx={styles.mainContent}>
                <TabContext value={tabValue}>
                    <CardHeader
                        sx={styles.cardHeader}
                        title={
                            <InterventionPlanSummary
                                setTabValue={setTabValue}
                                tabValue={tabValue}
                                setInterventionCategory={
                                    setInterventionCategory
                                }
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
                                budgetAssumptions={budgetAssumptions}
                                showInterventionPlanDetails={
                                    onShowInterventionPlanDetails
                                }
                            />
                        </TabPanel>
                        <TabPanel value="map" sx={styles.mapTab}>
                            <InterventionsPlanMap
                                scenarioId={scenarioId}
                                disabled={disabled}
                                interventions={
                                    interventionCategory?.interventions || []
                                }
                            />
                        </TabPanel>
                    </CardContent>
                </TabContext>
            </Card>
            <InterventionPlanDetails
                scenarioId={scenarioId}
                disabled={disabled}
                interventionPlan={selectedInterventionPlan}
                budgetAssumptions={selectedBudgetAssumptions}
                removeOrgUnitsFromPlan={onRemoveOrgUnitsFromPlan}
                closeInterventionPlanDetails={onCloseInterventionPlanDetails}
                isRemovingOrgUnits={isRemovingOrgUnits}
            />
        </>
    );
};
