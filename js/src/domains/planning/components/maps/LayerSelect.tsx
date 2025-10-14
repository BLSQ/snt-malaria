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

import { useSafeIntl } from 'bluesquare-components';

import { MessageDescriptor } from 'react-intl';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { useGetMetricCategories } from '../../hooks/useGetMetrics';
import { MetricType } from '../../types/metrics';

const styles: SxStyles = {
    formControl: {
        minWidth: '200px',
        maxWidth: '100%',
    },
    select: (theme: Theme) => ({
        backgroundColor: 'white',
        borderRadius: theme.spacing(1),
        height: '32px',
        '& .MuiOutlinedInput-notchedOutline': {
            border: 0,
        },
        '& .MuiSelect-select .MuiTypography-root': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
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
    createsNewMap?: boolean;
    initialSelection?: MetricType | '';
    onLayerChange: (metric: MetricType) => void;
    placeholder?: MessageDescriptor;
};

export const LayerSelect: FC<Props> = ({
    createsNewMap = false,
    initialSelection = '',
    onLayerChange,
    placeholder = MESSAGES.addMap,
}) => {
    const { formatMessage } = useSafeIntl();

    // TODO: Ideally we handle the isLoading here as well (but not urgent, we know the
    // entire component is not loaded until the categories are loaded.)
    const { data: metricCategories } = useGetMetricCategories();

    const [selectedMetricType, setSelectedMetricType] = useState<
        MetricType | ''
    >(initialSelection);

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
