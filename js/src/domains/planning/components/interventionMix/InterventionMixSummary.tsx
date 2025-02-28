import React, { FC } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import {
    AccordionSummary,
    Badge,
    Box,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
import { containerBoxStyles } from '../styles';

const styles: SxStyles = {
    badgeStyle: {
        '& .MuiBadge-badge': {
            fontSize: '1.20rem',
            width: '24px',
            height: '24px',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            aspectRatio: '1',
        },
    },
};

type Props = {
    orgUnitCount: number;
};
export const InterventionMixSummary: FC<Props> = ({ orgUnitCount }) => {
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
                        <Box sx={containerBoxStyles}>
                            <TuneIcon height="auto" color="primary" />
                        </Box>
                        <Typography variant="h6" gutterBottom color="#1F2B3D">
                            {formatMessage(MESSAGES.interventionMixTitle)}
                        </Typography>
                    </Stack>
                </Grid>
                <Grid item sx={{ mr: 4 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="h6" gutterBottom color="primary">
                            {formatMessage(MESSAGES.orgUnitDistrict)}
                        </Typography>
                        <Badge
                            badgeContent={orgUnitCount}
                            sx={styles.badgeStyle}
                            color="primary"
                            showZero
                        />
                    </Stack>
                </Grid>
            </Grid>
        </AccordionSummary>
    );
};
