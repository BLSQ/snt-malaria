import React, { FC, useMemo, useState } from 'react';
import { TabContext, TabPanel } from '@mui/lab';
import { Divider, Box, CardHeader, CardContent, Card } from '@mui/material';
import { UseRemoveManyOrgUnitsFromInterventionPlan } from '../../hooks/UseRemoveOrgUnitFromInterventionPlan';
import { InterventionPlan } from '../../types/interventions';
import { InterventionPlanDetails } from './InterventionPlanDetails';
import { InterventionPlanSummary } from './InterventionplanSummary';
import { InterventionsPlanMap } from './InterventionsPlanMap';
import { InterventionsPlanTable } from './InterventionsPlanTable';

type Props = {
    scenarioId: number | undefined;
    interventionPlans: InterventionPlan[];
    isLoadingPlans: boolean;
};

export const InterventionsPlan: FC<Props> = ({
    scenarioId,
    interventionPlans,
    isLoadingPlans,
}) => {
    const [tabValue, setTabValue] = useState<'map' | 'list'>('map');

    const [isRemovingOrgUnits, setIsRemovingOrgUnits] =
        useState<boolean>(false);
    const [selectedInterventionId, setSelectedInterventionId] = useState<
        number | null
    >(null);

    const selectedInterventionPlan: InterventionPlan | null = useMemo(() => {
        return (
            interventionPlans.find(
                plan => plan.intervention.id === selectedInterventionId,
            ) || null
        );
    }, [interventionPlans, selectedInterventionId]);

    const { mutateAsync: removeManyOrgUnitsFromPlan } =
        UseRemoveManyOrgUnitsFromInterventionPlan();

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
                        title={
                            <InterventionPlanSummary
                                setTabValue={setTabValue}
                                tabValue={tabValue}
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
