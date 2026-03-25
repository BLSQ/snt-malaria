import React, { FC, useCallback, useState } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import {
    FormControl,
    ListSubheader,
    MenuItem,
    Select,
    SelectChangeEvent,
    Theme,
    Typography,
} from '@mui/material';

import { useSafeIntl } from 'bluesquare-components';

import { MessageDescriptor } from 'react-intl';
import { SxStyles } from 'Iaso/types/general';
import { MetricType } from '../domains/planning/types/metrics';
import { MetricTypeCategory } from '../domains/planning/types/metrics';

const styles: SxStyles = {
    formControl: {
        minWidth: '200px',
        maxWidth: '100%',
    },
    select: (theme: Theme) => ({
        // TODO Should use a theme color, but didn't find any matching.
        backgroundColor: theme.palette.grey[700],
        color: theme.palette.common.white,
        borderRadius: theme.spacing(1),
        height: '32px',
        '& .MuiOutlinedInput-notchedOutline': {
            border: 0,
        },
        '& .MuiSelect-select .MuiTypography-root': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        '& svg': {
            fill: theme.palette.common.white,
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
    initialSelection?: MetricType;
    onLayerChange: (metric?: MetricType) => void;
    placeholder?: MessageDescriptor;
    metricCategories?: MetricTypeCategory[];
};

export const LayerSelect: FC<Props> = ({
    initialSelection,
    placeholder,
    metricCategories,
    onLayerChange,
}) => {
    const { formatMessage } = useSafeIntl();

    const [selectedMetricType, setSelectedMetricType] = useState<
        MetricType | undefined
    >(initialSelection);

    const handleChange = useCallback(
        (event: SelectChangeEvent<number>) => {
            const newMetricId = event.target.value as number;
            const newMetric = metricCategories
                ?.flatMap(category => category.items)
                .find(metric => metric.id === newMetricId);
            onLayerChange(newMetric);
            setSelectedMetricType(newMetric);
        },
        [metricCategories, onLayerChange],
    );

    return (
        <FormControl sx={styles.formControl}>
            <Select
                id={'layer-select'}
                value={selectedMetricType?.id ?? ''}
                onChange={handleChange}
                variant="outlined"
                IconComponent={ArrowDropDownIcon}
                sx={styles.select}
                displayEmpty
            >
                <MenuItem value="" sx={styles.menuItem}>
                    {formatMessage(placeholder)}
                </MenuItem>
                {metricCategories?.map(category => [
                    <ListSubheader key={category.name}>
                        <Typography variant="overline" sx={styles.category}>
                            {category.name}
                        </Typography>
                    </ListSubheader>,
                    ...category.items.map(metric => (
                        <MenuItem
                            key={metric.id}
                            sx={styles.menuItem}
                            value={metric.id}
                        >
                            <Typography>{metric.name}</Typography>
                        </MenuItem>
                    )),
                ])}
            </Select>
        </FormControl>
    );
};
