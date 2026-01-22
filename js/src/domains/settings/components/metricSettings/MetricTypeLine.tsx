import React, { FC } from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {
    Box,
    ListItem,
    ListItemIcon,
    Tooltip,
    Typography,
} from '@mui/material';
import { IconButton } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MetricType } from '../../../planning/types/metrics';
import { MESSAGES } from '../../messages';

type MetricTypeLineProps = {
    metricType: MetricType;
};

const styles: SxStyles = {
    metricType: {
        borderRadius: 2,
        width: 'auto',
        '&:nth-child(odd of .MuiListItem-root)': {
            backgroundColor: 'action.hover',
        },
    },
    metricTypeIcon: { minWidth: 20, mr: 2 },
    metricTypeDetails: {
        flexGrow: 1,
        display: 'flex',
        justifyContent: 'space-between',
        marginRight: 4,
    },
};

export const MetricTypeLine: FC<MetricTypeLineProps> = ({ metricType }) => {
    return (
        <ListItem
            key={metricType.id}
            sx={styles.metricType}
            secondaryAction={
                <IconButton
                    aria-label="more-info"
                    overrideIcon={MoreHorizIcon}
                    tooltipMessage={MESSAGES.more}
                ></IconButton>
            }
        >
            <ListItemIcon sx={styles.metricTypeIcon}>
                <Tooltip title={metricType.description || ''}>
                    <InfoOutlinedIcon />
                </Tooltip>
            </ListItemIcon>
            <Box sx={styles.metricTypeDetails}>
                <Typography variant="body2">{metricType.name}</Typography>
                <Typography variant="body2">{metricType.origin}</Typography>
            </Box>
        </ListItem>
    );
};
