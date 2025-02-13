import React, { FC } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';

export const InterventionsPlans: FC = () => {
    return (
        <Accordion>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="interventions-plans-content"
                id="interventions-plans-header"
            >
                <Typography variant="h6" gutterBottom color="secondary">
                    INTERVENTIONS PLANS
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box p={2}>
                    {/* Add content for INTERVENTIONS PLANS here */}
                </Box>
            </AccordionDetails>
        </Accordion>
    );
};
