import React, { FC } from 'react';
import { Box, Theme, Typography } from '@mui/material';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { useSafeIntl } from 'bluesquare-components';

import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';

const styles: SxStyles = {
    flex: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    layersIconBox: (theme: Theme) => ({
        marginRight: theme.spacing(1),
        backgroundColor: '#EDE7F6',
        padding: '4px',
        borderRadius: '8px',
    }),
    layersIcon: (theme: Theme) => ({
        color: theme.palette.primary.main,
        width: '24px',
        height: 'auto',
        marginTop: '1px',
        marginBottom: '-1px',
    }),
    title: {
        flexGrow: 1,
        fontSize: '1rem',
        fontWeight: 'bold',
        textTransform: 'none',
    },
};

export const LayersTitleWithIcon: FC = () => {
    const { formatMessage } = useSafeIntl();

    return (
        <Box sx={styles.flex}>
            <Box sx={styles.layersIconBox}>
                <LayersOutlinedIcon sx={styles.layersIcon} />
            </Box>
            <Typography variant="h6" sx={styles.title}>
                {formatMessage(MESSAGES.layers)}
            </Typography>
        </Box>
    );
};
