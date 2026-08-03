import React, { FC, useMemo } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';

import { SxStyles } from 'Iaso/types/general';
import {
    isConcreteLegend,
    LEGEND_TYPE_MAX_ITEMS,
    LEGEND_TYPE_MIN_ITEMS,
    LegendTypes,
} from '../../../constants/legend';
import { useGetExtendedFormikContext } from '../../../hooks/useGetExtendedFormikContext';
import { getCompositeLegendOptions } from '../../compositeLayerEditor/utils/legendOptions';
import { useGetLegendTypes } from '../../planning/hooks/useGetLegendTypes';
import { MESSAGES } from '../messages';
import { MetricTypeFormModel } from '../types/metrics';
import { LAYER_TYPES, LayerTypeSelect } from './LayerTypeSelect';
import { LegendConfigForm } from './LegendConfigForm';

type MetricTypeFormProps = {
    metricType?: MetricTypeFormModel;
    isRestricted?: boolean;
    categoryOptions: { label: string; value: string }[];
    showCompositeLayers?: boolean;
};

const styles = {
    layerTypeRow: {
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        mt: 2,
    },
    layerTypeSelect: {
        flexGrow: 1,
    },
    populationCheckbox: {
        flexShrink: 0,
        whiteSpace: 'nowrap',
    },
    layerTypeInfo: {
        display: 'block',
        mt: 0.5,
    },
    sectionTitle: {
        mt: 3,
        mb: 1,
    },
    firstSectionTitle: {
        mt: 2,
        mb: 0,
    },
} satisfies SxStyles;

export const MetricTypeForm: FC<MetricTypeFormProps> = ({
    metricType = undefined,
    isRestricted = false,
    categoryOptions,
    showCompositeLayers = false,
}) => {
    const { formatMessage } = useSafeIntl();
    const { data: legendTypeOptions, isLoading: loadingLegendTypeOptions } =
        useGetLegendTypes();

    const {
        values,
        setFieldValueAndState,
        setChildFieldValueAndState,
        errors,
        touched,
        addChildValue,
        removeChildValue,
    } = useGetExtendedFormikContext<MetricTypeFormModel>();

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    const isEditing = !!metricType?.id;
    const isComposite = !!values.is_composite;

    const compositeLegendOptions = useMemo(
        () => getCompositeLegendOptions(formatMessage),
        [formatMessage],
    );

    // Switching type keeps the dependent fields coherent: composites default the legend to "auto"
    // and pre-fill the category, regular layers reset to a concrete legend type.
    const onChangeLayerType = (value: string) => {
        const composite = value === LAYER_TYPES.COMPOSITE;
        setFieldValueAndState('is_composite', composite);
        setFieldValueAndState(
            'legend_type',
            composite ? LegendTypes.AUTO : LegendTypes.THRESHOLD,
        );
        if (composite && !values.category) {
            setFieldValueAndState('category', 'Composite');
        }
    };

    const layerTypeInfo = isComposite
        ? MESSAGES.layerTypeCompositeInfo
        : MESSAGES.layerTypeDataInfo;

    const showScaleConfig = isConcreteLegend(values.legend_type);

    return (
        <Box>
            <Box sx={styles.layerTypeRow}>
                <Box sx={styles.layerTypeSelect}>
                    <LayerTypeSelect
                        value={
                            isComposite
                                ? LAYER_TYPES.COMPOSITE
                                : LAYER_TYPES.DATA
                        }
                        onChange={onChangeLayerType}
                        // A composite owns a graph, so an existing layer can never switch variant.
                        showComposite={
                            showCompositeLayers && (isComposite || !isEditing)
                        }
                        disabled={isRestricted || (isEditing && isComposite)}
                    />
                </Box>
                <Box sx={styles.populationCheckbox}>
                    <InputComponent
                        keyValue="is_population"
                        onChange={setFieldValueAndState}
                        value={values.is_population}
                        type="checkbox"
                        label={MESSAGES.is_population}
                        errors={getErrors('is_population')}
                        withMarginTop={false}
                    />
                </Box>
            </Box>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={styles.layerTypeInfo}
            >
                {formatMessage(layerTypeInfo)}
            </Typography>

            <Typography variant="subtitle1" sx={styles.firstSectionTitle}>
                {formatMessage(MESSAGES.generalSectionTitle)}
            </Typography>
            {/* Composites get an auto-generated data key. */}
            {!isComposite && (
                <InputComponent
                    keyValue="code"
                    onChange={setFieldValueAndState}
                    value={values.code}
                    type="text"
                    label={MESSAGES.variable}
                    required
                    errors={getErrors('code')}
                    disabled={isEditing || isRestricted}
                />
            )}
            <InputComponent
                keyValue="name"
                onChange={setFieldValueAndState}
                value={values.name}
                type="text"
                label={MESSAGES.label}
                required
                errors={getErrors('name')}
            />
            <InputComponent
                keyValue="category"
                onChange={setFieldValueAndState}
                value={values.category}
                type="select"
                options={categoryOptions}
                freeSolo
                clearable={false}
                label={MESSAGES.category}
                required
                errors={getErrors('category')}
            />
            <InputComponent
                keyValue="description"
                onChange={setFieldValueAndState}
                value={values.description}
                type="textarea"
                label={MESSAGES.description}
                errors={getErrors('description')}
            />
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <InputComponent
                        keyValue="units"
                        onChange={setFieldValueAndState}
                        value={values.units}
                        type="text"
                        label={MESSAGES.units}
                        errors={getErrors('units')}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <InputComponent
                        keyValue="unit_symbol"
                        onChange={setFieldValueAndState}
                        value={values.unit_symbol}
                        type="text"
                        label={MESSAGES.unitSymbol}
                        errors={getErrors('unit_symbol')}
                    />
                </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={styles.sectionTitle}>
                {formatMessage(MESSAGES.legendSectionTitle)}
            </Typography>
            <InputComponent
                type="select"
                keyValue="legend_type"
                multi={false}
                clearable={false}
                options={
                    isComposite
                        ? compositeLegendOptions
                        : legendTypeOptions || []
                }
                value={values.legend_type}
                onChange={setFieldValueAndState}
                label={MESSAGES.legendType}
                errors={getErrors('legend_type')}
                loading={!isComposite && loadingLegendTypeOptions}
                disabled={isRestricted}
            />
            {showScaleConfig && (
                <LegendConfigForm
                    legendType={values.legend_type}
                    legendConfig={values.legend_config || []}
                    onAdd={addChildValue}
                    onRemove={removeChildValue}
                    touched={touched?.legend_config}
                    errors={errors?.legend_config}
                    onUpdateField={setChildFieldValueAndState}
                    minItems={LEGEND_TYPE_MIN_ITEMS[values.legend_type]}
                    maxItems={LEGEND_TYPE_MAX_ITEMS[values.legend_type]}
                />
            )}
        </Box>
    );
};
