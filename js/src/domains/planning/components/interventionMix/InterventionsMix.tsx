import React, { FC } from 'react';

import { Accordion, AccordionDetails, Divider } from '@mui/material';

import { ApplyInterventionsMix } from './ApplyInterventionMixModal';
import { InterventionCategories } from './InterventionCategories';
import { InterventionMixSummary } from './InterventionMixSummary';

export const InterventionsMix: FC = () => {
    return (
        <Accordion>
            <InterventionMixSummary />
            <AccordionDetails sx={{ padding: 0 }}>
                <Divider sx={{ width: '100%' }} />
                <InterventionCategories />
                <Divider sx={{ width: '100%' }} />
                <ApplyInterventionsMix iconProps={{}} />
            </AccordionDetails>
        </Accordion>
    );
};
