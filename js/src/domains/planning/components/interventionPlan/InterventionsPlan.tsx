import React, { FC, useState } from 'react';
import { TabContext, TabPanel } from '@mui/lab';
import { Divider, Box, CardHeader, CardContent, Card } from '@mui/material';
import { useGetInterventionAssignments } from '../../hooks/UseGetInterventionAssignments';
import { UseRemoveManyOrgUnitsFromInterventionPlan } from '../../hooks/UseRemoveOrgUnitFromInterventionPlan';
import { InterventionPlan } from '../../types/interventions';
import { InterventionPlanDetails } from './InterventionPlanDetails';
import { InterventionPlanSummary } from './InterventionplanSummary';
import { InterventionsPlanMap } from './InterventionsPlanMap';
import { InterventionsPlanTable } from './InterventionsPlanTable';

type Props = {
    scenarioId: number | undefined;
};

export const InterventionsPlan: FC<Props> = ({ scenarioId }) => {
    const [tabValue, setTabValue] = useState<string>('list');

    const [selectedInterventionPlan, setSelectedInterventionPlan] =
        useState<InterventionPlan | null>(null);

    const { data: interventionPlans, isLoading: isLoadingPlans } =
        useGetInterventionAssignments(scenarioId);

    const { mutateAsync: removeManyOrgUnitsFromPlan } =
        UseRemoveManyOrgUnitsFromInterventionPlan();

    const onRemoveOrgUnitsFromPlan = async (
        interventionAssignmentIds: number[],
    ) => {
        await removeManyOrgUnitsFromPlan(interventionAssignmentIds);
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
            />
        </Box>
    );
};
