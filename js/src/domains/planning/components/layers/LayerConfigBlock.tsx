import React, { FC, useState } from 'react';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import {
    Box,
    Button,
    MenuItem,
    Select,
    TextField,
    Theme,
    Typography,
} from '@mui/material';

import { SxStyles } from 'Iaso/types/general';
import { MetricType } from '../../types/metrics';
import { MoreActionsMenu } from './MoreActionsMenu';

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
    filterField: (theme: Theme) => ({
        marginY: theme.spacing(1),
        marginRight: theme.spacing(2),
    }),
    unitText: (theme: Theme) => ({
        color: theme.palette.text.secondary,
        marginBottom: theme.spacing(2),
    }),
};

type Props = {
    metrics: MetricType[];
    isDisplayedOnMap: boolean;
    toggleMapDisplay: (metric: MetricType) => void;
    onSelectOrgUnits: (metricId: number, filterValue: number) => void;
};

export const LayerConfigBlock: FC<Props> = ({
    metrics,
    isDisplayedOnMap,
    toggleMapDisplay,
    onSelectOrgUnits,
}) => {
    const [selectedMetric, setSelectedMetric] = useState(metrics[0]);

    const handleSelectMetricChange = event => {
        const newMetricType: MetricType = event.target.value;
        setSelectedMetric(newMetricType);
        if (isDisplayedOnMap) {
            toggleMapDisplay(newMetricType);
        }
    };
    const handleDisplayOnMap = () => {
        if (!isDisplayedOnMap) {
            toggleMapDisplay(selectedMetric);
        }
    };

    const [filterValue, setFilterValue] = useState('');
    const handleFilterValueChange = event => {
        setFilterValue(event.target.value);
    };

    return (
        <Box sx={styles.mainBox}>
            <Box sx={styles.flex}>
                <Select
                    value={selectedMetric}
                    onChange={handleSelectMetricChange}
                    sx={styles.metricSelect}
                >
                    {metrics.map(metric => (
                        <MenuItem key={metric.id} value={metric}>
                            {metric.name}
                        </MenuItem>
                    ))}
                </Select>
                <Box sx={styles.flex}>
                    {isDisplayedOnMap && (
                        <VisibilityIcon sx={styles.showOnMapIconBtn} />
                    )}
                    <MoreActionsMenu handleDisplayOnMap={handleDisplayOnMap} />
                </Box>
            </Box>
            <Box sx={styles.flex}>
                <TextField
                    variant="outlined"
                    label="Above"
                    placeholder="0-1000"
                    size="small"
                    sx={styles.filterField}
                    value={filterValue}
                    onChange={handleFilterValueChange}
                />
                <Button
                    variant="text"
                    sx={{
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        textTransform: 'none',
                    }}
                    size="small"
                    onClick={() =>
                        onSelectOrgUnits(selectedMetric.id, Number(filterValue))
                    }
                    disabled={!filterValue}
                >
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
