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
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { InterventionCategories } from './InterventionCategories';
import { InterventionMixSummary } from './InterventionMixSummary';

type Props = {
    selectedOrgUnits: OrgUnit[];
};
export const InterventionsMix: FC<Props> = ({ selectedOrgUnits }) => {
    // const { formatMessage } = useSafeIntl();
    return (
        <Accordion>
            <InterventionMixSummary orgUnitCount={selectedOrgUnits.length} />
            <AccordionDetails sx={{ padding: 0 }}>
                <Divider sx={{ width: '100%' }} />
                <InterventionCategories selectedOrgUnits={selectedOrgUnits} />

                {/* <ApplyInterventionsMix iconProps={{}} /> */}
            </AccordionDetails>
        </Accordion>
    );
};
