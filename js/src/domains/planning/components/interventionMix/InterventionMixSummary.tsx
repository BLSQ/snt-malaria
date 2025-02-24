import React, { FC } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import {
    AccordionSummary,
    Badge,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../messages';

const badgeStyles = {
    '& .MuiBadge-badge': {
        fontSize: '1.20rem',
        minWidth: '28px',
        height: '28px',
        padding: '4px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
};

export const InterventionMixSummary: FC = () => {
    const { formatMessage } = useSafeIntl();
    return (
        <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="interventions-content"
            id="interventions-header"
        >
            <Grid
                container
                direction="row"
                spacing={2}
                alignItems="center"
                justifyContent="space-between"
            >
                <Grid item sx={{ flexGrow: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <TuneIcon color="primary" />
                        <Typography variant="h6" gutterBottom color="#1F2B3D">
                            {formatMessage(MESSAGES.interventionMixTitle)}
                        </Typography>
                    </Stack>
                </Grid>
                <Grid item sx={{ mr: 5 }}>
                    <Stack direction="row" spacing={3} alignItems="center">
                        <Typography variant="h6" gutterBottom color="primary">
                            {formatMessage(MESSAGES.orgUnitDistrict)}
                        </Typography>
                        <Badge
                            badgeContent={5}
                            sx={badgeStyles}
                            color="primary"
                        />
                    </Stack>
                </Grid>
            </Grid>
        </AccordionSummary>
    );
};
