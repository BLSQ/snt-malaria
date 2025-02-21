import React, { FC } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';

export const Interventions: FC = () => {
    return (
        <Accordion>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="interventions-content"
                id="interventions-header"
            >
                <Typography variant="h6" gutterBottom color="secondary">
                    Intervention mix
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box p={2}>{/* Add content for intervention mix here */}</Box>
            </AccordionDetails>
        </Accordion>
    );
};
