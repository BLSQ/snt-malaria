import React, { FC, useMemo } from 'react';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LayersIcon from '@mui/icons-material/Layers';
import { Box, Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';

import {
    LEGEND_TYPE_MAX_ITEMS,
    LEGEND_TYPE_MIN_ITEMS,
    LegendTypes,
} from '../../../constants/legend';
import { useGetExtendedFormikContext } from '../../../hooks/useGetExtendedFormikContext';
import { MESSAGES as COMPOSITE_MESSAGES } from '../../compositeLayerEditor/messages';
import { useGetLegendTypes } from '../../planning/hooks/useGetLegendTypes';
import { MESSAGES } from '../messages';
import { MetricTypeFormModel } from '../types/metrics';
import { LayerTypeSelect } from './LayerTypeSelect';
import { LegendConfigForm } from './LegendConfigForm';

type MetricTypeFormProps = {
    metricType?: MetricTypeFormModel;
    isRestricted?: boolean;
    categoryOptions: { label: string; value: string }[];
    /** Whether composite layers are available (dev-features flag + settings-write permission). */
    showCompositeLayers?: boolean;
};

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

    // Composites mirror the output node's legend picker: "auto" (default) + "based on a data layer"
    // (reference) on top of the concrete types. The scale/buckets are computed server-side, so no
    // manual scale rows are shown for them.
    const compositeLegendOptions = useMemo(
        () => [
            {
                value: 'auto',
                label: formatMessage(COMPOSITE_MESSAGES.legendAuto),
            },
            {
                value: 'reference',
                label: formatMessage(COMPOSITE_MESSAGES.legendReference),
            },
            {
                value: 'linear',
                label: formatMessage(COMPOSITE_MESSAGES.legendLinear),
            },
            {
                value: 'threshold',
                label: formatMessage(COMPOSITE_MESSAGES.legendThreshold),
            },
            {
                value: 'ordinal',
                label: formatMessage(COMPOSITE_MESSAGES.legendOrdinal),
            },
        ],
        [formatMessage],
    );

    // Composite is offered only when available, and never as a conversion of an existing layer
    // (a composite owns a graph, so the variant is fixed at creation).
    const layerType = isComposite ? 'composite' : 'data';
    const layerTypeOptions = useMemo(() => {
        const options = [
            {
                value: 'data',
                label: formatMessage(MESSAGES.layerTypeData),
                icon: <LayersIcon fontSize="small" />,
            },
        ];
        if (showCompositeLayers && (isComposite || !isEditing)) {
            options.push({
                value: 'composite',
                label: formatMessage(MESSAGES.compositeLayer),
                icon: <AccountTreeIcon fontSize="small" />,
            });
        }
        return options;
    }, [formatMessage, showCompositeLayers, isComposite, isEditing]);

    // Switching type keeps the dependent fields coherent: composites default the legend to "auto"
    // and pre-fill the category, regular layers reset to a concrete legend type.
    const onChangeLayerType = (value: string) => {
        const composite = value === 'composite';
        setFieldValueAndState('is_composite', composite);
        setFieldValueAndState(
            'legend_type',
            composite ? 'auto' : LegendTypes.THRESHOLD,
        );
        if (composite && !values.category) {
            setFieldValueAndState('category', 'Composite');
        }
    };

    // Short explainer shown under the layer type selector.
    const layerTypeInfo = isComposite
        ? MESSAGES.layerTypeCompositeInfo
        : MESSAGES.layerTypeDataInfo;

    // The scale/bucket editor is shown for a concrete legend type (regular layers, and composites
    // set to linear/threshold/ordinal). "auto" and "from connected layer" compute it server-side.
    const showScaleConfig =
        values.legend_type !== 'auto' && values.legend_type !== 'reference';

    return (
        <Box>
            {/* Layer type + the independent population flag on one row: the selector grows, the
                checkbox takes only the space it needs. */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                    <LayerTypeSelect
                        label={formatMessage(MESSAGES.layerType)}
                        value={layerType}
                        options={layerTypeOptions}
                        onChange={onChangeLayerType}
                        disabled={isRestricted || (isEditing && isComposite)}
                    />
                </Box>
                <Box sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
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
                sx={{ display: 'block', mt: 0.5 }}
            >
                {formatMessage(layerTypeInfo)}
            </Typography>

            {/* General metadata section. */}
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 0 }}>
                {formatMessage(MESSAGES.generalSectionTitle)}
            </Typography>
            {/* Composites get an auto-generated data key, so the field is hidden for them. */}
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

            {/* Section 2 — data configuration, led by the legend selection. */}
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
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
