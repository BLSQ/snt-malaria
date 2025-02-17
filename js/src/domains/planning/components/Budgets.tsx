import React, { FC } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';

export const Budgets: FC = () => {
    return (
        <Accordion
            sx={{
                mt: 2,
                '&:before': {
                    display: 'none',
                },
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="budgets-content"
                id="budgets-header"
            >
                <Typography variant="h6" gutterBottom color="secondary">
                    Budget & Impact
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box p={2}>{/* Add content for BUDGETS here */}</Box>
            </AccordionDetails>
        </Accordion>
    );
};
