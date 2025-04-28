import React, { FC, useState } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import {
    FormControl,
    ListSubheader,
    MenuItem,
    Select,
    Theme,
    Typography,
} from '@mui/material';

import { SxStyles } from 'Iaso/types/general';
import { MetricType, MetricTypeCategory } from '../../types/metrics';

const styles: SxStyles = {
    formControl: {
        minWidth: '200px',
    },
    select: (theme: Theme) => ({
        backgroundColor: 'white',
        borderRadius: theme.spacing(1),
        height: '32px',
        '& .MuiOutlinedInput-notchedOutline': {
            border: 0,
        },
    }),
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
};

type Props = {
    createsNewMap?: Boolean;
    initialSelection?: MetricType | '';
    metricCategories: MetricTypeCategory[];
    onLayerChange: (metric: MetricType) => void;
};

export const LayerSelect: FC<Props> = ({
    createsNewMap = false,
    initialSelection = '',
    metricCategories,
    onLayerChange,
}) => {
    const [selectedMetricType, setSelectedMetricType] =
        useState(initialSelection);

    const handleChange = event => {
        const newMetric = event.target.value;
        onLayerChange(newMetric);
        if (!createsNewMap) {
            setSelectedMetricType(newMetric);
        }
    };

    return (
        <FormControl sx={styles.formControl}>
            <Select
                value={selectedMetricType}
                onChange={handleChange}
                variant="outlined"
                IconComponent={ArrowDropDownIcon}
                sx={styles.select}
                displayEmpty
            >
                <MenuItem value="" disabled>
                    Add a covariant map
                </MenuItem>
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
                            <Typography>{metric.name}</Typography>
                        </MenuItem>
                    )),
                ])}
            </Select>
        </FormControl>
    );
};
