import React, { FC } from 'react';

import {
    Accordion,
    AccordionDetails,
    Box,
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
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
};
export const InterventionsMix: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
}) => {
    // const { formatMessage } = useSafeIntl();
    return (
        <Box
            sx={{
                borderRadius: theme => theme.spacing(2),
                overflow: 'hidden',
            }}
        >
            <Accordion>
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
