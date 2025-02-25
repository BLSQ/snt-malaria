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
    Button,
} from '@mui/material';

import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
import { MetricType } from '../../types/metrics';

const styles: SxStyles = {
    mainBox: (theme: Theme) => ({
        margin: theme.spacing(2),
    }),
    flex: (theme: Theme) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    }),
    metricSelect: {
        typography: 'subtitle2',
        '& .MuiSelect-select': {
            padding: 0,
        },
        '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
        },
        fontWeight: 'bold',
        marginTop: 0,
    },
    showOnMapIconBtn: (theme: Theme) => ({
        color: theme.palette.primary.main,
    }),
    unitText: (theme: Theme) => ({
        color: theme.palette.text.secondary,
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(2),
    }),
};

type Props = {
    metricCategory: string;
    metrics: MetricType[];
    isDisplayedOnMap: boolean;
    toggleMapDisplay: (metric: MetricType) => void;
    onSelectOrgUnits: () => void;
};

export const LayerConfigBlock: FC<Props> = ({
    metricCategory,
    metrics,
    isDisplayedOnMap,
    toggleMapDisplay,
    onSelectOrgUnits,
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
        <Box sx={styles.mainBox}>
            <Box sx={styles.flex}>
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
            <Box sx={styles.flex}>
                <InputComponent // TODO
                    keyValue="selectionRule"
                    type="number"
                    label={MESSAGES.above}
                    placeholder="1000"
                    withMarginTop={false}
                />
                <Button variant="text" size="small" onClick={onSelectOrgUnits}>
                    Select
                </Button>
            </Box>
            <Box sx={styles.unitText}>
                <Typography variant="caption">
                    {selectedMetric.units}
                </Typography>
            </Box>
        </Box>
    );
};
