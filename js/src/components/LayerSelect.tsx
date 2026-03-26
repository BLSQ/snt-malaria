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

/** Closed control only: match [MapLegend] chip; `sx` is the OutlinedInput root. */
const styles: SxStyles = {
    formControl: {
        minWidth: '200px',
        maxWidth: '100%',
    },
    select: (theme: Theme) => ({
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
                id="layer-select"
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
