import React, { FC } from 'react';

import { Accordion, AccordionDetails, Box, Divider } from '@mui/material';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { InterventionCategories } from './InterventionCategories';
import { InterventionMixSummary } from './InterventionMixSummary';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
    handleExpandAccordion: (panel: string) => void;
    expanded: string;
};
export const InterventionsMix: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
    handleExpandAccordion,
    expanded,
}) => {
    return (
        <Box
            sx={{
                borderRadius: theme => theme.spacing(2),
                overflow: 'hidden',
            }}
        >
            <Accordion
                expanded={Boolean(expanded === 'interventionsMix')}
                onChange={handleExpandAccordion('interventionsMix')}
            >
                <InterventionMixSummary
                    orgUnitCount={selectedOrgUnits.length}
                />
                <AccordionDetails sx={{ padding: 0 }}>
                    <Divider sx={{ width: '100%' }} />
                    <InterventionCategories
                        scenarioId={scenarioId}
                        selectedOrgUnits={selectedOrgUnits}
                    />

                    {/* <ApplyInterventionsMix iconProps={{}} /> */}
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};
