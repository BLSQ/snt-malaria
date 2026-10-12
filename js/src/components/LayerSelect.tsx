import React, { FC, MouseEvent, useCallback } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CloseIcon from '@mui/icons-material/Close';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import {
    FormControl,
    IconButton,
    InputAdornment,
    ListSubheader,
    MenuItem,
    Select,
    SelectChangeEvent,
    SelectProps,
    Theme,
    Tooltip,
    Typography,
} from '@mui/material';

import { IntlMessage, useSafeIntl } from 'bluesquare-components';

import { SxStyles } from 'Iaso/types/general';
import { flattenMetricTypes } from '../domains/dataLayers/hooks/useGetMetrics';
import { MetricType } from '../domains/dataLayers/types/metrics';
import { MetricTypeCategory } from '../domains/dataLayers/types/metrics';
import { optionMenuStyles } from './optionMenuStyles';

const NoDropDownIcon = () => null;

const mapMenuProps: SelectProps['MenuProps'] = {
    anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
    transformOrigin: { vertical: 'top', horizontal: 'left' },
    slotProps: { paper: { sx: optionMenuStyles.paper } },
    MenuListProps: { sx: optionMenuStyles.list },
};

/** `sx` is the OutlinedInput root. `map` matches the [MapLegend] chip; `form` is a plain field. */
const styles: SxStyles = {
    formControl: {
        minWidth: '200px',
        maxWidth: '100%',
        width: '100%',
    },
    mapFormControl: {
        maxWidth: 360,
    },
    selectMap: (theme: Theme) => ({
        // TODO Should use a theme color; hex matches MapLegend chip for now (#1F2B3DBF).
        backgroundColor: '#1F2B3DBF',
        color: 'white',
        borderRadius: '8px',
        height: 36,
        pl: '10px',
        pr: 1,
        '& fieldset, & .MuiOutlinedInput-notchedOutline': {
            border: 'none',
            borderWidth: 0,
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '0 !important',
            borderColor: 'transparent !important',
        },
        '& .MuiSelect-select.MuiSelect-select': {
            py: 0,
            pl: 0,
            fontSize: theme.typography.body2.fontSize,
            fontFamily: theme.typography.fontFamily,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        },
        '&:has(.MuiInputAdornment-positionEnd) .MuiSelect-select.MuiSelect-select':
            {
                pr: 0.5,
            },
        '& svg': {
            fill: 'white',
        },
    }),
    layerIcon: {
        m: 0,
        mr: 1,
        fontSize: 18,
    },
    clearAdornment: {
        m: 0,
    },
    clearButton: {
        p: '2px',
        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.16)' },
    },
    clearIcon: {
        fontSize: 18,
    },
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
    /** Shows a button resetting the map variant to no layer while a layer is selected. */
    clearLabel?: IntlMessage;
    /** 'map' (default) is the dark pill used as a map overlay; 'form' is a plain outlined select for use inside forms. */
    variant?: 'map' | 'form';
};

export const LayerSelect: FC<Props> = ({
    selection,
    placeholder,
    metricCategories,
    onLayerChange,
    clearLabel,
    variant = 'map',
}) => {
    const { formatMessage } = useSafeIntl();
    const isMap = variant === 'map';
    const optionSx = isMap ? optionMenuStyles.option : styles.menuItem;
    const clearTitle =
        isMap && selection && clearLabel
            ? formatMessage(clearLabel)
            : undefined;

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

    const handleClear = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            onLayerChange(undefined);
        },
        [onLayerChange],
    );

    return (
        <FormControl sx={isMap ? styles.mapFormControl : styles.formControl}>
            <Select
                id="layer-select"
                value={selection?.id ?? ''}
                onChange={handleChange}
                variant="outlined"
                IconComponent={clearTitle ? NoDropDownIcon : ArrowDropDownIcon}
                sx={isMap ? styles.selectMap : styles.selectForm}
                startAdornment={
                    isMap && (
                        <InputAdornment position="start" sx={styles.layerIcon}>
                            <LayersOutlinedIcon fontSize="inherit" />
                        </InputAdornment>
                    )
                }
                endAdornment={
                    clearTitle && (
                        <InputAdornment
                            position="end"
                            sx={styles.clearAdornment}
                        >
                            <Tooltip title={clearTitle}>
                                <IconButton
                                    aria-label={clearTitle}
                                    onClick={handleClear}
                                    sx={styles.clearButton}
                                >
                                    <CloseIcon sx={styles.clearIcon} />
                                </IconButton>
                            </Tooltip>
                        </InputAdornment>
                    )
                }
                MenuProps={isMap ? mapMenuProps : undefined}
                displayEmpty
            >
                <MenuItem value="" sx={optionSx}>
                    {formatMessage(placeholder)}
                </MenuItem>
                {metricCategories?.map(category => [
                    isMap ? (
                        <ListSubheader
                            key={category.name}
                            sx={optionMenuStyles.groupLabel}
                        >
                            {category.name}
                        </ListSubheader>
                    ) : (
                        <ListSubheader key={category.name}>
                            <Typography variant="overline" sx={styles.category}>
                                {category.name}
                            </Typography>
                        </ListSubheader>
                    ),
                    ...category.items.map(metric => (
                        <MenuItem
                            key={metric.id}
                            sx={optionSx}
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
