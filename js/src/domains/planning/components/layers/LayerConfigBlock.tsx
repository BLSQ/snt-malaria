import React, { FC, useState } from 'react';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import {
    Box,
    MenuItem,
    Select,
    IconButton,
    Typography,
    Theme,
} from '@mui/material';

import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
import { MetricType } from '../../types/metrics';

type Props = {
    metricCategory: string;
    metrics: MetricType[];
    isDisplayedOnMap: boolean;
    toggleMapDisplay: (metric: MetricType) => void;
};

const styles: SxStyles = {
    metricSelect: {
        typography: 'subtitle2',
        '& .MuiSelect-select': {
            padding: 0,
        },
        '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
        },
        fontWeight: 'bold',
    },
    showOnMapIconBtn: (theme: Theme) => ({
        color: theme.palette.primary.main,
    }),
    unitText: (theme: Theme) => ({
        color: theme.palette.text.secondary,
    }),
};

export const LayerConfigBlock: FC<Props> = ({
    metricCategory,
    metrics,
    isDisplayedOnMap,
    toggleMapDisplay,
}) => {
    const [selectedMetric, setSelectedMetric] = useState(metrics[0]);
    const handleSelectChange = event => {
        const newMetricType: MetricType = event.target.value;
        setSelectedMetric(newMetricType);
        if (isDisplayedOnMap) {
            toggleMapDisplay(newMetricType);
        }
    };

    return (
        <Box mb={2}>
            <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
            >
                <Select
                    value={selectedMetric}
                    onChange={handleSelectChange}
                    sx={styles.metricSelect}
                >
                    {metrics.map(metric => (
                        <MenuItem key={metric.id} value={metric}>
                            {metric.name}
                        </MenuItem>
                    ))}
                </Select>
                <IconButton
                    sx={styles.showOnMapIconBtn}
                    onClick={() => toggleMapDisplay(selectedMetric)}
                    aria-label="toggle selection"
                >
                    {isDisplayedOnMap ? (
                        <VisibilityOffIcon />
                    ) : (
                        <VisibilityIcon />
                    )}
                </IconButton>
            </Box>
            <Box mb={2}>
                <InputComponent // TODO
                    keyValue="selectionRule"
                    type="number"
                    label={MESSAGES.moreThan}
                    placeholder="1000"
                />
            </Box>
            <Box>
                <Typography variant="caption" sx={styles.unitText}>
                    {selectedMetric.units}
                </Typography>
            </Box>
        </Box>
    );
};
