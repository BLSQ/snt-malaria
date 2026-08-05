import React, { FC, useCallback } from 'react';
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

import { IntlMessage, useSafeIntl } from 'bluesquare-components';

import { MessageDescriptor } from 'react-intl';
import { SxStyles } from 'Iaso/types/general';
import { flattenMetricTypes } from '../domains/dataLayers/hooks/useGetMetrics';
import { MetricType } from '../domains/dataLayers/types/metrics';
import { MetricTypeCategory } from '../domains/dataLayers/types/metrics';

/** `sx` is the OutlinedInput root. `map` matches the [MapLegend] chip; `form` is a plain field. */
const styles: SxStyles = {
    formControl: {
        minWidth: '200px',
        maxWidth: '100%',
        width: '100%',
    },
    selectMap: (theme: Theme) => ({
        // TODO Should use a theme color; hex matches MapLegend chip for now (#1F2B3DBF).
        backgroundColor: '#1F2B3DBF',
        color: 'white',
        borderRadius: '8px',
        minHeight: 0,
        '& fieldset, & .MuiOutlinedInput-notchedOutline': {
            border: 'none',
            borderWidth: 0,
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '0 !important',
            borderColor: 'transparent !important',
        },
        '& .MuiSelect-select': {
            py: theme.spacing(0.5),
            px: theme.spacing(1),
            pr: theme.spacing(4),
            display: 'flex',
            alignItems: 'center',
            fontSize: theme.typography.body2.fontSize,
            fontFamily: theme.typography.fontFamily,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        },
        '& svg': {
            fill: 'white',
        },
    }),
    selectForm: (theme: Theme) => ({
        minHeight: 0,
        '& .MuiSelect-select': {
            py: theme.spacing(1),
            display: 'flex',
            alignItems: 'center',
            fontSize: theme.typography.body2.fontSize,
            fontFamily: theme.typography.fontFamily,
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
    selection?: MetricType;
    onLayerChange: (metric?: MetricType) => void;
    placeholder?: IntlMessage;
    metricCategories?: MetricTypeCategory[];
    /** 'map' (default) is the dark pill used as a map overlay; 'form' is a plain outlined select for use inside forms. */
    variant?: 'map' | 'form';
};

export const LayerSelect: FC<Props> = ({
    selection,
    placeholder,
    metricCategories,
    onLayerChange,
    variant = 'map',
}) => {
    const { formatMessage } = useSafeIntl();

    const handleChange = useCallback(
        (event: SelectChangeEvent<number>) => {
            const newMetricId = event.target.value as number;
            const newMetric = flattenMetricTypes(metricCategories).find(
                metric => metric.id === newMetricId,
            );
            onLayerChange(newMetric);
        },
        [metricCategories, onLayerChange],
    );

    return (
        <FormControl sx={styles.formControl}>
            <Select
                id="layer-select"
                value={selection?.id ?? ''}
                onChange={handleChange}
                variant="outlined"
                IconComponent={ArrowDropDownIcon}
                sx={variant === 'map' ? styles.selectMap : styles.selectForm}
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
                            {metric.name}
                        </MenuItem>
                    )),
                ])}
            </Select>
        </FormControl>
    );
};
