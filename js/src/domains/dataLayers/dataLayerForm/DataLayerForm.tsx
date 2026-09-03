import React, { FC, useCallback, useEffect, useMemo } from 'react';
import { Alert, Box, Grid, Typography } from '@mui/material';
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
import { useGetOpenHexaDataLayers } from '../hooks/useGetOpenHexaDataLayers';
import { MESSAGES } from '../messages';
import { MetricTypeFormModel, OpenHexaDataLayer } from '../types/metrics';
import { LAYER_TYPES, LayerTypeSelect } from './LayerTypeSelect';
import { LegendConfigForm } from './LegendConfigForm';
import { openHexaLayerToFormPatch } from './openHexaAutofill';

type MetricTypeFormProps = {
    metricType?: MetricTypeFormModel;
    categoryOptions: { label: string; value: string }[];
    showCompositeLayers?: boolean;
    showOpenHexaLayers?: boolean;
    /** Codes of the account's existing metric types - an OpenHexa layer whose code is
     *  already taken can't be imported again (code is unique per account). */
    existingCodes?: Set<string>;
};

const LAYER_TYPE_INFO: Record<string, typeof MESSAGES.layerTypeDataInfo> = {
    [LAYER_TYPES.COMPOSITE]: MESSAGES.layerTypeCompositeInfo,
    [LAYER_TYPES.OPENHEXA]: MESSAGES.layerTypeOpenHexaInfo,
    [LAYER_TYPES.DATA]: MESSAGES.layerTypeDataInfo,
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
    readOnlyHint: {
        ml: 1,
        textTransform: 'none',
        fontWeight: 'normal',
    },
    unimportableAlert: {
        mt: 1,
        '& ul': { m: 0, pl: 2.5 },
    },
} satisfies SxStyles;

const NO_CODES: Set<string> = new Set();

