import React, { FC } from 'react';

import {
    Accordion,
    AccordionDetails,
    // Button,
    Divider,
    // Grid,
} from '@mui/material';

// import { useSafeIntl } from 'bluesquare-components';
// import { MESSAGES } from '../../messages';
// import { ApplyInterventionsMix } from './ApplyInterventionMixModal';
import { InterventionCategories } from './InterventionCategories';
import { InterventionMixSummary } from './InterventionMixSummary';

export const InterventionsMix: FC = () => {
    // const { formatMessage } = useSafeIntl();
    return (
        <Accordion>
            <InterventionMixSummary />
            <AccordionDetails sx={{ padding: 0 }}>
                <Divider sx={{ width: '100%' }} />
                <InterventionCategories />

                {/* <ApplyInterventionsMix iconProps={{}} /> */}
            </AccordionDetails>
        </Accordion>
    );
};
