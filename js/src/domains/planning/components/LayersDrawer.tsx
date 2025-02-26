import React, { FC } from 'react';
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import {
    Box,
    Divider,
    Drawer,
    IconButton,
    Theme,
    Typography,
} from '@mui/material';
import { MetricType } from '../types/metrics';
import { LayerConfigBlock } from './layers/LayerConfigBlock';
import { SxStyles } from 'Iaso/types/general';

const styles: SxStyles = {
    mainBox: { width: 350, position: 'relative' },
    headerBox: (theme: Theme) => ({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: theme.spacing(1),
    }),
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
    },
    chevronIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
};

type Props = {
    toggleDrawer: () => void;
    isDrawerOpen: boolean;
    metricTypes?: MetricType[];
    displayedMetric: MetricType | null;
    displayMetricOnMap: (metric: MetricType) => void;
    onSelectOrgUnits: () => void;
};

export const LayersDrawer: FC<Props> = ({
    toggleDrawer,
    isDrawerOpen,
    metricTypes,
    displayedMetric,
    displayMetricOnMap,
    onSelectOrgUnits,
}) => {
    return (
        <Drawer
            anchor="left"
            open={isDrawerOpen}
            hideBackdrop={true}
            PaperProps={{
                sx: {
                    borderRadius: theme => theme.spacing(2),
                    height: 'auto',
                    top: '15vh',
                    marginLeft: '40px', // 16 + 16 + 8
                },
            }}
            // onClose={toggleDrawer} // Close by clicking outside, not sure if we want this
        >
            <Box sx={styles.mainBox} role="presentation">
                <Box sx={styles.headerBox}>
                    <Box sx={styles.layersIconBox}>
                        <LayersOutlinedIcon sx={styles.layersIcon} />
                    </Box>
                    <Typography variant="h6" sx={styles.title}>
                        Layers
                    </Typography>
                    <IconButton
                        aria-label="close"
                        onClick={toggleDrawer}
                        sx={styles.chevronIcon}
                    >
                        <ChevronLeftOutlinedIcon />
                    </IconButton>
                </Box>
                <Divider />
                {metricTypes &&
                    Object.keys(metricTypes).map(metricCategory => (
                        <Box key={metricCategory}>
                            <Box>
                                <LayerConfigBlock
                                    metrics={metricTypes[metricCategory]}
                                    isDisplayedOnMap={
                                        displayedMetric?.category ===
                                        metricCategory
                                    }
                                    toggleMapDisplay={displayMetricOnMap}
                                    onSelectOrgUnits={onSelectOrgUnits}
                                />
                            </Box>
                            <Divider />
                        </Box>
                    ))}
            </Box>
        </Drawer>
    );
};