export const MetricTypeForm: FC<MetricTypeFormProps> = ({
    metricType = undefined,
    categoryOptions,
    showCompositeLayers = false,
    showOpenHexaLayers = false,
    existingCodes = NO_CODES,
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
    // OpenHexa layers own their metadata + scale: everything but the legend colors is read-only.
    const isOpenHexa = values.origin === 'openhexa';
    const canPickOpenHexaLayer = isOpenHexa && !isEditing;

    const layerKind =
        (isComposite && LAYER_TYPES.COMPOSITE) ||
        (isOpenHexa && LAYER_TYPES.OPENHEXA) ||
        LAYER_TYPES.DATA;

    const compositeLegendOptions = useMemo(
        () => getCompositeLegendOptions(formatMessage),
        [formatMessage],
    );

    // Fetched as soon as the dialog opens (not only once the type is picked) so the
    // picker is populated instantly; the result is cached for the whole session.
    const {
        data: openHexaDataLayers,
        isFetching: isLoadingOpenHexaDataLayers,
        isError: openHexaDataLayersError,
    } = useGetOpenHexaDataLayers(showOpenHexaLayers && !isEditing);

    // Split the OpenHexa layers: importable ones feed the picker; the rest are listed so the
    // user knows why they're missing - already created (code is unique per account), or a
    // scale that doesn't fit its legend type.
    const [importableLayers, unimportableLayers, alreadyImportedLayers] =
        useMemo(() => {
            const importable: OpenHexaDataLayer[] = [];
            const unimportable: OpenHexaDataLayer[] = [];
            const alreadyImported: OpenHexaDataLayer[] = [];
            (openHexaDataLayers ?? []).forEach(layer => {
                if (existingCodes.has(layer.code)) alreadyImported.push(layer);
                else if (layer.error) unimportable.push(layer);
                else importable.push(layer);
            });
            return [importable, unimportable, alreadyImported];
        }, [openHexaDataLayers, existingCodes]);

    const openHexaLayerOptions = useMemo(
        () =>
            importableLayers.map(layer => ({
                label: layer.name,
                value: layer.code,
            })),
        [importableLayers],
    );

    const applyOpenHexaLayer = useCallback(
        (layer?: OpenHexaDataLayer) => {
            if (!layer) return;
            Object.entries(openHexaLayerToFormPatch(layer)).forEach(
                ([field, value]) => setFieldValueAndState(field, value),
            );
        },
        [setFieldValueAndState],
    );

    const onSelectOpenHexaLayer = useCallback(
        (_keyValue: string, code: string) => {
            applyOpenHexaLayer(
                importableLayers.find(layer => layer.code === code),
            );
        },
        [importableLayers, applyOpenHexaLayer],
    );

    // Default to the first importable layer so the form is never left in an invalid
    // "nothing selected" state; a manual pick sets `code` and stops this from re-firing.
    useEffect(() => {
        if (
            canPickOpenHexaLayer &&
            !values.code &&
            importableLayers.length > 0
        ) {
            applyOpenHexaLayer(importableLayers[0]);
        }
    }, [
        canPickOpenHexaLayer,
        values.code,
        importableLayers,
        applyOpenHexaLayer,
    ]);

    // Switching type keeps the dependent fields coherent: composites default the legend to "auto"
    // and pre-fill the category, regular layers reset to a concrete legend type, OpenHexa layers
    // clear the read-only metadata so a data layer must actually be picked.
    const onChangeLayerType = useCallback(
        (value: string) => {
            const composite = value === LAYER_TYPES.COMPOSITE;
            const openhexa = value === LAYER_TYPES.OPENHEXA;
            const wasOpenHexa = values.origin === 'openhexa';
            setFieldValueAndState('is_composite', composite);
            setFieldValueAndState('origin', openhexa ? 'openhexa' : 'custom');
            setFieldValueAndState(
                'legend_type',
                composite ? LegendTypes.AUTO : LegendTypes.THRESHOLD,
            );
            // Crossing the OpenHexa boundary wipes the autofilled/read-only metadata: entering,
            // so the picker (not stale hand-typed values) drives the layer; leaving, so the now
            // editable fields start blank.
            if (openhexa !== wasOpenHexa) {
                (
                    [
                        'code',
                        'name',
                        'description',
                        'source',
                        'units',
                        'unit_symbol',
                        'category',
                    ] as const
                ).forEach(field => setFieldValueAndState(field, ''));
                setFieldValueAndState('is_population', false);
                setFieldValueAndState('legend_range_tail', []);
            }
            if (composite && !values.category) {
                setFieldValueAndState('category', 'Composite');
            }
        },
        [setFieldValueAndState, values.category, values.origin],
    );

    const showScaleConfig = isConcreteLegend(values.legend_type);

    return (
        <Box>
            <Box sx={styles.layerTypeRow}>
                <Box sx={styles.layerTypeSelect}>
                    <LayerTypeSelect
                        value={layerKind}
                        onChange={onChangeLayerType}
                        // A composite owns a graph, so an existing layer can never switch variant.
                        showComposite={
                            showCompositeLayers && (isComposite || !isEditing)
                        }
                        showOpenHexa={
                            showOpenHexaLayers && (isOpenHexa || !isEditing)
                        }
                        disabled={isEditing && (isComposite || isOpenHexa)}
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
                        disabled={isOpenHexa}
                    />
                </Box>
            </Box>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={styles.layerTypeInfo}
            >
                {formatMessage(LAYER_TYPE_INFO[layerKind])}
            </Typography>

            {canPickOpenHexaLayer && (
                <>
                    <InputComponent
                        type="select"
                        keyValue="openHexaDataLayer"
                        clearable={false}
                        options={openHexaLayerOptions}
                        value={values.code || null}
                        onChange={onSelectOpenHexaLayer}
                        label={MESSAGES.openHexaDataLayer}
                        required
                        loading={isLoadingOpenHexaDataLayers}
                        errors={
                            openHexaDataLayersError
                                ? [
                                      formatMessage(
                                          MESSAGES.openHexaDataLayersError,
                                      ),
                                  ]
                                : []
                        }
                    />
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={styles.layerTypeInfo}
                    >
                        {formatMessage(MESSAGES.openHexaDataLayerHelp)}
                    </Typography>
                    {alreadyImportedLayers.length > 0 && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={styles.layerTypeInfo}
                        >
                            {formatMessage(
                                MESSAGES.openHexaLayersAlreadyImported,
                                {
                                    layers: alreadyImportedLayers
                                        .map(layer => layer.name)
                                        .join(', '),
                                },
                            )}
                        </Typography>
                    )}
                    {unimportableLayers.length > 0 && (
                        <Alert severity="warning" sx={styles.unimportableAlert}>
                            {formatMessage(MESSAGES.openHexaLayersUnimportable)}
                            <ul>
                                {React.Children.toArray(
                                    unimportableLayers.map(layer => (
                                        <li>
                                            <strong>{layer.name}</strong>:{' '}
                                            {layer.error}
                                        </li>
                                    )),
                                )}
                            </ul>
                        </Alert>
                    )}
                </>
            )}

            <Typography variant="subtitle1" sx={styles.firstSectionTitle}>
                {formatMessage(MESSAGES.generalSectionTitle)}
                {isOpenHexa && (
                    <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={styles.readOnlyHint}
                    >
                        {formatMessage(MESSAGES.openHexaFieldsReadOnly)}
                    </Typography>
                )}
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
                    disabled={isEditing || isOpenHexa}
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
                disabled={isOpenHexa}
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
                disabled={isOpenHexa}
            />
            <InputComponent
                keyValue="description"
                onChange={setFieldValueAndState}
                value={values.description}
                type="textarea"
                label={MESSAGES.description}
                errors={getErrors('description')}
                disabled={isOpenHexa}
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
                        disabled={isOpenHexa}
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
                        disabled={isOpenHexa}
                    />
                </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={styles.sectionTitle}>
                {formatMessage(MESSAGES.legendSectionTitle)}
                {isOpenHexa && (
                    <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={styles.readOnlyHint}
                    >
                        {formatMessage(MESSAGES.openHexaColorsEditable)}
                    </Typography>
                )}
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
                disabled={isOpenHexa}
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
                    disableValues={isOpenHexa}
                />
            )}
        </Box>
    );
};
