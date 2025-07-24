import React, { FC, useState } from 'react';
import { TabContext, TabPanel } from '@mui/lab';
import { Divider, Box, CardHeader, CardContent, Card } from '@mui/material';
import { useGetInterventionAssignments } from '../../hooks/UseGetInterventionAssignments';
import { UseRemoveAllOrgUnitsFromInterventionPlan } from '../../hooks/UseRemoveOrgUnitFromInterventionPlan';
import { InterventionPlanSummary } from './InterventionplanSummary';
import { InterventionsPlanMap } from './InterventionsPlanMap';
import { InterventionsPlanTable } from './InterventionsPlanTable';
import { InterventionPlan } from '../../types/interventions';
import { InterventionPlanDetails } from './InterventionPlanDetails';

type Props = {
    scenarioId: number | undefined;
};

export const InterventionsPlan: FC<Props> = ({ scenarioId }) => {
    const [tabValue, setTabValue] = useState<string>('list');

    const [selectedInterventionPlan, setSelectedInterventionPlan] =
        useState<InterventionPlan | null>(null);

    const { data: interventionPlans, isLoading: isLoadingPlans } =
        useGetInterventionAssignments(scenarioId);

    const { mutateAsync: removeAllOrgUnitsFromPlan } =
        UseRemoveAllOrgUnitsFromInterventionPlan();

    const onRemoveAllOrgUnitsFromPlan = async () => {
        const assignmentIds = selectedInterventionPlan?.org_units.map(
            orgUnit => orgUnit.intervention_assignment_id,
        );

        await removeAllOrgUnitsFromPlan(assignmentIds);
        setSelectedInterventionPlan(null);
    };

    const onShowInterventionPlanDetails = (
        interventionPlan: InterventionPlan,
    ) => {
        setSelectedInterventionPlan(interventionPlan);
    };

    const onCloseInterventionPlanDetails = () => {
        setSelectedInterventionPlan(null);
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
                                scenarioId={scenarioId}
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
                removeAllOrgUnitsFromPlan={onRemoveAllOrgUnitsFromPlan}
                closeInterventionPlanDetails={onCloseInterventionPlanDetails}
            />
        </Box>
    );
};
