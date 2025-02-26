import React, { FC } from 'react';
import { Accordion, AccordionDetails, Divider } from '@mui/material';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { InterventionCategories } from '../interventionMix/InterventionCategories';
import { InterventionPlanSummary } from './InterventionplanSummary';

type Props = {
    selectedOrgUnits: OrgUnit[];
};
export const InterventionsPlans: FC<Props> = ({ selectedOrgUnits }) => {
    return (
        <Accordion
            sx={{
                mt: 2,
                '&:before': {
                    display: 'none',
                },
            }}
        >
            <InterventionPlanSummary orgUnitCount={selectedOrgUnits.length} />
            <AccordionDetails sx={{ padding: 0 }}>
                <Divider sx={{ width: '100%' }} />
                <InterventionCategories selectedOrgUnits={selectedOrgUnits} />
            </AccordionDetails>
        </Accordion>
    );
};
