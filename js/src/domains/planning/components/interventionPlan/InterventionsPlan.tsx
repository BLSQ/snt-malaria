import React, { FC } from 'react';
import { Accordion, AccordionDetails, Divider, Box } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { useGetInterventionsPlan } from '../../hooks/UseGetInterventionsPlan';
import { InterventionPlanSummary } from './InterventionplanSummary';
import { InterventionsPlanTable } from './InterventionsPlanTable';

const styles: SxStyles = {
    accordion: {
        borderRadius: theme => theme.spacing(2),
        overflow: 'hidden',
    },
    tableContainer: { maxHeight: 320, overflowY: 'auto', padding: '10px' },
    tableCellStyle: {
        paddingTop: 0.4,
        paddingBottom: 0.4,
        borderBottom: 'none',
    },
};

type Props = {
    scenarioId: number | undefined;
    handleExpandAccordion: (panel: string) => void;
    expanded: string;
};

export const InterventionsPlan: FC<Props> = ({
    scenarioId,
    handleExpandAccordion,
    expanded,
}) => {
    const { data: interventionPlans, isLoading: isLoadingPlans } =
        useGetInterventionsPlan(scenarioId);

    return (
        <Box
            sx={{
                borderRadius: theme => theme.spacing(2),
                overflow: 'hidden',
            }}
        >
            <Accordion
                sx={styles.accordion}
                expanded={Boolean(expanded === 'interventionsPlan')}
                onChange={handleExpandAccordion('interventionsPlan')}
            >
                <InterventionPlanSummary
                    orgUnitCount={interventionPlans?.length}
                />
                <Divider sx={{ width: '100%' }} />
                <AccordionDetails sx={{ padding: 2 }}>
                    <InterventionsPlanTable
                        isLoadingPlans={isLoadingPlans}
                        interventionPlans={interventionPlans}
                    />
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};
