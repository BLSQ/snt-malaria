import React, { FC } from 'react';

import {
    Accordion,
    AccordionDetails,
    Grid,
    Divider,
    Button,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../messages';
import { InterventionCategories } from './InterventionCategories';
import { InterventionMixSummary } from './InterventionMixSummary';

export const InterventionsMix: FC = () => {
    const { formatMessage } = useSafeIntl();

    return (
        <Accordion>
            <InterventionMixSummary />
            <AccordionDetails sx={{ padding: 0 }}>
                <Divider sx={{ width: '100%' }} />
                <InterventionCategories />
                <Divider sx={{ width: '100%' }} />
                <Grid
                    item
                    display="flex"
                    justifyContent="flex-end"
                    alignItems="flex-end"
                    padding={2}
                    sx={{
                        height: '68px',
                    }}
                >
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{
                            fontSize: '0.875rem',
                            textTransform: 'none',
                        }}
                    >
                        {formatMessage(MESSAGES.applyMixAndAddPlan)}
                    </Button>
                </Grid>
            </AccordionDetails>
        </Accordion>
    );
};
