import React, { FC, useState } from 'react';
import { TabContext, TabPanel } from '@mui/lab';
import { Divider, Box, CardHeader, CardContent, Card } from '@mui/material';
import { useGetInterventionsPlan } from '../../hooks/UseGetInterventionsPlan';
import { InterventionPlanSummary } from './InterventionplanSummary';
import { InterventionsPlanMap } from './InterventionsPlanMap';
import { InterventionsPlanTable } from './InterventionsPlanTable';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: string;
    setSelectedInterventions: any;
    selectedInterventions: any;
    setMixName: (name: string) => void;
    mixName: string;
};

export const InterventionsPlan: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
    setSelectedInterventions,
    selectedInterventions,
    setMixName,
    mixName,
}) => {
    const [tabValue, setTabValue] = useState<string>('list');
    const { data: interventionPlans, isLoading: isLoadingPlans } =
        useGetInterventionsPlan(scenarioId, selectedOrgUnits);

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
                        <TabPanel value="list" sx={{ mt: '-20px' }}>
                            <InterventionsPlanTable
                                scenarioId={scenarioId}
                                isLoadingPlans={isLoadingPlans}
                                interventionPlans={interventionPlans}
                                setSelectedInterventions={
                                    setSelectedInterventions
                                }
                                selectedInterventions={selectedInterventions}
                                setMixName={setMixName}
                                mixName={mixName}
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
                            <InterventionsPlanMap
                                scenarioId={scenarioId}
                                selectedOrgUnits={selectedOrgUnits}
                            />
                        </TabPanel>
                    </CardContent>
                </TabContext>
            </Card>
        </Box>
    );
};
