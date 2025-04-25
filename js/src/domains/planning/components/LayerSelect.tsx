import React, { FC, useState } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { ListSubheader, MenuItem, Select, Typography } from '@mui/material';

import { SxStyles } from 'Iaso/types/general';
import { MetricType, MetricTypeCategory } from '../types/metrics';

const styles: SxStyles = {
    select: {
        height: 32,
        borderRadius: 2,
        backgroundColor: 'white',
        '& .MuiSelect-select': {
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: '0.17px',
            lineHeight: 1.43,
            color: 'rgba(31, 43, 61, 0.87)',
        },
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.12)',
        },
    },
    category: {
        color: 'rgba(31, 43, 61, 0.6)',
        display: 'block',
        width: '100%',
    },
    menuItem: {
        px: 4,
        py: 1.5,
        minHeight: 'auto',
    },
    menuItemText: {
        fontSize: '16px',
        letterSpacing: '0.15px',
        lineHeight: 1.5,
        fontWeight: 400,
        color: 'rgba(31, 43, 61, 0.87)',
    },
};

type Props = {
    metricCategories: MetricTypeCategory[];
    onLayerChange: (metric: MetricType) => void;
};

export const LayerSelect: FC<Props> = ({ metricCategories, onLayerChange }) => {
    const [selectedMetricType, setSelectedMetricType] = useState('');

    const handleChange = event => {
        const newMetric = event.target.value;
        setSelectedMetricType(newMetric);
        onLayerChange(newMetric);
    };

    return (
        <Select
            value={selectedMetricType}
            onChange={handleChange}
            label="Add a covariant map"
            variant="outlined"
            IconComponent={ArrowDropDownIcon}
            sx={styles.select}
        >
            {metricCategories.map(category => [
                <ListSubheader>
                    <Typography variant="overline" sx={styles.category}>
                        {category.name}
                    </Typography>
                </ListSubheader>,
                ...category.items.map(metric => (
                    <MenuItem
                        key={metric.id}
                        value={metric}
                        sx={styles.menuItem}
                    >
                        <Typography sx={styles.menuItemText}>
                            {metric.name}
                        </Typography>
                    </MenuItem>
                )),
            ])}
        </Select>
    );
};
