import React, { FC, useState } from 'react';
import { TabContext, TabPanel } from '@mui/lab';
import { Divider, Box, CardHeader, CardContent, Card } from '@mui/material';
// import { useGetInterventionsPlan } from '../../hooks/UseGetInterventionsPlan';
import { InterventionPlanSummary } from './InterventionplanSummary';
import { InterventionsPlanMap } from './InterventionsPlanMap';
import { InterventionsPlanTable } from './InterventionsPlanTable';

type Props = {
    scenarioId: number | undefined;
};

export const InterventionsPlan: FC<Props> = ({ scenarioId }) => {
    const [tabValue, setTabValue] = useState<string>('list');
    // const { data: interventionPlans, isLoading: isLoadingPlans } =
    //     useGetInterventionsPlan(scenarioId);
    const hardCodedInterventionPlans = [
        {
            id: 1,
            name: 'Mix 1',
            interventions: [
                {
                    id: 41,
                    name: 'RTS,S',
                    description: 'RTS,S Tests',
                    cost_per_unit: null,
                    created_at: '2025-04-16T15:38:07.347141Z',
                    updated_at: '2025-04-16T15:38:07.347150Z',
                },
                {
                    id: 42,
                    name: 'IRS',
                    description: 'IRS Tests',
                    cost_per_unit: null,
                    created_at: '2025-04-16T15:38:07.347141Z',
                    updated_at: '2025-04-16T15:38:07.347150Z',
                },
                {
                    id: 43,
                    name: 'SMC',
                    description: 'SMC Tests',
                    cost_per_unit: null,
                    created_at: '2025-04-16T15:38:07.347141Z',
                    updated_at: '2025-04-16T15:38:07.347150Z',
                },
            ],
            orgUnits: [
                { id: 1, name: 'Dédougou' },
                { id: 2, name: 'Nouna' },
                { id: 3, name: 'Solenzo' },
                { id: 4, name: 'Toma' },
                { id: 5, name: 'Mangodora' },
                { id: 6, name: 'Gourcy' },
                { id: 7, name: 'Nongr' },
                { id: 8, name: 'Koupéla' },
                { id: 9, name: 'Ouargaye' },
            ],
        },
        {
            id: 2,
            name: 'Mix 2',
            interventions: [
                {
                    id: 41,
                    name: 'RTS,S',
                    description: 'Rapid Diagnostic Tests',
                    cost_per_unit: null,
                    created_at: '2025-04-16T15:38:07.347141Z',
                    updated_at: '2025-04-16T15:38:07.347150Z',
                },
                {
                    id: 44,
                    name: 'LLIN',
                    description: 'LLIN Tests',
                    cost_per_unit: null,
                    created_at: '2025-04-16T15:38:07.347141Z',
                    updated_at: '2025-04-16T15:38:07.347150Z',
                },
                {
                    id: 45,
                    name: 'MDA',
                    description: 'MDA Tests',
                    cost_per_unit: null,
                    created_at: '2025-04-16T15:38:07.347141Z',
                    updated_at: '2025-04-16T15:38:07.347150Z',
                },
            ],
            orgUnits: [
                { id: 1, name: 'Dédougou' },
                { id: 2, name: 'Nouna' },
                { id: 3, name: 'Solenzo' },
                { id: 4, name: 'Toma' },
                { id: 5, name: 'Mangodora' },
                { id: 6, name: 'Gourcy' },
                { id: 7, name: 'Nongr' },
                { id: 8, name: 'Koupéla' },
                { id: 9, name: 'Ouargaye' },
            ],
        },
        {
            id: 3,
            name: 'IPTp',
            interventions: [],
            orgUnits: [
                { id: 1, name: 'Dédougou' },
                { id: 2, name: 'Nouna' },
                { id: 3, name: 'Solenzo' },
            ],
        },
        {
            id: 4,
            name: 'LLIN',
            interventions: [],
            orgUnits: [
                { id: 1, name: 'Dédougou' },
                { id: 2, name: 'Nouna' },
                { id: 3, name: 'Solenzo' },
                { id: 4, name: 'Toma' },
                { id: 5, name: 'Mangodora' },
                { id: 6, name: 'Gourcy' },
                { id: 7, name: 'Nongr' },
                { id: 8, name: 'Koupéla' },
                { id: 9, name: 'Ouargaye' },
                { id: 10, name: 'Ouargaye' },
                { id: 11, name: 'Ouargaye' },
                { id: 12, name: 'Ouargaye' },
                { id: 13, name: 'Ouargaye' },
                { id: 14, name: 'Ouargaye' },
                { id: 15, name: 'Ouargaye' },
                { id: 16, name: 'Ouargaye' },
            ],
        },
    ];

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
                                isLoadingPlans={false}
                                interventionPlans={hardCodedInterventionPlans}
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
                            <InterventionsPlanMap />
                        </TabPanel>
                    </CardContent>
                </TabContext>
            </Card>
        </Box>
    );
};
