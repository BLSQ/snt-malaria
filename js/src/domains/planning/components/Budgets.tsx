import React, { FC } from 'react';
import AdjustIcon from '@mui/icons-material/Adjust';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    Stack,
    Theme,
    // AccordionDetails,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';
import { containerBoxStyles } from './styles';

const styles: SxStyles = {
    icon: (theme: Theme) => ({
        color: theme.palette.primary.main,
        height: 'auto',
    }),
};
export const Budgets: FC = () => {
    const { formatMessage } = useSafeIntl();
    return (
        <Box
            sx={{
                mt: 2,
                borderRadius: theme => theme.spacing(2),
                overflow: 'hidden',
            }}
        >
            <Accordion
                sx={{
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
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={containerBoxStyles}>
                            <AdjustIcon sx={styles.icon} />
                        </Box>
                        {/* <Box>
                            <AdjustIcon color="primary" sx={styles.iconBox} />
                        </Box> */}
                        <Typography variant="h6" gutterBottom color="#1F2B3D">
                            {formatMessage(MESSAGES.budgetImpactTitle)}
                        </Typography>
                    </Stack>
                </AccordionSummary>
                {/* <AccordionDetails> */}
                {/* <Box p={2}>Add content for BUDGETS here</Box> */}
                {/* </AccordionDetails> */}
            </Accordion>
        </Box>
    );
};
